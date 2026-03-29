# Test Plan

## Текущее состояние

- **Runner**: Vitest 4.0.8 + jsdom, `@angular/build:unit-test`
- **Покрытие**: 0% (только `app.spec.ts` — сломан после добавления навбара)
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
- [ ] `entities/user/user.store.spec.ts`
- [ ] `entities/country/country.store.spec.ts`
- [ ] `entities/department/department.store.spec.ts`
- [ ] `entities/job-title/job-title.store.spec.ts`
- [ ] `entities/app/app.store.spec.ts`

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

- [ ] `shared/lib/app-id.interceptor.spec.ts` — GET добавляет `?appId=`, POST добавляет в body, другие методы не трогает, не-users запросы пропускает
- [ ] `app.guard.spec.ts` — вызывает reset + switchApp при смене appId, пропускает при том же appId

### 3. Integration-тесты страниц

Тестируют компонент + стор + роутинг вместе. Используют `HttpClientTestingModule` для мока HTTP.

- [ ] `pages/users-list/users-list.spec.ts`
  - Рендерит таблицу после загрузки
  - Показывает спиннер во время loading
  - **Критический**: перезагружает данные при смене appId (баг, который ловим)
  - RouterLink ведут на правильные пути с appId
- [ ] `pages/user-create/user-create.spec.ts`
  - Рендерит форму
  - После submit — навигация с appId
- [ ] `pages/user-edit/user-edit.spec.ts`
  - Загружает данные пользователя
  - Патчит модель
  - После submit — навигация с appId

### 4. App-level тесты

- [ ] `app.spec.ts` (обновить)
  - Рендерит навбар с app switcher
  - Показывает имя текущего аппа

## Порядок имплементации

```
Фаза T1: Сторы (entities)         — 5 файлов
Фаза T2: Инфраструктура           — 2 файла (interceptor, guard)
Фаза T3: Страницы                  — 3 файла (users-list, user-create, user-edit)
Фаза T4: App-level                 — 1 файл (app.spec.ts)
```

**Итого**: ~11 spec-файлов

## Подход к мокам

- **HTTP**: `provideHttpClientTesting()` + `HttpTestingController`
- **Router**: `RouterTestingHarness` для integration тестов с навигацией
- **Stores в компонентах**: реальные сторы + мок HTTP (не мокаем стор, тестируем реальное взаимодействие)

## Принципы

1. Тесты рядом с кодом: `user.store.spec.ts` рядом с `user.store.ts`
2. Каждый тест автономен — не зависит от порядка выполнения
3. Тестируем поведение, не имплементацию
4. Для регрессий (как баг с app switch) — обязательный тест-кейс с комментарием
