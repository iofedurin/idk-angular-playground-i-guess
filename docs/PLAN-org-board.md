# PLAN: Org Board — интерактивная доска организационной структуры

**Статус:** Draft
**Дата:** 2026-03-31

---

## Обзор

Визуальная канвас-доска, на которой HR конструирует организационную иерархию: перетаскивает сотрудников из списка на доску, двигает карточки, соединяет связями (manager → subordinate), просматривает детали по клику.

**Scope**: новая страница `/app/:appId/org-board`, расширение User entity (`managerId`), новая feature (`org-board`), 3 новых виджета, расширение Dashboard.

---

## Архитектурные решения

### 1. Выбор библиотеки: `@foblex/flow` v18+

**Решение:** Foblex Flow — Angular-native библиотека для интерактивных диаграмм.

**Почему Foblex, а не альтернативы:**

| Критерий | @foblex/flow | ngx-vflow | Angular CDK DnD | Нативный DnD API |
|---|---|---|---|---|
| Все 3 типа drag | Да (fExternalDraggable, fDragHandle, fNodeOutput/fNodeInput) | Да | Только 2 из 3 (нет connection creation) | Нет (нет free-form) |
| Angular-native | Да (directives на реальных DOM-элементах) | Да (component-based API) | Да | N/A |
| Zoneless | Явная поддержка в документации | Не документировано (сигналы внутри) | Да | Да |
| SVG-связи | Встроенные `<f-connection>` | Встроенные | Нет — писать руками | Нет |
| Pan / Zoom | Встроено в `<f-canvas>` | Встроено | Нет | Нет |
| Peer dependencies | 4 пакета `@foblex/*` (легковесные) | 3 пакета `d3-*` | @angular/cdk | Нет |
| Валидация связей | Декларативная: `fCanBeConnectedInputs` | Callback-based | N/A | N/A |
| Ноды = Angular-компоненты | Да (directive на div → полный DI, сигналы) | Да (template-based) | N/A | N/A |

**Ключевое преимущество**: directive-based подход. `fNode` — директива на обычном `<div>`, внутри которого живёт наш `UserBoardCard` со всеми инжектами, сигналами и Angular template syntax. Полная совместимость с FSD и существующими паттернами.

**Почему не ngx-vflow:** хороший альтернативный вариант, но тянет d3 как peer dependency (3 пакета) и не имеет явной документации по zoneless. Если в процессе реализации Foblex окажется неудобным — переключиться на ngx-vflow (API схожи).

### 2. FSD-размещение

```
entities/user/
  user.model.ts                       ← ИЗМЕНИТЬ: + managerId
  user.api.ts                         ← без изменений (существующий update() достаточен)
  user.store.ts                       ← ИЗМЕНИТЬ: + setManager(), + getDirectReports()
  index.ts                            ← ИЗМЕНИТЬ: + экспорт новых типов и функций
  lib/
    hierarchy.ts                      ← СОЗДАТЬ: pure functions для дерева
    hierarchy.unit.spec.ts            ← СОЗДАТЬ: unit-тесты

features/org-board/
  org-board.model.ts                  ← СОЗДАТЬ: BoardPosition, BoardNode, BoardEdge
  org-board.api.ts                    ← СОЗДАТЬ: HTTP для board-positions
  org-board.store.ts                  ← СОЗДАТЬ: позиции + board state
  org-board.store.spec.ts             ← СОЗДАТЬ: store-тесты
  index.ts                            ← СОЗДАТЬ: barrel

widgets/org-board-canvas/
  org-board-canvas.ts                 ← СОЗДАТЬ: Foblex canvas + nodes + edges
  org-board-canvas.html               ← СОЗДАТЬ: template
  org-board-canvas.spec.ts            ← СОЗДАТЬ: тесты
  index.ts                            ← СОЗДАТЬ: barrel

widgets/org-board-sidebar/
  org-board-sidebar.ts                ← СОЗДАТЬ: sidebar panel
  org-board-sidebar.html              ← СОЗДАТЬ: template
  org-board-sidebar.spec.ts           ← СОЗДАТЬ: тесты
  index.ts                            ← СОЗДАТЬ: barrel

widgets/user-board-card/
  user-board-card.ts                  ← СОЗДАТЬ: карточка сотрудника для доски
  user-board-card.spec.ts             ← СОЗДАТЬ: тесты
  index.ts                            ← СОЗДАТЬ: barrel

pages/org-board/
  org-board.ts                        ← СОЗДАТЬ: page component
  org-board.html                      ← СОЗДАТЬ: template
  org-board.spec.ts                   ← СОЗДАТЬ: тесты
  index.ts                            ← СОЗДАТЬ: barrel

shared/lib/graph/
  tree-layout.ts                      ← СОЗДАТЬ: auto-layout алгоритм
  tree-layout.unit.spec.ts            ← СОЗДАТЬ: unit-тесты
  index.ts                            ← СОЗДАТЬ: barrel
```

**Почему `features/org-board/`, а не `entities/board-position/`:**
Board positions — UI state, не доменная entity. По аналогии с `features/activity-feed/` (свой store + model, но не entity в бизнес-смысле). Feature может иметь store, если state специфичен для одного use case.

**Почему виджеты, а не компоненты внутри страницы:**
Pages в проекте — без сегментов (правило steiger). Board page слишком сложна для одного компонента. Виджеты = механизм декомпозиции (как `widgets/user-card/` для user-profile).

### 3. Модель данных

**User (расширение):**
```ts
export interface User {
  // ... все существующие поля
  managerId: string | null;  // ← НОВОЕ: FK на другого User (или null = top-level)
}
```

`managerId` добавляется в `User`, `CreateUserDto`, `UpdateUserDto`, `UserFormModel`. Все существующие пользователи в `db.json` получают `managerId: null`. Для demo — 5-7 связей формируют маленькое дерево.

**BoardPosition (новый тип):**
```ts
export interface BoardPosition {
  id: string;      // json-server auto-generated
  userId: string;  // FK на User
  x: number;       // позиция на доске
  y: number;
}
```

Коллекция `board-positions` в `db.json`, app-scoped через `appIdInterceptor`.

### 4. State management: два стора, один source of truth

- **`UsersStore`** — source of truth для иерархии (`managerId`). Метод `setManager(userId, managerId)` вызывает `api.update()` с `{ managerId }`.
- **`OrgBoardStore`** — source of truth для позиций на доске. CRUD для `board-positions`. Регистрируется в `AppScopeRegistry` для reset при смене workspace.

**Edges (связи)** — computed от `UsersStore.entities()`: фильтруем пользователей с `managerId`, где оба (user и manager) присутствуют на доске. Не хранятся отдельно.

**Валидные targets (cycle detection)** — computed от `UsersStore.entities()`: для каждого user вычисляем ancestors, исключаем их из возможных subordinates. Передаётся в Foblex через `[fCanBeConnectedInputs]`.

### 5. Взаимодействие с существующими системами

| Система | Влияние |
|---|---|
| `appIdInterceptor` | Автоматически добавляет `appId` к `board-positions` запросам — без изменений |
| `errorInterceptor` | Toast при ошибке PATCH (setManager), DELETE (removePosition) — без изменений |
| `appSwitchGuard` | `OrgBoardStore.reset()` через `withAppScoped()` — без изменений |
| `AppRouteReuseStrategy` | Destroy/recreate board page при смене appId — без изменений |
| `WebSocket` | Broadcast `user.updated` при setManager — уже работает через server.mjs middleware |
| `ActivityFeedStore` | Получает `user.updated` events автоматически — без изменений |
| Dashboard | Добавить новые computed для org metrics (Phase 7) |
| `features/user-delete` | Расширить: если у удаляемого user есть subordinates → enhanced confirmation (Phase 6) |

---

## Фазы реализации

---

### [x] Phase 1: Data Model + Pure Functions

**Цель:** Добавить `managerId` к User, написать pure functions для работы с деревом иерархии, подготовить backend.

#### Step 1.1: Backend — добавить `managerId` в db.json

**Файлы:**
- Изменить: `fake-backend/db.json`

**Реализация:**

1. Добавить поле `managerId: null` ко ВСЕМ существующим users
2. Создать demo-иерархию для `appId: "acme"` (5-7 связей):
   ```
   bmueller (id: "3", tech-lead, admin)
     ├── jdoe (id: "1", senior-frontend, editor)
     ├── cpatel (id: "5", backend-engineer, editor)
     └── asmith (id: "2", ux-designer, editor)
   ```
   Т.е. у `jdoe`, `asmith`, `cpatel` → `managerId: "3"` (Boris Mueller = их менеджер). У `bmueller` → `managerId: null` (top-level).
3. Добавить пустую коллекцию `"board-positions": []`
4. Добавить несколько demo-позиций для `appId: "acme"`:
   ```json
   { "id": "bp1", "userId": "3", "x": 400, "y": 50, "appId": "acme" },
   { "id": "bp2", "userId": "1", "x": 200, "y": 250, "appId": "acme" },
   { "id": "bp3", "userId": "2", "x": 400, "y": 250, "appId": "acme" },
   { "id": "bp4", "userId": "5", "x": 600, "y": 250, "appId": "acme" }
   ```

**Тесты:** нет (данные). Проверить вручную: `curl http://localhost:3000/users?appId=acme | jq '.[0].managerId'`.

**Definition of Done:**
- [x] Все users имеют `managerId` (null или FK)
- [x] Demo-иерархия из 4+ связей для acme
- [x] Коллекция `board-positions` с demo-данными
- [x] `bun run backend` стартует без ошибок
- [x] GET `/users`, GET `/board-positions` возвращают данные с новыми полями

---

#### Step 1.2: User model — добавить `managerId`

**Файлы:**
- Изменить: `src/app/entities/user/user.model.ts`

**Реализация:**

```ts
export interface User {
  // ... все существующие поля без изменений
  managerId: string | null;  // ← добавить последним полем
}
```

`CreateUserDto = Omit<User, 'id'>` — автоматически включит `managerId`.
`UpdateUserDto = Partial<CreateUserDto>` — автоматически включит `managerId`.

В `UserFormModel` добавить `managerId: string` (пустая строка = no manager). Select для выбора менеджера — Phase 4 (sidebar). На user-create/user-edit формах managerId пока не показывается (скрытое поле, значение `''`).

**Тесты:**
- Существующие тесты `user.store.spec.ts` должны продолжать проходить — добавить `managerId: null` во все mock-объекты User в тестах.

**Definition of Done:**
- [x] `User` interface содержит `managerId: string | null`
- [x] Все mock-объекты User в spec-файлах обновлены
- [x] `bun run test` — все тесты проходят (0 failures)

---

#### Step 1.3: Hierarchy pure functions

**Файлы:**
- Создать: `src/app/entities/user/lib/hierarchy.ts`
- Создать: `src/app/entities/user/lib/hierarchy.unit.spec.ts`
- Изменить: `src/app/entities/user/index.ts` — добавить экспорт

**Реализация:**

```ts
// entities/user/lib/hierarchy.ts
import type { User } from '../user.model';

/** Построить adjacency map: managerId → Set<userId> (children) */
export function buildChildrenMap(users: User[]): Map<string, Set<string>> { ... }

/** Получить всех ancestors (manager, manager's manager, ...) для userId. */
export function getAncestors(userId: string, users: User[]): Set<string> { ... }

/** Получить прямых подчинённых (managerId === userId). */
export function getDirectReports(userId: string, users: User[]): User[] { ... }

/** Получить всё поддерево (рекурсивно вниз). */
export function getSubtree(userId: string, users: User[]): User[] { ... }

/**
 * Проверить, создаст ли связь manager→subordinate цикл.
 * Цикл возникает, если subordinate является ancestor'ом manager'а.
 */
export function wouldCreateCycle(
  managerId: string,
  subordinateId: string,
  users: User[],
): boolean { ... }
```

Все функции — чистые, принимают массив User, не инжектят ничего.

`wouldCreateCycle` — ключевая функция для валидации на доске. Алгоритм: начинаем от `managerId`, идём вверх по `managerId` каждого ancestor'а. Если встретим `subordinateId` — цикл. Также true если `managerId === subordinateId` (self-reference).

**Тесты** (`hierarchy.unit.spec.ts` — чистые функции, без TestBed):

```
describe('buildChildrenMap')
  it('builds map from users with managerId')
  it('handles users with null managerId (top-level)')
  it('returns empty map for empty array')

describe('getAncestors')
  it('returns empty set for top-level user (managerId: null)')
  it('returns direct manager for one-level subordinate')
  it('returns full chain for deeply nested user')
  it('handles non-existent userId gracefully')

describe('getDirectReports')
  it('returns direct children of a manager')
  it('returns empty array for user without subordinates')
  it('does not include nested subordinates')

describe('getSubtree')
  it('returns all descendants recursively')
  it('returns empty array for leaf user')
  it('handles deep nesting (3+ levels)')

describe('wouldCreateCycle')
  it('returns false for valid connection (no cycle)')
  it('returns true for self-reference (A → A)')
  it('returns true for direct cycle (A manages B, B tries to manage A)')
  it('returns true for indirect cycle (A→B→C, C tries to manage A)')
  it('returns false when connecting unrelated users')
  it('handles top-level user (managerId: null) as root')
```

**Минимум 10 тестов. Цель: 100% coverage для этих pure functions.**

**Definition of Done:**
- [x] `hierarchy.ts` создан с 5 экспортируемыми функциями
- [x] `hierarchy.unit.spec.ts` — ≥10 тестов, все проходят
- [x] Экспорт добавлен в `entities/user/index.ts`
- [x] `bun run test` — green
- [ ] `bun run lint:arch` — clean (steiger)

---

#### Step 1.4: UsersStore — метод setManager()

**Файлы:**
- Изменить: `src/app/entities/user/user.store.ts`
- Изменить: `src/app/entities/user/user.store.spec.ts` (если существует; иначе — в Phase-тестах)

**Реализация:**

Добавить в `withMethods`:

```ts
async setManager(userId: string, managerId: string | null): Promise<boolean> {
  const r = await httpMutation(api.update(userId, { managerId }));
  if (!r.ok) return false;
  patchState(store, updateEntity({ id: userId, changes: r.data }));
  return true;
},
```

Это семантический alias для `update(id, { managerId })`. Отдельный метод нужен для:
1. Ясности intent'а в вызывающем коде (`store.setManager(...)` vs `store.update(id, { managerId: ... })`)
2. Будущего расширения (cascade logic может добавиться сюда)

**Тесты** (в существующем `user.store.spec.ts` или новом блоке):

```
describe('setManager()')
  it('PATCHes user with new managerId and updates entity')
    — вызвать setManager('1', '3')
    — expectOne: PATCH /api/users/1 с body содержащим managerId: '3'
    — flush: { ...mockUser, managerId: '3' }
    — await → true
    — store.entityMap()['1'].managerId === '3'

  it('returns false on HTTP error')
    — вызвать setManager('1', '3')
    — expectOne → flush с status 500
    — await → false
    — entity не изменён

  it('sets managerId to null (remove manager)')
    — вызвать setManager('1', null)
    — expectOne: PATCH body содержит managerId: null
    — flush → await → true
```

**Definition of Done:**
- [x] `setManager()` добавлен в UsersStore
- [x] 3+ теста для setManager в store spec
- [x] `bun run test` — green

---

### [x] Phase 2: Библиотека + пустая Board Page

**Цель:** Установить @foblex/flow, создать пустую страницу с канвасом, добавить роут и nav link.

#### Step 2.1: Установить @foblex/flow

**Команда:**
```bash
bun add @foblex/flow @foblex/2d @foblex/mediator @foblex/platform @foblex/utils
```

Проверить совместимость: `@foblex/flow` требует `@angular/core >=15.0.0` — Angular 21 совместим.

**Если Foblex требует CSS:**
Проверить документацию: скорее всего нужен import стилей в `angular.json` (`styles` массив) или в глобальном CSS. Добавить если нужно.

**Definition of Done:**
- [x] `bun install` без ошибок
- [x] `bun run build` без ошибок (проверить что Foblex не ломает сборку)

---

#### Step 2.2: Создать пустую Board Page

**Файлы:**
- Создать: `src/app/pages/org-board/org-board.ts`
- Создать: `src/app/pages/org-board/org-board.html`
- Создать: `src/app/pages/org-board/index.ts`
- Изменить: `src/app/app.routes.ts` — добавить роут
- Изменить: `src/app/layout/layout.ts` — добавить nav link

**Реализация:**

Page component — минимальный, с пустым канвасом:

```ts
// pages/org-board/org-board.ts
@Component({
  selector: 'app-org-board',
  imports: [FFlowModule], // или конкретные standalone-директивы
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage {
  // пока пустой — добавим state в следующих фазах
}
```

```html
<!-- pages/org-board/org-board.html -->
<div class="flex h-[calc(100vh-64px)]">
  <!-- sidebar placeholder -->
  <aside class="w-72 border-r border-base-300 bg-base-100 p-4">
    <h2 class="font-bold text-lg mb-4">Employees</h2>
    <p class="text-sm text-base-content/60">Sidebar — Phase 4</p>
  </aside>

  <!-- canvas area -->
  <main class="flex-1 bg-base-200 relative">
    <f-flow fDraggable>
      <f-canvas>
        <!-- nodes and edges will appear here in Phase 3 -->
      </f-canvas>
    </f-flow>
  </main>
</div>
```

Route:
```ts
{
  path: 'org-board',
  loadComponent: () => import('./pages/org-board').then((m) => m.OrgBoardPage),
},
```

Nav link — добавить между "Departments" и "Audit Log":
```html
<li>
  <a
    [routerLink]="['/app', appStore.currentAppId(), 'org-board']"
    routerLinkActive="active"
  >Org Board</a>
</li>
```

**Тесты:**
- `org-board.spec.ts`: базовый component test — создание fixture, проверка что template рендерится без ошибок

```
describe('OrgBoardPage')
  it('creates without error')
  it('renders sidebar placeholder')
  it('renders f-flow canvas container')
```

**Definition of Done:**
- [x] Страница рендерится по URL `/app/acme/org-board`
- [x] Nav link "Org Board" в header
- [x] Пустой Foblex canvas с pan/zoom (можно drag'ать пустое пространство)
- [x] `bun run test` — green
- [x] `bun run build` — green
- [x] `bun run lint:arch` — no new violations (2 pre-existing: audit-entry, invitation segmentless)

---

### Phase 3: OrgBoardStore + Card Rendering

**Цель:** Создать OrgBoardStore для позиций, загрузить пользователей + позиции, отрендерить карточки как ноды на канвасе.

#### Step 3.1: OrgBoard feature — model + api + store

**Файлы:**
- Создать: `src/app/features/org-board/org-board.model.ts`
- Создать: `src/app/features/org-board/org-board.api.ts`
- Создать: `src/app/features/org-board/org-board.store.ts`
- Создать: `src/app/features/org-board/org-board.store.spec.ts`
- Создать: `src/app/features/org-board/index.ts`

**Реализация:**

```ts
// org-board.model.ts
export interface BoardPosition {
  id: string;
  userId: string;
  x: number;
  y: number;
}

/** Computed node: User + position, ready for rendering */
export interface BoardNode {
  userId: string;
  user: User;
  x: number;
  y: number;
  positionId: string; // id из BoardPosition, для PATCH/DELETE
}

/** Computed edge: from manager to subordinate, both on board */
export interface BoardEdge {
  id: string;           // `edge-${managerId}-${userId}`
  managerId: string;
  subordinateId: string;
  outputId: string;     // `out-${managerId}` для Foblex fOutputId
  inputId: string;      // `in-${subordinateId}` для Foblex fInputId
}
```

```ts
// org-board.api.ts
@Injectable({ providedIn: 'root' })
export class OrgBoardApi {
  private readonly http = inject(HttpClient);

  getPositions() {
    return this.http.get<BoardPosition[]>('/api/board-positions');
  }

  createPosition(userId: string, x: number, y: number) {
    return this.http.post<BoardPosition>('/api/board-positions', { userId, x, y });
  }

  updatePosition(id: string, x: number, y: number) {
    return this.http.patch<BoardPosition>(`/api/board-positions/${id}`, { x, y });
  }

  removePosition(id: string) {
    return this.http.delete<void>(`/api/board-positions/${id}`);
  }
}
```

```ts
// org-board.store.ts
export const OrgBoardStore = signalStore(
  { providedIn: 'root' },
  withEntities<BoardPosition>(),
  withState<{ loading: boolean; error: string | null }>({
    loading: false, error: null,
  }),
  withComputed(({ entities }) => ({
    positionByUserId: computed(() => {
      const map = new Map<string, BoardPosition>();
      for (const pos of entities()) map.set(pos.userId, pos);
      return map;
    }),
    userIdsOnBoard: computed(() => new Set(entities().map(p => p.userId))),
  })),
  withMethods((store, api = inject(OrgBoardApi)) => ({
    async loadPositions(): Promise<void> {
      if (store.entities().length) return; // кэш
      patchState(store, { loading: true, error: null });
      try {
        const positions = await lastValueFrom(api.getPositions());
        patchState(store, setAllEntities(positions), { loading: false });
      } catch {
        patchState(store, { loading: false, error: 'Failed to load board positions' });
      }
    },

    async addToBoard(userId: string, x: number, y: number): Promise<BoardPosition | undefined> {
      const r = await httpMutation(api.createPosition(userId, x, y));
      if (!r.ok) return undefined;
      patchState(store, addEntity(r.data));
      return r.data;
    },

    async updatePosition(positionId: string, x: number, y: number): Promise<boolean> {
      const r = await httpMutation(api.updatePosition(positionId, x, y));
      if (!r.ok) return false;
      patchState(store, updateEntity({ id: positionId, changes: { x, y } }));
      return true;
    },

    async removeFromBoard(positionId: string): Promise<boolean> {
      const r = await httpMutation(api.removePosition(positionId));
      if (!r.ok) return false;
      patchState(store, removeEntity(positionId));
      return true;
    },

    reset(): void {
      patchState(store, setAllEntities([] as BoardPosition[]), {
        loading: false, error: null,
      });
    },
  })),
  withAppScoped(),
);
```

**Barrel export** (`index.ts`):
```ts
export type { BoardPosition, BoardNode, BoardEdge } from './org-board.model';
export { OrgBoardStore } from './org-board.store';
```

**Тесты** (`org-board.store.spec.ts`):

```
describe('OrgBoardStore')
  // Setup: TestBed с provideHttpClient + provideHttpClientTesting

  describe('loadPositions()')
    it('fetches positions and populates entities')
    it('skips fetch if already loaded (cache)')
    it('sets error on failure')

  describe('addToBoard()')
    it('POSTs and adds entity to store')
    it('returns undefined on HTTP error')

  describe('updatePosition()')
    it('PATCHes and updates entity in store')
    it('returns false on HTTP error')

  describe('removeFromBoard()')
    it('DELETEs and removes entity from store')
    it('returns false on HTTP error')

  describe('positionByUserId')
    it('maps userId → BoardPosition')

  describe('reset()')
    it('clears all entities and resets state')
```

**Минимум 10 тестов.**

**Definition of Done:**
- [ ] Feature `org-board` создана с model, api, store, barrel
- [ ] Store-тесты: ≥10, все проходят
- [ ] `bun run test` — green
- [ ] `bun run lint:arch` — clean

---

#### Step 3.2: UserBoardCard widget

**Файлы:**
- Создать: `src/app/widgets/user-board-card/user-board-card.ts`
- Создать: `src/app/widgets/user-board-card/user-board-card.spec.ts`
- Создать: `src/app/widgets/user-board-card/index.ts`

**Реализация:**

Компактная карточка для отображения на доске. Не содержит Foblex-директив (они ставятся на родительский `<div fNode>` в canvas widget).

```ts
@Component({
  selector: 'app-user-board-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card card-compact bg-base-100 shadow-md w-48 select-none"
         [class.ring-2]="selected()"
         [class.ring-primary]="selected()">
      <div class="card-body p-3">
        <div class="flex items-center gap-2">
          <!-- Avatar initials -->
          <div class="avatar placeholder">
            <div class="bg-neutral text-neutral-content w-8 rounded-full">
              <span class="text-xs">{{ initials() }}</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-sm truncate">{{ user().firstName }} {{ user().lastName }}</h3>
            <p class="text-xs text-base-content/60 truncate">{{ user().jobTitle }}</p>
          </div>
        </div>
        @if (directReportsCount() > 0) {
          <div class="badge badge-sm badge-outline mt-1">
            {{ directReportsCount() }} reports
          </div>
        }
      </div>
    </div>
  `,
})
export class UserBoardCardComponent {
  readonly user = input.required<User>();
  readonly selected = input(false);
  readonly directReportsCount = input(0);

  protected readonly initials = computed(() => {
    const u = this.user();
    return (u.firstName[0] ?? '') + (u.lastName[0] ?? '');
  });
}
```

**Тесты** (`user-board-card.spec.ts`):

```
describe('UserBoardCardComponent')
  it('renders user name and job title')
  it('shows initials in avatar')
  it('shows direct reports badge when count > 0')
  it('hides direct reports badge when count is 0')
  it('applies ring classes when selected')
```

**Definition of Done:**
- [ ] Widget создан, компилируется
- [ ] 5 тестов, все проходят
- [ ] `bun run test` — green

---

#### Step 3.3: OrgBoardCanvas widget — рендер нод и связей

**Файлы:**
- Создать: `src/app/widgets/org-board-canvas/org-board-canvas.ts`
- Создать: `src/app/widgets/org-board-canvas/org-board-canvas.html`
- Создать: `src/app/widgets/org-board-canvas/org-board-canvas.spec.ts`
- Создать: `src/app/widgets/org-board-canvas/index.ts`

**Реализация:**

Canvas widget получает данные через inputs (не инжектит сторы — page делает маппинг).

```ts
@Component({
  selector: 'app-org-board-canvas',
  imports: [FFlowModule, UserBoardCardComponent], // уточнить exact Foblex imports
  templateUrl: './org-board-canvas.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardCanvasComponent {
  readonly nodes = input.required<BoardNode[]>();
  readonly edges = input.required<BoardEdge[]>();
  readonly selectedUserId = input<string | null>(null);
  readonly validTargetsByUser = input.required<Map<string, string[]>>();

  readonly nodePositionChanged = output<{ userId: string; positionId: string; x: number; y: number }>();
  readonly connectionCreated = output<{ managerId: string; subordinateId: string }>();
  readonly connectionRemoved = output<{ subordinateId: string }>();
  readonly nodeClicked = output<string>(); // userId
  readonly externalDrop = output<{ userId: string; x: number; y: number }>();
}
```

```html
<!-- org-board-canvas.html -->
<f-flow fDraggable
        (fCreateConnection)="onConnectionCreated($event)"
        (fReassignConnection)="onConnectionReassigned($event)">
  <f-canvas>
    @for (node of nodes(); track node.userId) {
      <div fNode
           [fNodePosition]="{ x: node.x, y: node.y }"
           (fNodePositionChange)="onPositionChange(node, $event)"
           fDragHandle>

        <app-user-board-card
          [user]="node.user"
          [selected]="selectedUserId() === node.userId"
          [directReportsCount]="0"
          (click)="nodeClicked.emit(node.userId)" />

        <!-- Connection output: "я менеджер → drag к подчинённому" -->
        <div fNodeOutput
             [fOutputId]="'out-' + node.userId"
             [fOutputMultiple]="true"
             [fCanBeConnectedInputs]="validTargetsByUser().get(node.userId) ?? []"
             fOutputConnectableSide="bottom"
             class="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2
                    w-3 h-3 rounded-full bg-primary cursor-crosshair
                    hover:scale-150 transition-transform">
        </div>

        <!-- Connection input: "мой менеджер → drop сюда" -->
        <div fNodeInput
             [fInputId]="'in-' + node.userId"
             fInputConnectableSide="top"
             class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2
                    w-3 h-3 rounded-full bg-secondary cursor-crosshair
                    hover:scale-150 transition-transform">
        </div>
      </div>
    }

    @for (edge of edges(); track edge.id) {
      <f-connection
        [fOutputId]="edge.outputId"
        [fInputId]="edge.inputId">
      </f-connection>
    }
  </f-canvas>
</f-flow>
```

**Ключевые моменты:**
- `[fOutputMultiple]="true"` — менеджер может иметь несколько подчинённых
- `[fCanBeConnectedInputs]` — декларативная валидация от cycle detection (computed в page)
- `fOutputConnectableSide="bottom"` / `fInputConnectableSide="top"` — связи идут сверху вниз (manager сверху)
- Connection points — маленькие кружки на краях карточки, увеличиваются при hover

**Методы в компоненте:**

```ts
protected onPositionChange(node: BoardNode, event: { x: number; y: number }): void {
  this.nodePositionChanged.emit({
    userId: node.userId,
    positionId: node.positionId,
    x: event.x,
    y: event.y,
  });
}

protected onConnectionCreated(event: FCreateConnectionEvent): void {
  // Извлечь userId из fOutputId / fInputId
  const managerId = event.fOutputId.replace('out-', '');
  const subordinateId = event.fInputId.replace('in-', '');
  this.connectionCreated.emit({ managerId, subordinateId });
}
```

**Тесты** (`org-board-canvas.spec.ts`):

Foblex компоненты в тестах могут требовать специальной настройки. На данном этапе — базовые тесты:

```
describe('OrgBoardCanvasComponent')
  it('creates without error')
  it('renders node elements for each BoardNode')
  it('renders connection elements for each BoardEdge')
  it('emits nodeClicked when card is clicked')
```

**Примечание:** полное тестирование drag/drop и connection creation сложно в unit-тестах (зависит от Foblex internals). Основная логика (cycle detection, store operations) покрыта в Phase 1 и 3.1.

**Definition of Done:**
- [ ] Canvas widget рендерит карточки и связи из input data
- [ ] Connection points видны на карточках
- [ ] 4+ тестов, все проходят
- [ ] `bun run test` — green

---

#### Step 3.4: Board Page — подключить данные

**Файлы:**
- Изменить: `src/app/pages/org-board/org-board.ts`
- Изменить: `src/app/pages/org-board/org-board.html`

**Реализация:**

Page — оркестратор: инжектит оба стора, вычисляет nodes/edges/validTargets, передаёт в canvas widget.

```ts
@Component({
  selector: 'app-org-board',
  imports: [OrgBoardCanvasComponent, SpinnerComponent, ErrorAlertComponent],
  templateUrl: './org-board.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardPage implements OnInit {
  private readonly usersStore = inject(UsersStore);
  private readonly boardStore = inject(OrgBoardStore);

  // Computed: BoardNode[] — users on board с позициями
  protected readonly nodes = computed<BoardNode[]>(() => {
    const users = this.usersStore.entityMap();
    const positions = this.boardStore.entities();
    return positions
      .map(pos => {
        const user = users[pos.userId];
        if (!user) return null;
        return { userId: pos.userId, user, x: pos.x, y: pos.y, positionId: pos.id };
      })
      .filter((n): n is BoardNode => n !== null);
  });

  // Computed: BoardEdge[] — связи manager→subordinate, оба на доске
  protected readonly edges = computed<BoardEdge[]>(() => {
    const onBoard = this.boardStore.userIdsOnBoard();
    return this.usersStore.entities()
      .filter(u => u.managerId && onBoard.has(u.id) && onBoard.has(u.managerId))
      .map(u => ({
        id: `edge-${u.managerId}-${u.id}`,
        managerId: u.managerId!,
        subordinateId: u.id,
        outputId: `out-${u.managerId}`,
        inputId: `in-${u.id}`,
      }));
  });

  // Computed: cycle detection — для каждого user, какие inputs валидны для его output
  protected readonly validTargetsByUser = computed(() => {
    const users = this.usersStore.entities();
    const onBoard = this.boardStore.userIdsOnBoard();
    const result = new Map<string, string[]>();

    for (const user of users) {
      if (!onBoard.has(user.id)) continue;
      const ancestors = getAncestors(user.id, users);
      const validInputs = users
        .filter(u => onBoard.has(u.id) && u.id !== user.id && !ancestors.has(u.id))
        .map(u => `in-${u.id}`);
      result.set(user.id, validInputs);
    }
    return result;
  });

  protected readonly selectedUserId = signal<string | null>(null);
  protected readonly loading = computed(() =>
    this.usersStore.loading() || this.boardStore.loading()
  );

  ngOnInit(): void {
    this.usersStore.loadAll();
    this.boardStore.loadPositions();
  }

  protected async onConnectionCreated(event: { managerId: string; subordinateId: string }): Promise<void> {
    await this.usersStore.setManager(event.subordinateId, event.managerId);
  }

  protected async onPositionChanged(event: { positionId: string; x: number; y: number }): Promise<void> {
    await this.boardStore.updatePosition(event.positionId, event.x, event.y);
  }
}
```

**Тесты** (`org-board.spec.ts`):

```
describe('OrgBoardPage')
  it('loads users and positions on init')
  it('computes nodes from users + positions')
  it('computes edges from managerId relationships')
  it('computes validTargets excluding ancestors')
```

**Definition of Done:**
- [ ] Page загружает данные и рендерит карточки на канвасе
- [ ] Связи рисуются между manager и subordinate
- [ ] Карточки можно двигать по канвасу
- [ ] Позиции сохраняются при перемещении (PATCH)
- [ ] Новые связи создаются drag'ом от connection point
- [ ] Cycle detection работает: нельзя создать цикл
- [ ] 4+ тестов
- [ ] `bun run test` — green
- [ ] `bun run build` — green

---

### Phase 4: Sidebar Panel

**Цель:** Создать sidebar с: (a) список сотрудников с поиском/фильтром, (b) drag из sidebar на доску, (c) detail view по клику на карточку.

#### Step 4.1: OrgBoardSidebar widget

**Файлы:**
- Создать: `src/app/widgets/org-board-sidebar/org-board-sidebar.ts`
- Создать: `src/app/widgets/org-board-sidebar/org-board-sidebar.html`
- Создать: `src/app/widgets/org-board-sidebar/org-board-sidebar.spec.ts`
- Создать: `src/app/widgets/org-board-sidebar/index.ts`

**Реализация:**

Sidebar имеет два режима: `list` (список сотрудников) и `details` (информация по выбранному).

```ts
@Component({
  selector: 'app-org-board-sidebar',
  imports: [FormsModule, FFlowModule], // fExternalDraggable
  templateUrl: './org-board-sidebar.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrgBoardSidebarComponent {
  readonly users = input.required<User[]>();
  readonly userIdsOnBoard = input.required<Set<string>>();
  readonly selectedUser = input<User | null>(null);
  readonly directReports = input<User[]>([]);
  readonly manager = input<User | null>(null);

  readonly userDropped = output<{ userId: string; x: number; y: number }>();
  readonly userSelected = output<string>(); // userId
  readonly backToList = output<void>();

  protected readonly search = signal('');
  protected readonly mode = computed(() =>
    this.selectedUser() ? 'details' as const : 'list' as const
  );

  // Фильтрованный список: поиск + разделение "on board" / "not on board"
  protected readonly filteredUsers = computed(() => {
    const q = this.search().toLowerCase();
    return this.users()
      .filter(u => !q ||
        u.firstName.toLowerCase().includes(q) ||
        u.lastName.toLowerCase().includes(q) ||
        u.username.toLowerCase().includes(q)
      )
      .sort((a, b) => {
        // Сначала не на доске, потом на доске
        const aOnBoard = this.userIdsOnBoard().has(a.id) ? 1 : 0;
        const bOnBoard = this.userIdsOnBoard().has(b.id) ? 1 : 0;
        return aOnBoard - bOnBoard;
      });
  });
}
```

**Template — режим "list":**
- Input для поиска
- Список сотрудников: имя, должность, badge "On board" / draggable handle
- Каждый сотрудник, которого НЕТ на доске — имеет `fExternalDraggable` для drag на канвас
- Клик по сотруднику на доске → `userSelected.emit(userId)`

**Template — режим "details":**
- Кнопка "← Back"
- Полное имя, email, должность, отдел, роль, bio
- "Manager: [имя]" (кликабельный → focus на карточке)
- "Direct reports: [список]" (кликабельные)
- Кнопки: "View profile", "Remove from board"

**Ключевой момент — fExternalDraggable:**
Foblex предоставляет `fExternalDraggable` директиву для drag'а элементов извне canvas. При drop на canvas — событие `(fExternalItem)` на `<f-flow>`. Нужно проверить exact API и добавить обработчик в canvas widget.

**Тесты:**

```
describe('OrgBoardSidebarComponent')
  it('renders user list in list mode')
  it('filters users by search query')
  it('marks users on board with badge')
  it('switches to details mode when selectedUser provided')
  it('shows user details: name, email, department, jobTitle')
  it('shows direct reports list')
  it('shows manager name')
  it('emits backToList when back button clicked')
```

**Минимум 8 тестов.**

**Definition of Done:**
- [ ] Sidebar рендерит список сотрудников с поиском
- [ ] Сотрудники не на доске — draggable в канвас
- [ ] Клик на карточку на доске → sidebar показывает детали
- [ ] Detail view: информация + manager + direct reports
- [ ] 8+ тестов
- [ ] `bun run test` — green

---

#### Step 4.2: Подключить sidebar к page + canvas

**Файлы:**
- Изменить: `src/app/pages/org-board/org-board.ts`
- Изменить: `src/app/pages/org-board/org-board.html`
- Изменить: `src/app/widgets/org-board-canvas/org-board-canvas.ts` — добавить обработчик external drop

**Реализация:**

Page передаёт в sidebar:
- `users` — все пользователи текущего workspace
- `userIdsOnBoard` — set из boardStore
- `selectedUser` — computed от `selectedUserId` signal
- `directReports` — computed через `getDirectReports()`
- `manager` — computed: `users.find(u => u.id === selectedUser.managerId)`

Page обрабатывает outputs sidebar'а:
- `userDropped` → `boardStore.addToBoard(userId, x, y)`
- `userSelected` → `selectedUserId.set(userId)`
- `backToList` → `selectedUserId.set(null)`

Canvas widget обрабатывает `(fExternalItem)` event от Foblex → `externalDrop.emit(...)`.

**Тесты:** обновить `org-board.spec.ts` — 2-3 теста на interaction между sidebar и board state.

**Definition of Done:**
- [ ] Drag из sidebar → drop на canvas → карточка появляется
- [ ] Клик на карточку → sidebar показывает детали
- [ ] Direct reports и manager кликабельны
- [ ] `bun run test` — green

---

### Phase 5: Connection System (полноценный)

**Цель:** Довести систему связей до production-quality: replace manager confirmation, delete connections, visual feedback.

#### Step 5.1: Replace Manager — confirmation dialog

**Файлы:**
- Изменить: `src/app/pages/org-board/org-board.ts`

**Реализация:**

Когда `(fCreateConnection)` или `(fReassignConnection)` приходит для user, у которого уже есть `managerId`:

```ts
protected async onConnectionCreated(event: { managerId: string; subordinateId: string }): Promise<void> {
  const subordinate = this.usersStore.entityMap()[event.subordinateId];
  if (!subordinate) return;

  // Если уже есть менеджер — запросить подтверждение
  if (subordinate.managerId && subordinate.managerId !== event.managerId) {
    const currentManager = this.usersStore.entityMap()[subordinate.managerId];
    this.pendingConnection.set({
      ...event,
      currentManagerName: currentManager
        ? `${currentManager.firstName} ${currentManager.lastName}`
        : 'Unknown',
    });
    return; // dialog откроется реактивно
  }

  await this.usersStore.setManager(event.subordinateId, event.managerId);
}

protected async confirmReassignment(): Promise<void> {
  const pending = this.pendingConnection();
  if (!pending) return;
  await this.usersStore.setManager(pending.subordinateId, pending.managerId);
  this.pendingConnection.set(null);
}

protected cancelReassignment(): void {
  this.pendingConnection.set(null);
}
```

В шаблоне — `ConfirmDialogComponent` с динамическим message:
```
"User X already reports to Y. Reassign to Z?"
```

#### Step 5.2: Delete connection

**Реализация:**

Два способа удаления связи:
1. **Через sidebar** — в detail view: "Manager: [имя] [×]" → `store.setManager(userId, null)`
2. **На доске** — клик по связи → delete action (если Foblex поддерживает selection связей)

Проверить API Foblex: `(fSelectionChange)` может содержать selected connections. Если да — добавить кнопку "Delete connection" в toolbar или по нажатию Delete.

Fallback: если Foblex не позволяет выбирать связи — удаление только через sidebar.

**Тесты:**

```
describe('Connection management')
  it('creates connection (setManager) on fCreateConnection')
  it('shows confirmation when replacing existing manager')
  it('removes connection (setManager null) through sidebar')
```

**Definition of Done:**
- [ ] Новые связи создаются drag'ом
- [ ] При замене менеджера — confirmation dialog
- [ ] Связи можно удалить
- [ ] Все changes видны в ActivityFeed (через WebSocket broadcast)
- [ ] 3+ тестов
- [ ] `bun run test` — green

---

### Phase 6: Cascade Effects + Enhanced Delete

**Цель:** Обработать удаление пользователя с подчинёнными; удаление карточки с доски.

#### Step 6.1: Remove from board (не удаление user)

**Файлы:**
- Изменить: sidebar + page

**Реализация:**

В sidebar detail view: кнопка "Remove from board".
- `boardStore.removeFromBoard(positionId)` — удаляет BoardPosition
- Все связи этой карточки исчезают (computed edges пересчитывается)
- `managerId` на User НЕ меняется — иерархия сохраняется в данных, просто не отображается
- User возвращается в sidebar list как "not on board"

#### Step 6.2: Enhanced user-delete — cascade subordinates

**Файлы:**
- Изменить: `src/app/features/user-delete/ui/user-delete-action.ts`

**Реализация:**

Расширить delete action: если у удаляемого user есть подчинённые (`getDirectReports(userId, users).length > 0`):

1. Показать enhanced confirmation:
   ```
   "User X has N direct reports. They will be reassigned to X's manager (Y) / left without manager."
   ```
2. При подтверждении:
   ```ts
   // Переназначить подчинённых
   const reports = getDirectReports(userId, users);
   const user = usersStore.entityMap()[userId];
   const newManagerId = user?.managerId ?? null; // manager's manager, or null
   for (const report of reports) {
     await usersStore.setManager(report.id, newManagerId);
   }
   // Удалить самого пользователя
   await usersStore.remove(userId);
   ```

**Тесты:**

```
describe('UserDeleteAction — cascade')
  it('shows standard confirmation for user without subordinates')
  it('shows enhanced confirmation with subordinate count')
  it('reassigns subordinates to deleted user manager on confirm')
  it('removes user after reassignment')
```

**Definition of Done:**
- [ ] "Remove from board" работает (не удаляет user, убирает с доски)
- [ ] Delete user с подчинёнными → enhanced dialog → reassign → delete
- [ ] 4+ тестов
- [ ] `bun run test` — green

---

### Phase 7: Dashboard Aggregations

**Цель:** Добавить организационные метрики на Dashboard.

#### Step 7.1: Org metrics на Dashboard

**Файлы:**
- Изменить: `src/app/pages/dashboard/dashboard.ts`
- Изменить: `src/app/pages/dashboard/dashboard.html`

**Реализация:**

Новые computed в Dashboard:

```ts
// Сотрудники без менеджера (кроме top-level managers)
protected readonly orphanedUsers = computed(() =>
  this.store.entities().filter(u => !u.managerId).length
);

// Top managers по количеству прямых подчинённых
protected readonly topManagers = computed(() => {
  const users = this.store.entities();
  const counts = new Map<string, number>();
  for (const u of users) {
    if (u.managerId) counts.set(u.managerId, (counts.get(u.managerId) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([id, count]) => {
      const manager = users.find(u => u.id === id);
      return { name: manager ? `${manager.firstName} ${manager.lastName}` : id, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
});

// Максимальная глубина иерархии
protected readonly maxDepth = computed(() => {
  const users = this.store.entities();
  let maxD = 0;
  for (const u of users) {
    maxD = Math.max(maxD, getAncestors(u.id, users).size);
  }
  return maxD;
});
```

**HTML**: 3 новые карточки в dashboard grid:
- "Without manager: N" (stat card)
- "Top managers" (small table: name, reports count)
- "Hierarchy depth: N levels"

**Тесты:**

Обновить `dashboard.spec.ts`:
```
it('computes orphaned users count')
it('computes top managers with report counts')
it('computes max hierarchy depth')
```

**Definition of Done:**
- [ ] 3 новых метрики на Dashboard
- [ ] 3+ тестов
- [ ] `bun run test` — green

---

### Phase 8: Auto-layout + UX Polish

**Цель:** Алгоритм авто-раскладки дерева, "Fit to screen", highlight subtree, minimap.

#### Step 8.1: Tree layout algorithm

**Файлы:**
- Создать: `src/app/shared/lib/graph/tree-layout.ts`
- Создать: `src/app/shared/lib/graph/tree-layout.unit.spec.ts`
- Создать: `src/app/shared/lib/graph/index.ts`
- Изменить: `src/app/shared/lib/index.ts` — re-export

**Реализация:**

Простой top-down tree layout. Каждый уровень иерархии = горизонтальный ряд. Siblings распределяются равномерно.

```ts
export interface LayoutNode {
  id: string;
  parentId: string | null;
}

export interface LayoutResult {
  id: string;
  x: number;
  y: number;
}

export interface LayoutOptions {
  nodeWidth?: number;    // default 200
  nodeHeight?: number;   // default 100
  horizontalGap?: number; // default 40
  verticalGap?: number;   // default 80
}

/**
 * Вычислить позиции для дерева иерархии.
 * Алгоритм: рекурсивный bottom-up для ширины, top-down для координат.
 * Roots (parentId: null) располагаются в первом ряду.
 */
export function computeTreeLayout(nodes: LayoutNode[], options?: LayoutOptions): LayoutResult[] { ... }
```

Алгоритм (упрощённый Reingold-Tilford):
1. Найти все корни (parentId === null)
2. Для каждого корня рекурсивно вычислить ширину поддерева
3. Расположить корни рядом в первом ряду
4. Рекурсивно расположить детей центрированно под родителем
5. Вернуть `{ id, x, y }[]`

**Тесты** (`tree-layout.unit.spec.ts`):

```
describe('computeTreeLayout')
  it('positions single root at (0, 0)')
  it('positions children below parent, centered')
  it('handles multiple roots side by side')
  it('handles deep chain (A→B→C→D) vertically')
  it('handles wide tree (1 root, 5 children) horizontally')
  it('handles mixed tree (varying depth and width)')
  it('handles empty input')
  it('respects custom nodeWidth/nodeHeight/gaps')
```

**Минимум 8 тестов, 100% branch coverage.**

**Definition of Done:**
- [ ] Алгоритм написан, работает для любого дерева
- [ ] 8+ unit-тестов
- [ ] Экспорт из `shared/lib/graph/index.ts` → `shared/lib/index.ts`
- [ ] `bun run test` — green
- [ ] `bun run lint:arch` — clean

---

#### Step 8.2: "Auto-layout" кнопка на board page

**Файлы:**
- Изменить: `src/app/pages/org-board/org-board.ts`
- Изменить: `src/app/pages/org-board/org-board.html`

**Реализация:**

Кнопка "Auto-layout" в toolbar над канвасом:

```ts
protected async autoLayout(): Promise<void> {
  const users = this.usersStore.entities();
  const onBoard = this.boardStore.userIdsOnBoard();

  const layoutNodes: LayoutNode[] = users
    .filter(u => onBoard.has(u.id))
    .map(u => ({ id: u.id, parentId: u.managerId }));

  const positions = computeTreeLayout(layoutNodes);

  // Batch update позиций
  for (const pos of positions) {
    const existing = this.boardStore.positionByUserId().get(pos.id);
    if (existing) {
      await this.boardStore.updatePosition(existing.id, pos.x, pos.y);
    }
  }
}
```

**Примечание:** batch PATCH — последовательные запросы. Для оптимизации можно добавить bulk endpoint на backend, но для playground последовательные запросы приемлемы (json-server <5ms на запрос).

#### Step 8.3: Highlight subtree

**Реализация:**

При клике на карточку менеджера — все карточки его поддерева получают visual highlight.

```ts
protected readonly highlightedUserIds = computed(() => {
  const selected = this.selectedUserId();
  if (!selected) return new Set<string>();
  const users = this.usersStore.entities();
  const subtree = getSubtree(selected, users);
  return new Set([selected, ...subtree.map(u => u.id)]);
});
```

Передать в canvas widget → UserBoardCard получает `[highlighted]` input → CSS class `opacity-100` vs `opacity-40`.

#### Step 8.4: Fit to screen

**Реализация:**

Foblex предоставляет `getNodesBoundingBox()` на `FFlowComponent` ref. Использовать для вычисления необходимого zoom level:

```ts
@ViewChild(FFlowComponent) flow!: FFlowComponent;

protected fitToScreen(): void {
  // Foblex может иметь встроенный fitToScreen или reset через API
  // Проверить: this.flow.reset() или ручной расчёт
}
```

Проверить Foblex API — может быть встроенный метод `fitToScreen()` или аналог.

#### Step 8.5: Minimap (stretch goal)

Foblex имеет опциональный minimap module. Если поддерживается:

```html
<f-flow fDraggable>
  <f-minimap></f-minimap>
  <f-canvas>...</f-canvas>
</f-flow>
```

Если нет встроенного — пропустить (stretch goal, не обязательно для MVP).

**Тесты для Phase 8:**

```
describe('auto-layout')
  it('repositions all board nodes according to tree layout')

describe('highlight subtree')
  it('highlights selected user and all descendants')
  it('clears highlight when selection cleared')
```

**Definition of Done:**
- [ ] Кнопка "Auto-layout" раскладывает карточки по иерархии
- [ ] Highlight поддерева при клике на менеджера
- [ ] "Fit to screen" работает
- [ ] Minimap (если Foblex поддерживает)
- [ ] 2+ тестов для layout/highlight
- [ ] `bun run test` — green
- [ ] `bun run build` — green

---

## Implementation Order (checklist)

### Phase 1: Data Model + Pure Functions
- [ ] 1.1 Backend: managerId + board-positions в db.json
- [ ] 1.2 User model: + managerId
- [ ] 1.3 Hierarchy pure functions + unit tests (≥10)
- [ ] 1.4 UsersStore: + setManager() + tests (≥3)

### Phase 2: Library + Empty Board
- [ ] 2.1 Install @foblex/flow + peer deps
- [ ] 2.2 Board page + route + nav link + tests (≥3)

### Phase 3: Store + Card Rendering
- [ ] 3.1 OrgBoard feature: model + api + store + tests (≥10)
- [ ] 3.2 UserBoardCard widget + tests (≥5)
- [ ] 3.3 OrgBoardCanvas widget + tests (≥4)
- [ ] 3.4 Board page: data loading + computed nodes/edges/validTargets + tests (≥4)

### Phase 4: Sidebar Panel
- [ ] 4.1 OrgBoardSidebar widget + tests (≥8)
- [ ] 4.2 Sidebar ↔ page ↔ canvas integration

### Phase 5: Connection System
- [ ] 5.1 Replace manager confirmation dialog
- [ ] 5.2 Delete connection (sidebar + board) + tests (≥3)

### Phase 6: Cascade Effects
- [ ] 6.1 Remove from board action
- [ ] 6.2 Enhanced user-delete with subordinate reassignment + tests (≥4)

### Phase 7: Dashboard Aggregations
- [ ] 7.1 Org metrics on Dashboard + tests (≥3)

### Phase 8: Auto-layout + Polish
- [ ] 8.1 Tree layout algorithm + unit tests (≥8)
- [ ] 8.2 "Auto-layout" button
- [ ] 8.3 Highlight subtree
- [ ] 8.4 Fit to screen
- [ ] 8.5 Minimap (stretch)

---

## Final checklist (per phase)

Каждая фаза завершается:
- [ ] `bun run test` — все тесты проходят
- [ ] `bun run build` — сборка успешна
- [ ] `bun run lint:arch` — steiger clean
- [ ] Новые файлы имеют barrel exports (`index.ts`)
- [ ] Нет deep imports (только через `@entities/...`, `@features/...`, `@widgets/...`, `@shared/...`)

---

## Общие метрики

| Метрика | Ожидаемое |
|---|---|
| Новых файлов | ~30 (модели, сторы, компоненты, тесты, баррели) |
| Изменённых файлов | ~10 (User model/store, routes, layout, dashboard, db.json, server.mjs) |
| Новых тестов | ~70+ |
| Новых dependencies | @foblex/flow + 4 peer deps |
| Новые ADR | Возможен ADR 0011 (board state management) если паттерн board store окажется нетривиальным |
