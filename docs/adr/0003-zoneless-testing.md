# ADR 0003 — Zoneless-тестирование: await вместо fakeAsync

**Статус:** Принято
**Дата:** 2026-03-29

---

## Контекст

Приложение работает в zoneless-режиме (Angular 21+, без `zone.js` в runtime). Нужно было выбрать стратегию тестирования, учитывая:

1. **Раннер**: Vitest 4.0.8 + jsdom (builder `@angular/build:unit-test`)
2. **Сторы**: NgRx Signal Store, все методы `async` (возвращают `Promise` через `lastValueFrom`)
3. **HTTP-мокинг**: `HttpTestingController` — `flush()` доставляет ответ синхронно
4. **Формы**: Signal Forms с `validateHttp` + `debounce()` — async-валидаторы делают HTTP-запросы

Стандартный подход Angular (`fakeAsync` + `tick()`) требует `zone.js/testing`. Установка `zone.js` только для тестов создаёт проблемы:
- `zone.js` должен загружаться ДО инициализации TestBed, а `setupFiles` в `@angular/build:unit-test` запускаются ПОСЛЕ
- Добавление zone.js ради тестов противоречит zoneless-архитектуре приложения

## Решение

Тестировать без `zone.js`, используя нативный `async`/`await`.

### Паттерн 1: Store-тесты — `await store.method()`

Все методы сторов возвращают `Promise` (внутри `lastValueFrom`). Достаточно дождаться промиса:

```ts
it('loadAll() populates entities', async () => {
  const promise = store.loadAll();
  expect(store.loading()).toBe(true); // синхронная проверка ДО flush

  httpMock.expectOne('/api/users').flush(mockUsers);
  await promise; // ждём завершения async-метода стора

  expect(store.loading()).toBe(false);
  expect(store.entities()).toEqual(mockUsers);
});
```

**Почему работает:** `httpMock.flush()` доставляет ответ синхронно → `lastValueFrom` резолвит промис → `await promise` ждёт завершения `patchState`.

### Паттерн 2: Component-тесты — setTimeout-flush

В компонентных тестах нет прямого доступа к промису стора (он вызывается из `ngOnInit`). Используем `setTimeout`-flush для дренажа **всех** микротасков:

```ts
const flush = () => new Promise<void>(r => setTimeout(r));

it('renders table after data loads', async () => {
  fixture.detectChanges(); // → ngOnInit → store.loadAll()
  httpMock.expectOne('/api/users').flush(mockUsers);
  await flush(); // дренаж ВСЕХ микротасков (включая chained .then)
  fixture.detectChanges();

  expect(el.querySelectorAll('tr')).toHaveLength(2);
});
```

**Почему `setTimeout`, а не `await Promise.resolve()`:**
`Promise.resolve()` дренирует только один уровень микротасков. Если стор имеет `await lastValueFrom()` → `return value` → `.then()` (цепочка), второй `.then()` ещё не выполнится. `setTimeout` ставит macrotask — JavaScript гарантирует полный дренаж микротасков перед следующим macrotask.

### Паттерн 3: Async-валидаторы форм — `httpMock.match()` в afterEach

Signal Forms `validateHttp` + `debounce()` запускает HTTP-запросы на проверку уникальности (username, email). Эти запросы бесконтрольно появляются после патча модели. Сбрасываем в `afterEach`:

```ts
afterEach(() => {
  // validateHttp вшивает query params в URL строку
  httpMock
    .match(r =>
      r.method === 'GET' &&
      r.url.startsWith('/api/users?') &&
      (r.url.includes('username=') || r.url.includes('email='))
    )
    .forEach(req => req.flush([]));
  httpMock.verify();
});
```

**Важный нюанс:** `validateHttp` формирует URL как строку `/api/users?username=jdoe` (query params в URL, а не в `HttpParams`). Поэтому `r.url` содержит параметры, а `r.params` — пуст.

## Причины

**1. Нет zone.js в проекте — не добавляем ради тестов**
Zone.js — 50KB+ полифил, который перехватывает все async-операции. Zoneless Angular специально от него ушёл. Добавлять его в тесты — двойной стандарт.

**2. `await` проще и читабельнее `fakeAsync`/`tick()`**
`fakeAsync` создаёт виртуальную зону, `tick()` неочевидно продвигает таймеры. `await store.loadAll()` — буквально ждёт завершения операции.

**3. `@angular/build:unit-test` не даёт загрузить zone.js вовремя**
`setupFiles` в этом билдере запускаются ПОСЛЕ инициализации TestBed. Zone.js должен быть загружен ДО. Это фундаментальная несовместимость.

**4. Реальные сторы + мок HTTP — не мокаем сторы**
Тестируем реальное поведение стора (кэш, patchState, error handling) с подменённым HTTP. Это ловит баги, которые mock-store пропустил бы.

## Последствия

- Все тесты — `async` функции
- Не использовать `fakeAsync`, `tick()`, `flush()` из `@angular/core/testing`
- Нельзя тестировать debounce-таймеры напрямую (используем `vi.useFakeTimers()` из Vitest если нужно)
- Async-валидаторы форм требуют cleanup в `afterEach`
- Компонентные тесты чуть многословнее (нужен `await flush()` + второй `detectChanges()`)

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| Установить `zone.js` как devDependency | `setupFiles` запускается после TestBed — zone.js/testing не успевает зарегистрироваться |
| `vi.useFakeTimers()` вместо `setTimeout`-flush | Решает другую задачу (контроль таймеров), не помогает с дренажом микротасков от `await lastValueFrom()` |
| Mock-сторы в компонентных тестах | Пропускает баги в реальном поведении стора (кэш, error state, reset) |
| `fixture.whenStable()` | В zoneless-режиме без `provideZonelessChangeDetection()` возвращает `Promise.resolve()` сразу — не ждёт async-операции стора |
