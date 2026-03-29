# HR-Portal Epics — Implementation Plan

## Context

Проект — Angular 21+ playground с FSD-архитектурой. Сейчас есть только CRUD пользователей + справочники (страны, отделы, должности). Нужно добавить 8 эпиков, чтобы усложнить приложение и столкнуться с реальными архитектурными проблемами.

**Главная цель**: добавить multi-app (workspaces), чтобы обработать кейс перезагрузки данных при смене контекста. Остальные эпики добавляют страницы/фичи, которые создают полноценный HR-портал.

---

## Порядок эпиков

```
1. App Switching        ← фундамент, меняет роутинг и сторы
2. Dashboard            ← landing page после выбора аппа
3. Departments CRUD     ← расширяет entity, cross-entity зависимости
4. User Profile         ← view-only, route guards
5. Filtering & Search   ← linkedSignal, query params, debounce
6. Invite User          ← маленькая изолированная фича
7. Bulk Actions         ← feature-level state поверх entity
8. Audit Log            ← новая entity, infinite scroll
```

---

## Epic 1: App Switching (Workspaces)

**Цель**: Два workspace (Acme Corp, Globex Inc) с полностью раздельными данными. Переключение сбрасывает все кэши.

### Архитектурное решение

**Подход**: HTTP interceptor добавляет `appId` ко всем запросам. `AppStore` хранит текущий appId. Каждый entity-стор получает метод `reset()`. При смене аппа — `reset()` всех сторов.

**json-server**: данные хранятся плоско с полем `appId`. Фильтрация через query param (`/users?appId=acme`). Interceptor добавляет `appId` автоматически.

**URL**: `/app/:appId/users`, `/app/:appId/users/new`, `/app/:appId/users/:id/edit`.

### FSD-структура
```
entities/app/
  app.model.ts         — { id, name, logo? }
  app.store.ts         — currentApp signal, switchApp(), reset all stores
  index.ts

shared/lib/
  app-id.interceptor.ts — HttpInterceptorFn, добавляет ?appId=...
```

### Фазы

- [x] **1.1 — Backend multi-app**
  - Добавить `appId` ко всем записям в `db.json`
  - Добавить коллекцию `apps: [{ id: "acme", name: "Acme Corp" }, { id: "globex", name: "Globex Inc" }]`
  - Дублировать данные для двух аппов (разные users, те же справочники)

- [x] **1.2 — AppStore + interceptor**
  - Создать `entities/app/` — модель, стор с `currentAppId`, `apps` signal, `switchApp()`, `resetAll()`
  - HTTP interceptor: читает `AppStore.currentAppId()`, добавляет `?appId=...`
  - Зарегистрировать interceptor в `app.config.ts`

- [x] **1.3 — Роутинг**
  - Перестроить `app.routes.ts`: вложенные routes под `/app/:appId/`
  - Redirect: `/` → `/app/acme/users`
  - Добавить route guard: при входе в `/app/:appId/*` — `AppStore.switchApp(appId)`
  - Guard сбрасывает сторы если `appId` изменился

- [x] **1.4 — App Switcher UI**
  - Хедер с выпадающим списком аппов
  - При выборе — навигация к `/app/:newAppId/users`
  - Текущий апп отображается в хедере

- [x] **1.5 — Обновление существующих сторов**
  - Добавить `reset()` метод в UsersStore, CountryStore, DepartmentStore, JobTitleStore
  - Убрать `if (store.items().length) return` кэш в lookup-сторах (interceptor решает скоупинг)
  - Обновить все страницы: пути `/users/...` → используют appId из роута

**Файлы**: `app.routes.ts`, `app.config.ts`, `app.ts`/`app.html`, `fake-backend/db.json`, `entities/app/*`, `shared/lib/app-id.interceptor.ts`, все существующие сторы, все страницы (обновить RouterLink)

---

## Epic 2: Dashboard

**Цель**: Landing page `/app/:appId` со статистикой: кол-во пользователей, разбивка по ролям/отделам, последние пользователи.

### FSD-структура
```
pages/dashboard/
  dashboard.ts         — загрузка данных, computed сигналы
  dashboard.html
  index.ts

widgets/stats-cards/
  ui/stats-cards.ts    — карточки статистики
  index.ts
```

### Фазы

- [ ] **2.1 — Страница + роутинг**
  - Создать `pages/dashboard/`
  - Добавить route: `/app/:appId` → DashboardPage
  - DashboardPage вызывает `usersStore.loadAll()` в ngOnInit

- [ ] **2.2 — Computed-статистика**
  - В DashboardPage: `totalUsers = computed(() => store.entities().length)`
  - `byRole = computed(() => groupBy(store.entities(), 'role'))`
  - `byDepartment = computed(() => groupBy(store.entities(), 'department'))`
  - `recentUsers = computed(() => store.entities().slice(-5))`

- [ ] **2.3 — Stats widget**
  - `widgets/stats-cards/` — принимает данные через inputs, рендерит карточки
  - DaisyUI stats component

**Файлы**: `pages/dashboard/*`, `widgets/stats-cards/*`, `app.routes.ts`

---

## Epic 3: Departments CRUD

**Цель**: Полноценное управление отделами. Список, создание, редактирование, удаление.

### Архитектурное решение

DepartmentStore мигрирует с `withState({ departments: [] })` на `withEntities<Department>()` — тот же паттерн, что UsersStore. DepartmentApi расширяется CRUD-методами.

### FSD-структура
```
entities/department/
  department.model.ts  — расширить CreateDepartmentDto, UpdateDepartmentDto
  department-api.ts    — добавить create, update, remove
  department.store.ts  — миграция на withEntities
  ui/department-select/  — обновить (entities() вместо departments())
  index.ts

features/department-delete/
  ui/department-delete-action.ts
  index.ts

widgets/department-form/
  ui/department-form.ts + .html
  index.ts

pages/
  departments-list/
  department-create/
  department-edit/
```

### Фазы

- [ ] **3.1 — Миграция стора**
  - DepartmentStore: `withState` → `withEntities<Department>()`
  - DepartmentApi: добавить create(), update(), remove()
  - Обновить DepartmentSelectComponent (`.entities()` вместо `.departments()`)
  - Обновить `entities/department/index.ts`

- [ ] **3.2 — Страница списка**
  - `pages/departments-list/` — таблица, аналогично users-list
  - Роут: `/app/:appId/departments`

- [ ] **3.3 — Форма создания/редактирования**
  - `entities/department/lib/department-form-factory.ts` — createDepartmentForm()
  - `widgets/department-form/` — виджет формы (name + описание)
  - `pages/department-create/`, `pages/department-edit/`
  - Роуты: `/app/:appId/departments/new`, `/app/:appId/departments/:id/edit`

- [ ] **3.4 — Удаление**
  - `features/department-delete/` — по паттерну user-delete

- [ ] **3.5 — Навигация**
  - Добавить sidebar или табы: Users / Departments

**Файлы**: `entities/department/*`, `features/department-delete/*`, `widgets/department-form/*`, `pages/departments-*/*`, `app.routes.ts`

---

## Epic 4: User Profile (View-only)

**Цель**: `/app/:appId/users/:id` — красивая карточка пользователя. Отдельно от формы редактирования.

### FSD-структура
```
pages/user-profile/
  user-profile.ts
  user-profile.html
  index.ts

widgets/user-card/
  ui/user-card.ts + .html
  index.ts
```

### Фазы

- [ ] **4.1 — Роутинг**
  - `/app/:appId/users/:id` → UserProfilePage (просмотр)
  - `/app/:appId/users/:id/edit` → UserEditPage (редактирование) — ПЕРЕНЕСТИ с `:id`
  - Обновить все ссылки (users-list → ведёт на профиль, кнопка "Edit" в профиле → /edit)

- [ ] **4.2 — Страница профиля**
  - `pages/user-profile/` — загружает пользователя, показывает данные
  - Если user не найден — redirect на список
  - Кнопки: "Edit", "Back to list"

- [ ] **4.3 — Виджет карточки**
  - `widgets/user-card/` — красивая карточка с аватаром (initials), badge роли, departments, bio
  - Принимает `[user]` input

- [ ] **4.4 — Resolver (опционально)**
  - `ResolveFn` для загрузки пользователя перед рендером страницы

**Файлы**: `pages/user-profile/*`, `widgets/user-card/*`, `app.routes.ts`, `pages/users-list/` (обновить ссылки)

---

## Epic 5: Filtering & Search

**Цель**: Поиск и фильтрация в списке пользователей. Синхронизация с URL query params.

### FSD-структура
```
features/user-filters/
  ui/user-filters.ts + .html
  lib/user-filters.model.ts  — типы фильтров
  index.ts
```

### Фазы

- [ ] **5.1 — Модель фильтров**
  - `UserFilters`: `{ search: string, role: UserRole | '', department: string, sort: string }`
  - `features/user-filters/` — компонент с инпутами для фильтрации

- [ ] **5.2 — Фильтрация в странице**
  - `pages/users-list/` — читает query params, создаёт signal из них
  - `filteredUsers = computed(() => applyFilters(store.entities(), filters()))`
  - URL sync: при изменении фильтра → `router.navigate([], { queryParams })`

- [ ] **5.3 — Debounce для поиска**
  - Поле поиска: debounce 300ms перед обновлением query params
  - Фильтры role/department: мгновенно

- [ ] **5.4 — Сортировка**
  - По имени, по дате, по роли
  - Направление: asc/desc

**Файлы**: `features/user-filters/*`, `pages/users-list/*` (расширить)

---

## Epic 6: Invite User

**Цель**: Упрощённый flow: email + role. Отдельный эндпоинт, отдельная фича.

### FSD-структура
```
entities/invitation/
  invitation.model.ts   — { id, email, role, status, createdAt }
  invitation-api.ts
  invitation.store.ts
  index.ts

features/user-invite/
  ui/user-invite-dialog.ts
  index.ts

pages/invitations-list/   — (опционально) страница со списком приглашений
```

### Фазы

- [ ] **6.1 — Backend**
  - Добавить коллекцию `invitations` в db.json
  - InvitationApi: create(), getAll()

- [ ] **6.2 — Entity + Store**
  - `entities/invitation/` — модель, API, стор

- [ ] **6.3 — Фича invite**
  - `features/user-invite/` — компонент-диалог с простой формой (email + role select)
  - Signal Form: email + role, submit → invitationStore.create()

- [ ] **6.4 — Интеграция**
  - Кнопка "Invite" на странице users-list
  - Открывает dialog/modal

**Файлы**: `entities/invitation/*`, `features/user-invite/*`, `pages/users-list/*` (кнопка), `fake-backend/db.json`

---

## Epic 7: Bulk Actions

**Цель**: Чекбоксы в таблице, "Delete selected", "Change role".

### FSD-структура
```
features/user-bulk-actions/
  ui/bulk-toolbar.ts
  lib/selection.store.ts   — локальный стор выборки
  index.ts
```

### Фазы

- [ ] **7.1 — Selection store**
  - `SelectionStore` — `selectedIds: Set<string>`, методы: toggle, selectAll, clearAll, isSelected
  - Не entity-стор — чисто feature-level state

- [ ] **7.2 — UI чекбоксов**
  - Чекбокс в хедере таблицы (select all) + чекбокс в каждой строке
  - Тулбар с кнопками "Delete selected (N)", "Change role"
  - Тулбар появляется когда selectedIds.size > 0

- [ ] **7.3 — Bulk delete**
  - Вызывает `usersStore.remove()` для каждого выбранного (или batch endpoint)
  - После завершения — clearAll()

- [ ] **7.4 — Bulk role change**
  - Dropdown с ролью + "Apply"
  - Вызывает `usersStore.update(id, { role })` для каждого

**Файлы**: `features/user-bulk-actions/*`, `pages/users-list/*` (расширить таблицу)

---

## Epic 8: Audit Log

**Цель**: Лента событий. Infinite scroll.

### FSD-структура
```
entities/audit-entry/
  audit-entry.model.ts  — { id, appId, action, entityType, entityId, userName, timestamp, details }
  audit-entry-api.ts    — getAll(page, limit)
  audit-entry.store.ts  — append-only store (не entity, а массив с пагинацией)
  index.ts

widgets/audit-feed/
  ui/audit-feed.ts + .html
  index.ts

pages/audit-log/
  audit-log.ts
  index.ts
```

### Фазы

- [ ] **8.1 — Backend**
  - Добавить коллекцию `audit-log` в db.json с ~30 записей
  - json-server поддерживает `_page` и `_per_page` для пагинации

- [ ] **8.2 — Entity**
  - `entities/audit-entry/` — модель, API с пагинацией, стор (append-mode: новая страница добавляется к массиву)

- [ ] **8.3 — Infinite scroll**
  - `shared/lib/infinite-scroll.directive.ts` — директива с IntersectionObserver
  - При появлении sentinel-элемента → подгрузить следующую страницу

- [ ] **8.4 — Страница + виджет**
  - `pages/audit-log/` — рендерит виджет
  - `widgets/audit-feed/` — timeline-компонент
  - Роут: `/app/:appId/audit`

**Файлы**: `entities/audit-entry/*`, `widgets/audit-feed/*`, `pages/audit-log/*`, `shared/lib/infinite-scroll.directive.ts`, `fake-backend/db.json`, `app.routes.ts`

---

## Verification

После каждой фазы каждого эпика:
1. `ng build` — ноль ошибок, ноль варнингов
2. `bun run lint:arch` — steiger No problems found
3. Ручная проверка: `bun run dev` → открыть приложение, протестировать

После Epic 1 — обязательно проверить:
- Переключение аппов сбрасывает данные
- Данные загружаются для правильного аппа
- URL корректно обновляется
