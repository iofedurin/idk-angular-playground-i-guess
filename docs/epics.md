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

## Epic 2: Dashboard ✅

**Цель**: Landing page `/app/:appId` со статистикой: кол-во пользователей, разбивка по ролям/отделам, последние пользователи.

### Архитектурное решение

Layout вынесен в отдельный `LayoutComponent` — route-level обёртка для `app/:appId`. Root `App` компонент минимальный: `<router-outlet />` + `loadApps()`.

### FSD-структура
```
app/
  layout.ts              — navbar (Dashboard/Users nav links, app switcher) + <router-outlet>
  layout.spec.ts

pages/dashboard/
  dashboard.ts           — загрузка данных, computed сигналы
  dashboard.html
  dashboard.spec.ts
  index.ts

widgets/stats-cards/
  ui/stats-cards.ts      — карточки статистики (DaisyUI stats)
  ui/stats-cards.spec.ts
  index.ts
```

### Фазы

- [x] **2.1 — Страница + роутинг**
  - `pages/dashboard/` с `DashboardPage`
  - Route: `/app/:appId` → DashboardPage (вместо redirect на users)
  - `LayoutComponent` — navbar вынесен из `app.ts`, используется как `component` на route `app/:appId`

- [x] **2.2 — Computed-статистика**
  - `totalUsers`, `activeUsers`, `byRole`, `byDepartment`, `recentUsers` — computed signals
  - Department breakdown таблица, recent users список с аватарами

- [x] **2.3 — Stats widget**
  - `widgets/stats-cards/` — DaisyUI stats, inputs: total, active, byRole
  - Показывает Total, Active (+ inactive desc), Admins, Editors, Viewers

- [x] **2.4 — Тесты**
  - `dashboard.spec.ts` — 6 тестов (loading, error, stats, departments, recent users, empty)
  - `stats-cards.spec.ts` — 3 теста (total, active/inactive, roles)
  - `layout.spec.ts` — 4 теста (navbar, nav links, switcher text, dropdown items)
  - `app.spec.ts` — упрощён до 2 тестов (creation, loadApps)

**Файлы**: `layout.ts`, `pages/dashboard/*`, `widgets/stats-cards/*`, `app.routes.ts`, `app.ts`

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

- [x] **3.1 — Миграция стора**
  - DepartmentStore: `withState` → `withEntities<Department>()`
  - DepartmentApi: добавить create(), update(), remove()
  - Обновить DepartmentSelectComponent (`.entities()` вместо `.departments()`)
  - Обновить `entities/department/index.ts`

- [x] **3.2 — Страница списка**
  - `pages/departments-list/` — таблица, аналогично users-list
  - Роут: `/app/:appId/departments`

- [x] **3.3 — Форма создания/редактирования**
  - `entities/department/lib/department-form-factory.ts` — createDepartmentForm()
  - `widgets/department-form/` — виджет формы (name + описание)
  - `pages/department-create/`, `pages/department-edit/`
  - Роуты: `/app/:appId/departments/new`, `/app/:appId/departments/:id/edit`

- [x] **3.4 — Удаление**
  - `features/department-delete/` — по паттерну user-delete

- [x] **3.5 — Навигация**
  - Добавить `layout.ts`: добавить ссылку Departments в navbar

### Тестирование

**Unit — Store** (`department.store.spec.ts`, переписать после миграции на `withEntities`):
- `loadAll()` загружает и устанавливает entities + loading/error
- `create()` POST + добавляет entity
- `update()` PUT + обновляет entity
- `remove()` DELETE + удаляет entity
- `reset()` очищает state
- Кэш: повторный `loadAll()` не делает HTTP если entities уже есть
- Паттерн: `await store.method()`, `httpMock.expectOne().flush()`

**Unit — DepartmentSelectComponent** (обновить существующий тест):
- Рендерит опции из `store.entities()` (вместо `store.departments()`)

**UI — Страницы** (по паттерну `users-list.spec.ts` / `user-create.spec.ts`):
- `departments-list.spec.ts`: loading spinner, таблица с данными, пустое состояние, ошибка, ссылки с appId
- `department-create.spec.ts`: рендер формы, POST на submit + навигация
- `department-edit.spec.ts`: загрузка данных в форму, PUT на submit + навигация, cleanup async-валидаторов в afterEach

**UI — Feature delete** (`department-delete-action.spec.ts`, по паттерну `user-delete`):
- Рендерит кнопку Delete
- DELETE запрос при подтверждении
- Обновляет стор после удаления

**UI — Widget form** (`department-form.spec.ts`):
- Рендерит все поля формы (name, description)
- Принимает inputs (departmentForm, title, submitLabel)

**Файлы**: `entities/department/*`, `features/department-delete/*`, `widgets/department-form/*`, `pages/departments-*/*`, `app.routes.ts`, `layout.ts`

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

- [x] **4.1 — Роутинг**
  - `/app/:appId/users/:id` → UserProfilePage (просмотр)
  - `/app/:appId/users/:id/edit` → UserEditPage (редактирование) — ПЕРЕНЕСТИ с `:id`
  - Обновить все ссылки (users-list → ведёт на профиль, кнопка "Edit" в профиле → /edit)

- [x] **4.2 — Страница профиля**
  - `pages/user-profile/` — загружает пользователя, показывает данные
  - Если user не найден — redirect на список
  - Кнопки: "Edit", "Back to list"

- [x] **4.3 — Виджет карточки**
  - `widgets/user-card/` — красивая карточка с аватаром (initials), badge роли, departments, bio
  - Принимает `[user]` input

- [ ] **4.4 — Resolver (опционально)**
  - `ResolveFn` для загрузки пользователя перед рендером страницы

### Тестирование

**UI — UserCardComponent** (`user-card.spec.ts`, presentational — без HTTP):
- Рендерит имя, username, email, роль (badge), department, bio
- Рендерит аватар с инициалами (`JD` для John Doe)
- Рендерит badge active/inactive
- Тестируется через TestHost с `[user]` input (как `stats-cards.spec.ts`)

**UI — UserProfilePage** (`user-profile.spec.ts`, интеграционный — реальный стор + мок HTTP):
- Loading spinner до загрузки данных
- Рендер `<app-user-card>` с данными пользователя
- Ссылка "Edit" содержит правильный `/app/:appId/users/:id/edit`
- Ссылка "Back to list" ведёт на `/app/:appId/users`
- Redirect на список если пользователь не найден (404 от API)

**UI — Роутинг** (обновить `users-list.spec.ts`):
- "Edit" ссылки в таблице теперь ведут на профиль (`/app/:appId/users/:id`), а не на edit

**Unit — Resolver** (если реализован, `user-profile.resolver.spec.ts`):
- Возвращает данные пользователя из стора/API
- Редиректит при ошибке

**Файлы**: `pages/user-profile/*`, `widgets/user-card/*`, `app.routes.ts`, `pages/users-list/` (обновить ссылки)

---

## Epic 5: Filtering & Search

**Цель**: Фильтрация в таблице пользователей по полям, использующим entity-сторы. Демонстрация переиспользования `CountryStore`, `DepartmentStore`, `JobTitleStore` — те же синглтон-сторы, что в форме, теперь используются и в фильтрах.

**Ключевая проблема**: Существующие select-компоненты (`CountrySelectComponent` и т.д.) привязаны к Signal Forms (`Field<string>` input, `[formField]` директива). Для фильтров нужны отдельные компоненты, которые инжектят **те же** сторы, но рендерят обычные `<select>` без формового контекста.

### Архитектурное решение

- Фильтры — in-memory signals (без URL query params sync)
- `applyFilters()` — чистая функция, тестируется юнит-тестами
- `features/user-filters/` — фича, потому что пересекает несколько entities (user + country + department + job-title)
- Фильтр-компонент инжектит `CountryStore`, `DepartmentStore`, `JobTitleStore` напрямую; `store.load()` отрабатывает из кэша если данные уже загружены формой

### FSD-структура
```
features/user-filters/
  ui/user-filters.ts          — панель фильтров (6 полей, инжектит entity-сторы)
  ui/user-filters.spec.ts
  lib/user-filters.model.ts   — UserFilters тип + applyFilters() pure function
  lib/user-filters.model.spec.ts
  index.ts
```

### Фазы

- [x] **5.1 — Модель фильтров + pure function**
  - `UserFilters`: `{ search, role, department, country, jobTitle, active }` — все 6 полей
  - `EMPTY_FILTERS` — дефолтное значение (все пустые строки = "All")
  - `applyFilters(users, filters)` — чистая функция, AND-логика:
    - `search` — case-insensitive по username, firstName, lastName, email
    - `role` — exact match (viewer/editor/admin)
    - `department`, `country`, `jobTitle` — exact match по ID/code
    - `active` — `'true'`/`'false'` → `user.active === true/false`
  - Юнит-тесты `user-filters.model.spec.ts`: пустые фильтры, каждое поле отдельно, комбинация

- [x] **5.2 — Компонент фильтров**
  - `features/user-filters/ui/user-filters.ts`
  - `filters = model.required<UserFilters>()` — two-way binding (`[(filters)]`)
  - Инжектит `CountryStore`, `DepartmentStore`, `JobTitleStore` — вызывает `load()` в конструкторе
  - Рендерит обычные `<select>` + `<input type="text">` (БЕЗ Signal Forms)
  - Role: статический список `['viewer', 'editor', 'admin']`
  - Active: "All" / "Active" / "Inactive"
  - Компонентные тесты: рендерит все поля, загружает данные из сторов, показывает опции

- [x] **5.3 — Интеграция в users-list**
  - `UsersListComponent`: добавить `filters = signal(EMPTY_FILTERS)`, `filteredUsers = computed(...)`
  - Шаблон: `<app-user-filters [(filters)]="filters" />` перед таблицей
  - `@for` итерирует по `filteredUsers()` вместо `store.entities()`
  - Расширить тесты: filter panel рендерится, фильтрация по role, текстовый поиск, empty state

- [x] **5.4 — Debounce для поиска**
  - Поле поиска: debounce 300ms
  - Фильтры role/department/country/jobTitle/active: мгновенно

- [x] **5.5 — Сортировка**
  - По имени, по роли, по отделу (asc/desc)
  - Кликабельные заголовки таблицы с ↑/↓ индикатором

### Тестирование

**Unit — `applyFilters()` pure function** (`user-filters.model.spec.ts`):
- Пустые фильтры → возвращает всех пользователей без изменений
- Каждое поле отдельно: search, role, department, country, jobTitle, active
- `search` — case-insensitive, ищет по username, firstName, lastName, email
- `active: 'true'` → только active, `'false'` → только inactive
- Комбинация нескольких фильтров → AND-логика (все условия должны совпасть)
- Пустая строка в любом поле → фильтр не применяется

**UI — UserFiltersComponent** (`user-filters.spec.ts`, с HttpTestingController):
- Рендерит все 6 полей (text input + 5 select)
- Инжектит и загружает данные из `CountryStore`, `DepartmentStore`, `JobTitleStore`
- Рендерит опции из сторов после загрузки (countries, departments, jobTitles)
- Рендерит статические опции: role (viewer/editor/admin), active (All/Active/Inactive)
- `afterEach`: flush запросы к `/api/countries`, `/api/departments`, `/api/job-titles`

**UI — Интеграция в UsersListComponent** (расширить `users-list.spec.ts`):
- Рендерит `<app-user-filters>` панель
- Таблица показывает `filteredUsers()` а не `store.entities()`
- Фильтрация по role: установить фильтр → таблица обновляется
- Текстовый поиск: ввод текста → таблица фильтруется
- Empty state: "No users found" когда фильтры не дают результатов
- `afterEach`: flush HTTP к справочным сторам (country, department, job-title)

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

- [x] **6.1 — Backend**
  - Добавить коллекцию `invitations` в db.json
  - InvitationApi: create(), getAll()

- [x] **6.2 — Entity + Store**
  - `entities/invitation/` — модель, API, стор

- [x] **6.3 — Фича invite**
  - `features/user-invite/` — компонент-диалог с простой формой (email + role select)
  - Signal Form: email + role, submit → invitationStore.create()

- [x] **6.4 — Интеграция**
  - Кнопка "Invite" на странице users-list
  - Открывает dialog/modal

### Тестирование

**Unit — InvitationStore** (`invitation.store.spec.ts`):
- `loadAll()` загружает invitations + loading/error
- `create()` POST + добавляет invitation в state
- `reset()` очищает state
- Паттерн: `await store.method()`, `httpMock.expectOne().flush()`

**UI — InviteDialogComponent** (`user-invite-dialog.spec.ts`):
- Рендерит Signal Form с полями: email (input) + role (select)
- Валидация email (required, format)
- Submit: POST запрос к `/api/invitations`
- Закрытие диалога после успешного создания
- `afterEach`: cleanup async-валидаторов если есть

**UI — Интеграция** (расширить `users-list.spec.ts`):
- Кнопка "Invite" рендерится на странице
- Клик открывает dialog/modal

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

- [x] **7.1 — Selection store**
  - `SelectionStore` — `selectedIds: Set<string>`, методы: toggle, selectAll, clearAll, isSelected
  - Не entity-стор — чисто feature-level state

- [x] **7.2 — UI чекбоксов**
  - Чекбокс в хедере таблицы (select all) + чекбокс в каждой строке
  - Тулбар с кнопками "Delete selected (N)", "Change role"
  - Тулбар появляется когда selectedIds.size > 0

- [x] **7.3 — Bulk delete**
  - Вызывает `usersStore.remove()` для каждого выбранного (или batch endpoint)
  - После завершения — clearAll()

- [x] **7.4 — Bulk role change**
  - Dropdown с ролью + "Apply"
  - Вызывает `usersStore.update(id, { role })` для каждого

### Тестирование

**Unit — SelectionStore** (`selection.store.spec.ts`, чистый unit без HTTP):
- `toggle(id)` — добавляет/удаляет id из selectedIds
- `selectAll(ids)` — устанавливает все переданные ids
- `clearAll()` — очищает selection
- `isSelected(id)` — возвращает boolean
- `selectedCount` — computed, количество выбранных
- `allSelected(totalIds)` — computed, true когда все выбраны
- Нет HTTP → не нужен HttpTestingController, самый простой тест в проекте

**UI — BulkToolbarComponent** (`bulk-toolbar.spec.ts`, presentational):
- Не рендерится когда selection пуст
- Показывает "Delete selected (N)" с правильным count
- Показывает dropdown выбора роли
- Эмитит events: `deleteSelected`, `changeRole`

**UI — Интеграция в UsersListComponent** (расширить `users-list.spec.ts`):
- Чекбокс в header таблицы: клик → selectAll
- Чекбокс в строке: клик → toggle
- Тулбар появляется при selection > 0
- Bulk delete: DELETE запросы для каждого выбранного, clearAll после завершения
- Bulk role change: PUT запросы для каждого выбранного
- `afterEach`: verify httpMock

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

- [x] **8.1 — Backend**
  - Добавить коллекцию `audit-log` в db.json с ~30 записей
  - json-server поддерживает `_page` и `_per_page` для пагинации

- [x] **8.2 — Entity**
  - `entities/audit-entry/` — модель, API с пагинацией, стор (append-mode: новая страница добавляется к массиву)

- [x] **8.3 — Infinite scroll**
  - `shared/lib/infinite-scroll.directive.ts` — директива с IntersectionObserver
  - При появлении sentinel-элемента → подгрузить следующую страницу

- [x] **8.4 — Страница + виджет**
  - `pages/audit-log/` — рендерит виджет
  - `widgets/audit-feed/` — timeline-компонент
  - Роут: `/app/:appId/audit`

### Тестирование

**Unit — AuditEntryStore** (`audit-entry.store.spec.ts`):
- `loadPage(1)` — первая страница, устанавливает entries + loading
- `loadPage(2)` — append-mode: новые записи добавляются к существующим, а не заменяют
- `hasMore` — computed, false когда сервер вернул меньше записей чем `_per_page`
- `reset()` — очищает entries и сбрасывает currentPage
- HTTP: `GET /api/audit-log?_page=1&_per_page=10&appId=...`

**Unit — InfiniteScrollDirective** (`infinite-scroll.directive.spec.ts`):
- Эмитит event когда sentinel-элемент входит в viewport
- Не эмитит когда элемент выходит из viewport
- Использует `IntersectionObserver` — в jsdom нужен мок:
  ```typescript
  // Mock IntersectionObserver в beforeEach
  let observerCallback: IntersectionObserverCallback;
  vi.stubGlobal('IntersectionObserver', class {
    constructor(cb: IntersectionObserverCallback) { observerCallback = cb; }
    observe() {}
    disconnect() {}
  });
  // Симулировать вход в viewport:
  observerCallback([{ isIntersecting: true }] as any, {} as any);
  ```

**UI — AuditFeedComponent** (`audit-feed.spec.ts`, presentational):
- Рендерит timeline с записями (action, entityType, userName, timestamp)
- Форматирует timestamp
- Пустое состояние когда entries = []

**UI — AuditLogPage** (`audit-log.spec.ts`, интеграционный):
- Loading spinner при первой загрузке
- Рендерит `<app-audit-feed>` с данными
- Infinite scroll: загружает следующую страницу при скролле
- Скрывает sentinel когда `hasMore = false`

**Файлы**: `entities/audit-entry/*`, `widgets/audit-feed/*`, `pages/audit-log/*`, `shared/lib/infinite-scroll.directive.ts`, `fake-backend/db.json`, `app.routes.ts`

---

## Epic 9: Server-side Filtering & Pagination

**Цель**: Перевести фильтрацию и сортировку с in-memory на серверную. Добавить пагинацию. Предпосылка: при сотнях записей нельзя грузить всё сразу — фильтрация/сортировка/пагинация должны происходить на бэкенде.

**Ключевая проблема**: Сейчас `UsersStore.loadAll()` грузит всех пользователей, `applyFilters()` и `sortUsers()` работают in-memory. При серверной фильтрации стор должен хранить текущую «страницу» + метаданные (total count, текущая страница).

### Возможности json-server v1

| Параметр | Назначение | Пример |
|---|---|---|
| `_page`, `_limit` | Пагинация | `?_page=2&_limit=10` |
| `?field=value` | Exact match фильтр | `?role=admin&department=engineering` |
| `?q=text` | Full-text search | `?q=john` (ищет по всем текстовым полям) |
| `_sort`, `_order` | Сортировка | `?_sort=firstName&_order=asc` |
| `X-Total-Count` | Заголовок ответа | Общее кол-во записей (до пагинации) |

### Архитектурное решение

- `UsersApi.getAll()` принимает `{ filters, sort, page, limit }` → формирует query string
- `UsersStore`: `withState({ page, limit, totalCount })` + `loadPage()` вместо `loadAll()`
- `applyFilters()` in-memory удаляется — фильтрация на сервере
- `sortUsers()` in-memory удаляется — сортировка на сервере
- UI: pagination controls (prev/next + page numbers) внизу таблицы
- Фильтры и сортировка триггерят `loadPage(1)` (сброс на первую страницу)

### FSD-структура
```
entities/user/
  user.api.ts          — расширить getAll() query params
  user.store.ts        — добавить pagination state + loadPage()

features/user-filters/
  lib/user-filters.model.ts  — убрать applyFilters(), оставить только UserFilters тип
  lib/user-sort.model.ts     — убрать sortUsers(), оставить только SortState тип

pages/users-list/
  users-list.ts        — заменить computed на store.loadPage() при смене фильтров/сорта
  users-list.html      — добавить pagination controls

shared/ui/
  pagination/          — переиспользуемый компонент пагинации (опционально)
```

### Фазы

- [ ] **9.1 — Seed data**
  - Расширить `db.json`: 50-100 пользователей для обоих app (acme, globex)
  - Разнообразить: разные роли, отделы, страны, active/inactive

- [ ] **9.2 — API + Store**
  - `UsersApi.getAll(params)` → формирует URL с query params (`_page`, `_limit`, фильтры, `_sort`, `_order`, `appId`)
  - `UsersStore`: `page`, `limit`, `totalCount` state. `loadPage(page, filters, sort)` — заменяет `loadAll()`
  - Парсить `X-Total-Count` из response headers (`observe: 'response'`)
  - `totalPages = computed(() => Math.ceil(totalCount / limit))`

- [ ] **9.3 — Миграция фильтров и сортировки**
  - Удалить `applyFilters()` и `sortUsers()` (чистые функции) — логика на сервере
  - `UserFiltersComponent`: при изменении фильтра → emit, страница вызывает `store.loadPage(1, newFilters, sort)`
  - Сортировка: клик по заголовку → `store.loadPage(1, filters, newSort)`
  - Маппинг: `search` → `q`, `role` → `role=`, `department` → группы или exact, `active` → `active=true/false`

- [ ] **9.4 — Pagination UI**
  - Pagination controls под таблицей: prev/next, номера страниц, "Page X of Y"
  - Показывать total count: "Showing 1-10 of 87 users"
  - Пагинация сбрасывается на страницу 1 при смене фильтров/сортировки

- [ ] **9.5 — Тесты**
  - Обновить `user.store.spec.ts`: `loadPage()`, pagination state, `X-Total-Count` parsing
  - Обновить `users-list.spec.ts`: pagination UI, фильтры триггерят серверный запрос
  - Удалить `user-filters.model.unit.spec.ts` и `user-sort.model.unit.spec.ts` (in-memory логика удалена)

### Тестирование

**Unit — UsersStore** (обновить `user.store.spec.ts`):
- `loadPage(1, filters, sort)` — формирует правильный URL с query params
- Парсит `X-Total-Count` из headers → `totalCount` signal
- `totalPages` computed корректен
- Смена фильтров → `page` сбрасывается на 1
- Loading/error state при пагинированных запросах

**UI — UsersListComponent** (обновить `users-list.spec.ts`):
- Pagination controls рендерятся после загрузки
- Клик "Next" → загружает следующую страницу
- Смена фильтра → новый HTTP-запрос с `_page=1`
- Сортировка → новый HTTP-запрос с `_sort` и `_order`
- "Showing X-Y of Z" отображается корректно

**Файлы**: `entities/user/*`, `features/user-filters/*`, `pages/users-list/*`, `fake-backend/db.json`, возможно `shared/ui/pagination/`

---

## Verification

После каждой фазы каждого эпика:
1. `bun run build` — ноль ошибок
2. `bun run test` — все тесты проходят (старые + новые)
3. `bun run lint:arch` — steiger No problems found
4. Ручная проверка: `bun run dev` → открыть приложение, протестировать

### Тестовая стратегия (ADR-003)

**Общие правила** (применяются ко всем эпикам):
- Zoneless: `async`/`await` вместо `fakeAsync`/`tick()` — нет zone.js
- Store-тесты: `await store.method()` — промисы через `lastValueFrom()`
- Component-тесты: `const flush = () => new Promise<void>(r => setTimeout(r))` после `httpMock.flush()`
- HTTP-мокинг: `provideHttpClientTesting()` + `HttpTestingController`
- Реальные сторы + мок HTTP: не мокаем сторы, тестируем реальное поведение
- `afterEach`: `httpMock.verify()` + cleanup async-валидаторов форм через `httpMock.match()`

**Типы тестов по слоям FSD**:

| Слой | Тип теста | Что тестировать | HTTP mock |
|------|-----------|-----------------|-----------|
| `entities/*/store` | Unit | CRUD-методы, кэш, loading/error, reset | Да |
| `entities/*/ui` | UI (presentational) | Рендер данных entity, загрузка из стора | Да (стор) |
| `features/*/lib` | Unit (pure) | Чистые функции (applyFilters, selection) | Нет |
| `features/*/ui` | UI (feature) | Рендер формы/панели, взаимодействие, эмиты | Да |
| `widgets/*/ui` | UI (presentational) | Рендер с inputs, через TestHost | Нет |
| `pages/*` | UI (integration) | Loading/error/success, навигация, store integration | Да |
| `shared/lib` | Unit | Interceptors, directives, утилиты | Зависит |
