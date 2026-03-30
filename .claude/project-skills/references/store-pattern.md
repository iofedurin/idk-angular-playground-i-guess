# Store Patterns

NgRx Signal Store — единственный state management в проекте. Все store — `providedIn: 'root'` singletons.

---

## Core Rule: Signal-First

В компонентах, фичах и виджетах **нет** RxJS:
- Нет `pipe()`, `map()`, `switchMap()`, `tap()`
- Нет `.subscribe()`
- Нет `async` pipe
- Нет `Subject`, `BehaviorSubject`

RxJS остаётся **только** в store-методах и инфраструктурных сервисах (`shared/lib/`).

---

## Reads — `lastValueFrom` + try/catch

Все методы чтения — `async`, с `loading`/`error` state для UI:

```ts
async loadAll(): Promise<void> {
  patchState(store, { loading: true, error: null });
  try {
    const items = await lastValueFrom(api.getAll());
    patchState(store, setAllEntities(items), { loading: false });
  } catch {
    patchState(store, { loading: false, error: 'Failed to load entities' });
  }
}
```

Страница показывает `loading`/`error` через three-phase template.

---

## Mutations — `httpMutation`

Мутации (create, update, remove) используют `httpMutation()` вместо голого `lastValueFrom`.

### Почему не `lastValueFrom` напрямую

```ts
// ❌ Проблема: catch ловит всё — и HttpErrorResponse, и баги в patchState
async create(dto: CreateDto): Promise<Entity> {
  try {
    const entity = await lastValueFrom(api.create(dto));
    patchState(store, addEntity(entity));
    return entity;
  } catch (e) {
    // HttpErrorResponse? Баг в коде? Неизвестно.
  }
}
```

### `httpMutation` решает три задачи

1. **Единственное место `instanceof HttpErrorResponse`** — написано один раз
2. **Non-HTTP ошибки всплывают** — баги не проглатываются
3. **Дискриминированный результат** — `{ ok, data }` вместо `T | undefined`

### Паттерн для методов, возвращающих данные

```ts
async create(dto: CreateEntityDto): Promise<Entity | undefined> {
  const r = await httpMutation(api.create(dto));
  if (!r.ok) return;
  patchState(store, addEntity(r.data));
  return r.data;
}

async update(id: string, dto: UpdateEntityDto): Promise<Entity | undefined> {
  const r = await httpMutation(api.update(id, dto));
  if (!r.ok) return;
  patchState(store, updateEntity({ id, changes: r.data }));
  return r.data;
}
```

### Паттерн для void-методов

```ts
async remove(id: string): Promise<boolean> {
  const r = await httpMutation(api.remove(id));
  if (!r.ok) return false;
  patchState(store, removeEntity(id));
  return true;
}

async bulkRemove(ids: string[]): Promise<boolean> {
  const r = await httpMutation(api.bulkRemove(ids));
  if (!r.ok) return false;
  patchState(store, removeEntities(ids));
  return true;
}
```

### Вызов со страницы — ноль try/catch

Toast уже показан `errorInterceptor`'ом. Страница проверяет только результат:

```ts
const entity = await this.store.create(dto);
if (entity) await this.router.navigate(['/app', this.appId, 'entities']);

if (await this.store.remove(id)) {
  await this.router.navigate(['/app', this.appId, 'entities']);
}
```

---

## Caching

### Reference data (загружается один раз за жизнь приложения)

```ts
async load(): Promise<void> {
  if (store.entities().length) return;  // уже загружено
  const data = await lastValueFrom(api.getAll());
  patchState(store, setAllEntities(data));
}
```

Select-компонент вызывает `store.load()` в конструкторе — данные загружаются при первом рендере.

### CRUD entities (всегда свежие данные)

```ts
async loadAll(): Promise<void> {
  // no cache check — всегда запрашивает сервер
  patchState(store, { loading: true, error: null });
  // ...
}
```

---

## App-Scoped Stores

### `withAppScoped()` — обязателен для entity stores

Автоматически регистрирует store в `AppScopeRegistry`. При переключении workspace `appSwitchGuard` вызывает `reset()` на всех зарегистрированных stores.

```ts
export const EntityStore = signalStore(
  { providedIn: 'root' },
  withEntities<Entity>(),
  withState<EntityState>({ loading: false, error: null }),
  withMethods(/* ... */),
  withAppScoped(),  // последним — после withMethods
);
```

### `reset()` — обязателен

```ts
reset(): void {
  patchState(store, setAllEntities([] as Entity[]), {
    loading: false,
    error: null,
    // reset entity-specific state (page, totalCount, filters...)
  });
}
```

### Reference data — НЕ app-scoped

Справочные данные (страны, должности) глобальны, не привязаны к workspace. Они используют `GLOBAL_REQUEST` token для пропуска `appIdInterceptor`:

```ts
getAll() {
  return this.http.get<RefEntity[]>('/api/ref-entities', {
    context: new HttpContext().set(GLOBAL_REQUEST, true),
  });
}
```

---

## Cross-Store Dependencies

**Правило**: store НЕ инжектит другой store.

Единственное допустимое исключение — infrastructure state (например, `currentAppId` для scoping API-запросов). Если появляется второе исключение — пересмотреть архитектуру.

---

## Continuous Streams (WebSocket)

Для бесконечных потоков (WebSocket, SSE) — RxJS напрямую. `lastValueFrom` не подходит (промис резолвится один раз).

```ts
withHooks({
  onInit(store) {
    inject(WebSocketService).onPrefix$<Event>('')
      .pipe(takeUntilDestroyed())
      .subscribe(event => store.addEvent(event));
  },
}),
```

Подписка в `withHooks.onInit()` — store живёт всё время приложения, управляет своим lifecycle.

---

## Best Practices

- **Все методы — async**, возвращают `Promise`
- **Чтения**: `lastValueFrom` + try/catch + `loading`/`error` state
- **Мутации**: `httpMutation()` + `T | undefined` или `boolean` return
- **Нет RxJS в компонентах** — Observable → Promise → patchState
- **`patchState` — синхронный** — вызывается до и после `await`
- **Не мокать stores в тестах** — реальный store + мок HTTP
