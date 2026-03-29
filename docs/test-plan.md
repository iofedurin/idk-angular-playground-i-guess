# Test Plan

## Текущее состояние

- **Runner**: Vitest 4.0.8 + jsdom, `@angular/build:unit-test`
- **Покрытие**: T1–T4 реализованы (12 spec-файлов, 65 тестов)
- **Паттерн файлов**: `**/*.spec.ts`
- **Команда**: `bun run test`

## Стратегия

Три уровня тестов:

### 1. Unit-тесты stores (самый высокий приоритет)

Сторы — ядро приложения. Тестируем:
- Начальное состояние
- Загрузка данных (`loadAll` / `load`)
- Мутации (`create`, `update`, `remove`)
- `reset()` — сбрасывает всё состояние
- Ошибки (HTTP failure)

**Файлы:**
- [x] `entities/user/user.store.spec.ts`
- [x] `entities/country/country.store.spec.ts`
- [x] `entities/department/department.store.spec.ts`
- [x] `entities/job-title/job-title.store.spec.ts`
- [x] `entities/app/app.store.spec.ts`

**Паттерн:**
```typescript
describe('UsersStore', () => {
  let store: InstanceType<typeof UsersStore>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    store = TestBed.inject(UsersStore);
  });

  it('should start with empty state', () => {
    expect(store.entities()).toEqual([]);
    expect(store.loading()).toBe(false);
  });

  it('reset() clears all entities', async () => {
    // load some data, then reset
    store.reset();
    expect(store.entities()).toEqual([]);
  });
});
```

### 2. Unit-тесты инфраструктуры

- [x] `shared/lib/app-id.interceptor.spec.ts` — GET добавляет `?appId=`, POST добавляет в body, другие методы не трогает, не-users запросы пропускает
- [x] `app.guard.spec.ts` — вызывает reset + switchApp при смене appId, пропускает при том же appId
- [x] `app-route-reuse-strategy.spec.ts` — regression-тест: возвращает false при смене appId (принудительное пересоздание компонентов)

### 3. Integration-тесты страниц

Тестируют компонент + стор + роутинг вместе. Используют `HttpClientTestingModule` для мока HTTP.

- [x] `pages/users-list/users-list.spec.ts`
  - Рендерит таблицу после загрузки
  - Показывает спиннер во время loading
  - RouterLink ведут на правильные пути с appId
- [x] `pages/user-create/user-create.spec.ts`
  - Рендерит форму
  - После submit — навигация с appId
- [x] `pages/user-edit/user-edit.spec.ts`
  - Загружает данные пользователя
  - Патчит модель
  - После submit — навигация с appId

### 4. App-level тесты

- [x] `app.spec.ts` (обновлён)
  - Рендерит навбар с app switcher
  - Показывает имя текущего аппа

## Порядок имплементации

```
[x] Фаза T1: Сторы (entities)         — 5 файлов
[x] Фаза T2: Инфраструктура           — 3 файла (interceptor, guard, route-reuse-strategy)
[x] Фаза T3: Страницы                  — 3 файла (users-list, user-create, user-edit)
[x] Фаза T4: App-level                 — 1 файл (app.spec.ts)
```

**Итого**: 12 spec-файлов, 65 тестов

## Подход к мокам

- **HTTP**: `provideHttpClientTesting()` + `HttpTestingController`
- **Router**: `RouterTestingHarness` для integration тестов с навигацией
- **Stores в компонентах**: реальные сторы + мок HTTP (не мокаем стор, тестируем реальное взаимодействие)

## Zoneless-тестирование

Приложение использует zoneless Angular (без zone.js). Тесты работают без `fakeAsync`/`tick()`:
- **Store-тесты**: `await store.method()` — ждём Promise от `lastValueFrom()`
- **Component-тесты**: `await flush()` (setTimeout-based) — дренаж микротасков после `httpMock.flush()`
- Async-валидаторы форм (username/email uniqueness) — сбрасываются через `httpMock.match()` в `afterEach`

## Принципы

1. Тесты рядом с кодом: `user.store.spec.ts` рядом с `user.store.ts`
2. Каждый тест автономен — не зависит от порядка выполнения
3. Тестируем поведение, не имплементацию
4. Для регрессий (как баг с app switch) — обязательный тест-кейс с комментарием
