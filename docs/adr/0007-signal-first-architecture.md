# ADR 0007 — Signal-first: lastValueFrom для HTTP CRUD, RxJS для continuous streams

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

Angular HttpClient возвращает `Observable`. NgRx Signal Store оперирует сигналами и `patchState`. Приложение работает в zoneless-режиме. Нужно было выбрать стратегию интеграции RxJS и Signals.

Варианты моста между Observable и Signal:
1. `toSignal()` — создаёт сигнал из Observable, управляет подпиской автоматически
2. `rxMethod` из `@ngrx/signals/rxjs-interop` — позволяет передать Observable или значение в метод стора
3. `lastValueFrom()` — конвертирует Observable в Promise, Observable завершается после первого ответа
4. `httpResource` — экспериментальный Angular API, оборачивает HTTP в resource-сигнал

## Решение

Два паттерна интеграции в зависимости от природы потока:

### HTTP CRUD — `lastValueFrom()` (Promise-мост)

Для одноразовых HTTP-операций (GET/POST/PATCH/DELETE) использовать `lastValueFrom()` как **единственный** способ вызова из сторов. Observable живёт ровно одну строку кода:

```ts
async loadAll(): Promise<void> {
  patchState(store, { loading: true, error: null });
  try {
    const users = await lastValueFrom(api.getAll());
    patchState(store, setAllEntities(users), { loading: false });
  } catch {
    patchState(store, { loading: false, error: 'Failed to load users' });
  }
}
```

### Continuous streams — `rxjs/webSocket` + `.subscribe()` (Observable-мост)

Для бесконечных потоков (WebSocket, SSE) используется RxJS напрямую. `lastValueFrom` не подходит — промис резолвится один раз, а поток доставляет события непрерывно.

```ts
// features/activity-feed/activity-feed.store.ts
withHooks({
  onInit(store) {
    inject(WebSocketService).onPrefix$<ActivityEvent>('')
      .pipe(takeUntilDestroyed())
      .subscribe(event => store.addEvent(event));
  },
}),
```

RxJS здесь — **event infrastructure**: transport (`rxjs/webSocket`), reconnect (`retry`), multicast (`share`), routing (`filter` + `map`). Signals остаются state layer для UI (`connected`, `events[]`, `unreadCount`). Граница: store подписывается на Observable, вызывает `patchState()` → Signal → шаблон.

Подробности — см. ADR 0006.

### Правило

В компонентах, фичах и виджетах **нет** RxJS:
- Нет `pipe()`, `map()`, `switchMap()`, `tap()`
- Нет `.subscribe()`
- Нет `async` pipe
- Нет `Subject`, `BehaviorSubject`

RxJS остаётся **только в сторах и инфраструктурных сервисах** (`*.store.ts`, `shared/lib/`):
- `lastValueFrom` — для HTTP CRUD
- `rxjs/webSocket` + operators — для continuous streams (инкапсулированы в `WebSocketService`)
- `.subscribe()` — только в `withHooks.onInit()` с `takeUntilDestroyed()`

Реактивность в компонентах строится на `signal()`, `computed()`, `effect()`.

## Причины

**1. Устранение целого класса багов**
Нет подписок в компонентах → нет утечек памяти на уровне UI. В zoneless-приложении zone.js не «спасёт» забытую подписку.

**2. Async/await читабельнее pipe-цепочек**
`await lastValueFrom(api.getAll())` — одна строка с понятной семантикой. Эквивалент на RxJS: `api.getAll().pipe(tap(...), catchError(...)).subscribe(...)` — три строки с неочевидным порядком выполнения.

**3. HttpClient для CRUD — always single-emission**
HTTP GET/POST/PATCH/DELETE возвращают один ответ и завершаются. `lastValueFrom` семантически точен: «дождись единственного значения». Нет риска потери данных из-за раннего unsubscribe.

**4. Continuous streams — Observable нативно представляет поток**
WebSocket доставляет события непрерывно. Promise не подходит — резолвится один раз. Observable + `subscribe()` + `addEvent()` — правильная семантика для push-based потока с аккумуляцией.

**5. Согласованность с testing-паттерном (ADR 0003)**
`const promise = store.loadAll(); httpMock.flush(data); await promise;` — тест читается как последовательность шагов. С Observable-подписками тест потребовал бы `done()` callback или `fakeAsync`.

**6. patchState — синхронный**
`patchState(store, { loading: true })` обновляет сигналы синхронно. Нет нужды в `tap()` для side-effects внутри pipe — `patchState` вызывается до и после `await`.

## Последствия

- Все CRUD store-методы — `async`, возвращают `Promise`
- WebSocket-подписки — в `withHooks.onInit()` с `takeUntilDestroyed()`, lifecycle управляется стором
- RxJS — dependency только потому, что его тянет Angular; не проникает в компоненты
- Нет retry-логики на уровне отдельных HTTP-запросов (если нужен retry — реализовать через цикл или wrapper)

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| `toSignal()` | Создаёт подписку, требует cleanup через `DestroyRef`. Добавляет lifecycle management, который мы устранили переходом на signals. Для аккумуляции (push events) не подходит — перезаписывает значение, а не аккумулирует |
| `rxMethod` из ngrx | Тянет `rxjs-interop`, добавляет слой абстракции. Оправдан для сложных реактивных цепочек (debounce + switchMap), но в CRUD-домене — overkill |
| `httpResource` | Экспериментальный API (ADR 0001). Не даёт контроля над `HttpContext`. Нарушает единообразие с `patchState` |
| RxJS pipe в сторах для CRUD | Добавляет операторы, подписки, cleanup. Компоненты всё равно читают сигналы — Observable-слой становится redundant |
| `lastValueFrom` для WebSocket | Промис резолвится один раз. Бесконечный поток требует `subscribe()` с callback |
