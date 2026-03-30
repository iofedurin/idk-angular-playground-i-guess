# PLAN — Bulk-операции на fake-backend

**Цель:** заменить поштучные `Promise.all(ids.map(...))` на настоящие bulk-эндпоинты в json-server и соответствующие методы на фронте.

---

## Текущее состояние

- `bulkDelete()` → `Promise.all(ids.map(id => store.remove(id)))` — N запросов `DELETE /api/users/:id`
- `bulkChangeRole()` → `Promise.all(ids.map(id => store.update(id, { role })))` — N запросов `PATCH /api/users/:id`

Проблема: неатомарно, N HTTP-запросов вместо одного, при ошибке на k-м запросе первые k-1 уже выполнены.

---

## Решение

json-server v1 beta CLI не поддерживает кастомные роуты, но позволяет использовать себя программно. Создаём `fake-backend/server.mjs` с Express middleware для bulk-операций поверх стандартного json-server router.

---

## Фаза 1 — fake-backend: кастомный сервер с bulk-эндпоинтами

### 1.1 Создать `fake-backend/server.mjs`

Программный запуск json-server с двумя кастомными роутами **до** стандартного router:

```
POST /api/users/bulk-delete    body: { ids: string[] }     → 204
PATCH /api/users/bulk-update   body: { ids: string[], changes: Partial<User> }  → 200 + updated users[]
```

Реализация:
- Импорт json-server программно
- `app.use(jsonServer.bodyParser)` для парсинга body
- Кастомные роуты читают/пишут через `router.db` (lowdb instance)
- Стандартный `jsonServer.router('fake-backend/db.json')` для всех остальных запросов

**Важно:** проверить API json-server@1.0.0-beta.15 — в v1 beta программный API мог измениться относительно v0.x. Если программный API отсутствует, альтернатива — отдельный express + lowdb сервер-обёртка.

### 1.2 Обновить `package.json`

```diff
- "backend": "json-server fake-backend/db.json --port 3000",
+ "backend": "node fake-backend/server.mjs",
```

### 1.3 Проверить вручную

```bash
# Bulk delete
curl -X POST http://localhost:3000/api/users/bulk-delete \
  -H "Content-Type: application/json" \
  -d '{"ids": ["1","2"]}'

# Bulk update
curl -X PATCH http://localhost:3000/api/users/bulk-update \
  -H "Content-Type: application/json" \
  -d '{"ids": ["3","4"], "changes": {"role": "admin"}}'
```

---

## Фаза 2 — фронтенд: API + Store

### 2.1 `UsersApi` — два новых метода

```ts
// entities/user/user.api.ts
bulkRemove(ids: string[]) {
  return this.http.post<void>(`${BASE}/bulk-delete`, { ids });
}

bulkUpdate(ids: string[], changes: UpdateUserDto) {
  return this.http.patch<User[]>(`${BASE}/bulk-update`, { ids, changes });
}
```

### 2.2 `UsersStore` — два новых метода

```ts
async bulkRemove(ids: string[]): Promise<void> {
  await lastValueFrom(api.bulkRemove(ids));
  patchState(store, removeEntities(ids));  // из @ngrx/signals/entities
}

async bulkUpdate(ids: string[], changes: UpdateUserDto): Promise<void> {
  const updated = await lastValueFrom(api.bulkUpdate(ids, changes));
  // updateEntities или setAllEntities — зависит от того, что вернёт backend
  updated.forEach(u => patchState(store, updateEntity({ id: u.id, changes: u })));
}
```

**Нюанс с `removeEntities`**: проверить, экспортирует ли `@ngrx/signals/entities` функцию `removeEntities` (множественное число). Если нет — использовать цикл `removeEntity` в пределах одного `patchState` или `setAllEntities` с фильтрацией.

### 2.3 `entities/user/index.ts` — ничего не экспортировать

`bulkRemove` и `bulkUpdate` — методы стора, а стор уже экспортирован. Новые DTO не нужны.

---

## Фаза 3 — страница users-list

### 3.1 Упростить `bulkDelete()` и `bulkChangeRole()`

```ts
// Было:
protected async bulkDelete(): Promise<void> {
  const ids = [...this.selectionStore.selectedIds()];
  await Promise.all(ids.map((id) => this.store.remove(id)));
  this.selectionStore.clearAll();
}

// Стало:
protected async bulkDelete(): Promise<void> {
  await this.store.bulkRemove([...this.selectionStore.selectedIds()]);
  this.selectionStore.clearAll();
}
```

Аналогично для `bulkChangeRole`.

---

## Фаза 4 — тесты

### 4.1 `user.store.spec.ts` — два новых теста

- `bulkRemove(ids)` — expect POST `/api/users/bulk-delete`, flush 204, проверить что entities удалены
- `bulkUpdate(ids, changes)` — expect PATCH `/api/users/bulk-update`, flush updated[], проверить entities

### 4.2 `users-list.spec.ts` — обновить существующие тесты

Bulk-тесты теперь ожидают один запрос вместо нескольких.

---

## Implementation order

- [ ] 1.1 Создать `fake-backend/server.mjs` с bulk-эндпоинтами
- [ ] 1.2 Обновить `backend` скрипт в `package.json`
- [ ] 1.3 Ручная проверка curl-ом
- [ ] 2.1 `UsersApi` — `bulkRemove`, `bulkUpdate`
- [ ] 2.2 `UsersStore` — `bulkRemove`, `bulkUpdate`
- [ ] 3.1 `UsersListComponent` — упростить bulk-методы
- [ ] 4.1 Store-тесты
- [ ] 4.2 Page-тесты
- [ ] Удалить этот план после завершения

---

## Риски

1. **json-server v1 beta программный API** — может отличаться от документации v0.x. Нужно проверить `node_modules/json-server/src` перед реализацией.
2. **`removeEntities` в ngrx/signals** — если нет plural-версии, придётся использовать обходной путь.
3. **`appIdInterceptor`** — сейчас добавляет `appId` к POST body. Bulk-delete тоже POST — interceptor может добавить `appId` в body. Нужно проверить, не сломает ли это кастомный роут.
