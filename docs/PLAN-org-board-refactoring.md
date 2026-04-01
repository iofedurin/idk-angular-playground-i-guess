# Plan: Org-Board Code Review — Refactoring

## Context

Code review (`docs/org-board-code-review.md`) выявил 10 проблем в org-board фиче. Главная — `OrgBoardPage` (239 строк, 8 ответственностей). План разбит на 8 атомарных шагов. Каждый шаг заканчивается `bun run test` + коммитом. Порядок: от безопасных leaf-изменений к более крупным рефакторингам.

---

## Step 1: [x] `UserAvatarComponent` — устранение дублирования ×5

**Цель:** Один компонент для всех avatar-плейсхолдеров.

### 1.1 Создать компонент

**Новый файл:** `src/app/entities/user/ui/user-avatar/user-avatar.ts`

- Inputs: `firstName: string` (required), `lastName: string` (required), `size: 'xs' | 'sm' | 'md'` (default `'sm'`), `colorScheme: 'neutral' | 'primary' | 'base'` (default `'neutral'`)
- `host: { style: 'display: contents' }` — как options-компоненты
- Computed: `initials`, `containerClasses` (размер + цвет), `textClass` (размер шрифта)
- Размеры: `xs` → `w-7`, `sm` → `w-8`, `md` → `w-12`
- Цвета: `neutral` → `bg-neutral text-neutral-content`, `primary` → `bg-primary text-primary-content`, `base` → `bg-base-300 text-base-content`
- Template: DaisyUI avatar markup — `div.avatar.avatar-placeholder > div.rounded-full > span`

### 1.2 Тест

**Новый файл:** `src/app/entities/user/ui/user-avatar/user-avatar.spec.ts`

Тесты (TestBed, без HTTP):
1. Рендерит инициалы из firstName + lastName
2. Default: `w-8` + `bg-neutral text-neutral-content`
3. `size="md"` + `colorScheme="primary"` → `w-12` + `bg-primary text-primary-content`
4. `size="xs"` → `w-7`
5. `colorScheme="base"` → `bg-base-300 text-base-content`

### 1.3 Экспорт

**Изменить:** `src/app/entities/user/index.ts` — добавить `export { UserAvatarComponent } from './ui/user-avatar/user-avatar';`

### 1.4 Заменить avatar в `user-board-card.ts`

**Изменить:** `src/app/widgets/user-board-card/user-board-card.ts`

- Заменить inline avatar div на `<app-user-avatar [firstName]="user().firstName" [lastName]="user().lastName" />`
- Убрать `initials` computed из класса
- Добавить `UserAvatarComponent` в imports

Существующий тест `'shows initials in avatar'` проверяет `'.avatar span'` — продолжит работать благодаря `display: contents`.

### 1.5 Заменить 5 avatar в `org-board-sidebar.html`

**Изменить:** `src/app/widgets/org-board-sidebar/org-board-sidebar.html` + `org-board-sidebar.ts`

| Место | size | colorScheme |
|---|---|---|
| List, on-board (строки 24–28) | default (sm) | default (neutral) |
| List, off-board (строки 43–47) | default (sm) | `"base"` |
| Details, selected user (строки 76–80) | `"md"` | `"primary"` |
| Details, manager (строки 118–122) | `"xs"` | default (neutral) |
| Details, direct reports (строки 147–151) | `"xs"` | default (neutral) |

Добавить `UserAvatarComponent` в imports sidebar-компонента.

### 1.6 Checkpoint

`bun run test` → commit: `refactor(user): extract UserAvatarComponent; replace 5 avatar duplications`

---

## Step 2: [x] Sidebar — internalize `directReports` и `manager`

**Цель:** Убрать implicit contract. Sidebar сам вычисляет derived data из `users` + `selectedUser`.

### 2.1 Sidebar: заменить inputs на computed

**Изменить:** `src/app/widgets/org-board-sidebar/org-board-sidebar.ts`

Удалить:
```ts
readonly directReports = input<User[]>([]);
readonly manager = input<User | null>(null);
```

Добавить computed:
```ts
protected readonly directReports = computed(() => {
  const user = this.selectedUser();
  if (!user) return [];
  return this.users().filter(u => u.managerId === user.id);
});

protected readonly manager = computed(() => {
  const user = this.selectedUser();
  if (!user?.managerId) return null;
  return this.users().find(u => u.id === user.managerId) ?? null;
});
```

### 2.2 Page: убрать биндинги и computeds

**Изменить:** `src/app/pages/org-board/org-board.html` — удалить `[directReports]="directReports()"` и `[manager]="manager()"` из `<app-org-board-sidebar>`

**Изменить:** `src/app/pages/org-board/org-board.ts` — удалить computeds `directReports` (строки 101–104) и `manager` (строки 106–109). Убрать `getDirectReports` из import.

### 2.3 Обновить тесты sidebar

**Изменить:** `src/app/widgets/org-board-sidebar/org-board-sidebar.spec.ts`

- Убрать `setInput('directReports', ...)` и `setInput('manager', ...)` из helper `create()` и из details-mode `beforeEach`
- Добавить в `mockUsers` пользователя-менеджера (id `'0'`) с корректными `managerId` связями, чтобы sidebar мог вычислить manager/directReports самостоятельно
- Details-mode тесты (`'shows manager name'`, `'shows direct reports'`) должны пройти без внешних inputs

### 2.4 Checkpoint

`bun run test` → commit: `refactor(org-board-sidebar): internalize directReports/manager computeds`

---

## Step 3: [x] Извлечь board-view pure functions

**Цель:** Вынести логику computed-маппинга из page в тестируемые pure functions.

### 3.1 Создать pure functions

**Новый файл:** `src/app/features/org-board/lib/board-view.ts`

Функции (все pure, принимают данные — не store instances):

```
computeBoardNodes(positions: BoardPosition[], userMap: Record<string, User>, deptMap: Record<string, { icon?: string }>): BoardNode[]
computeBoardEdges(users: User[], onBoardUserIds: Set<string>): BoardEdge[]
computeValidTargets(users: User[], onBoardUserIds: Set<string>): Map<string, string[]>
computeHighlightedUserIds(selectedUserId: string | null, users: User[]): Set<string>
```

Импортируют `getAncestors`, `getSubtree` из `@entities/user` — разрешённый import (features → entities).

### 3.2 Unit-тесты

**Новый файл:** `src/app/features/org-board/lib/board-view.unit.spec.ts`

Чистые Vitest тесты (без TestBed):

**`computeBoardNodes`:** создаёт nodes только для users с позицией; включает departmentIcon; пустой при пустых positions
**`computeBoardEdges`:** создаёт edges только если оба (manager + subordinate) on board; формат id `edge-X-Y`, outputId `out-X`, inputId `in-Y`
**`computeValidTargets`:** исключает self; исключает ancestors (cycle prevention); включает non-ancestors
**`computeHighlightedUserIds`:** selected + потомки; пустой Set при null

### 3.3 Экспорт

**Изменить:** `src/app/features/org-board/index.ts` — добавить экспорты всех 4 функций.

### 3.4 Рефакторить page computeds

**Изменить:** `src/app/pages/org-board/org-board.ts`

Заменить тела computed на однострочные вызовы:
```ts
protected readonly nodes = computed(() =>
  computeBoardNodes(this.boardStore.entities(), this.usersStore.entityMap(), this.deptStore.entityMap()));

protected readonly edges = computed(() =>
  computeBoardEdges(this.usersStore.entities(), this.boardStore.userIdsOnBoard()));

protected readonly validTargetsByUser = computed(() =>
  computeValidTargets(this.usersStore.entities(), this.boardStore.userIdsOnBoard()));

protected readonly highlightedUserIds = computed(() =>
  computeHighlightedUserIds(this.selectedUserId(), this.usersStore.entities()));
```

Обновить imports: добавить functions из `@features/org-board`, убрать `getAncestors`, `getSubtree` из `@entities/user`.

### 3.5 Checkpoint

Все существующие page-тесты для nodes/edges/validTargets/highlight проходят без изменений — computed возвращают те же значения. `bun run test` → commit: `refactor(org-board): extract board-view pure functions with unit tests`

---

## Step 4: [x] `directReportsCount` — заменить hardcoded `0`

**Цель:** Board card показывает реальное количество подчинённых.

### 4.1 Модель

**Изменить:** `src/app/features/org-board/org-board.model.ts` — добавить `directReportsCount: number` в `BoardNode`

### 4.2 Pure function

**Изменить:** `src/app/features/org-board/lib/board-view.ts`

Добавить функцию:
```ts
export function computeDirectReportsCounts(users: User[], onBoardUserIds: Set<string>): Map<string, number>
```

Считает только on-board subordinates у on-board managers.

Расширить `computeBoardNodes` — добавить optional параметр `directReportsCounts?: Map<string, number>`, использовать при маппинге: `directReportsCount: directReportsCounts?.get(pos.userId) ?? 0`.

Экспортировать `computeDirectReportsCounts` из barrel.

### 4.3 Page

**Изменить:** `src/app/pages/org-board/org-board.ts`

Добавить private computed `directReportsCounts`, передать в `computeBoardNodes`.

### 4.4 Canvas template

**Изменить:** `src/app/widgets/org-board-canvas/org-board-canvas.html`

Строка 55: `[directReportsCount]="0"` → `[directReportsCount]="node.directReportsCount"`

### 4.5 Тесты

- **board-view.unit.spec.ts** — тесты для `computeDirectReportsCounts` + проверка поля в `computeBoardNodes`
- **org-board-canvas.spec.ts** — добавить `directReportsCount: 0` в `mockNodes` (required field)
- **org-board.spec.ts** — добавить assertion: node с подчинёнными имеет `directReportsCount > 0`

### 4.6 Checkpoint

`bun run test` → commit: `feat(org-board): compute directReportsCount per node; replace hardcoded zero`

---

## Step 5: [x] `autoLayout` — bulk endpoint вместо sequential

**Цель:** Параллельные HTTP-запросы при auto-layout.

### 5.1 Рефакторить метод

**Изменить:** `src/app/pages/org-board/org-board.ts`

Заменить цикл `for...of` + `await` на:
```ts
await Promise.all(
  positions
    .map(pos => {
      const existing = this.boardStore.positionByUserId().get(pos.id);
      return existing ? this.boardStore.updatePosition(existing.id, pos.x, pos.y) : undefined;
    })
    .filter(Boolean),
);
```

### 5.2 Обновить тест

**Изменить:** `src/app/pages/org-board/org-board.spec.ts`

Тест auto-layout: вместо последовательных `expectOne` использовать `httpMock.match(predicate)` для захвата всех PATCH-запросов разом. Проверить количество и body каждого. Flush все разом.

### 5.3 Checkpoint

`bun run test` → commit: `perf(org-board): parallelize autoLayout HTTP with Promise.all`

---

## Step 6: [x] Извлечь `cascadeRemoveFromBoard`

**Цель:** Вынести доменную логику cascade remove из page.

### 6.1 Создать функцию

**Новый файл:** `src/app/features/org-board/lib/cascade-remove.ts`

```ts
interface CascadeRemoveDeps {
  removeFromBoard(positionId: string): Promise<boolean>;
  setManager(userId: string, managerId: string | null): Promise<boolean>;
}

export async function cascadeRemoveFromBoard(
  userId: string,
  position: BoardPosition,
  removedUser: User | undefined,
  allUsers: User[],
  deps: CascadeRemoveDeps,
): Promise<void>
```

Логика: `Promise.all` из removeFromBoard + clear manager (если есть) + cascade reassign subordinates.

### 6.2 Экспорт

**Изменить:** `src/app/features/org-board/index.ts` — добавить экспорт.

### 6.3 Рефакторить page

**Изменить:** `src/app/pages/org-board/org-board.ts`

`onRemoveFromBoard` вызывает `cascadeRemoveFromBoard(...)` + `selectedUserId.set(null)` при необходимости.

### 6.4 Тесты

Существующий page-тест `'onRemoveFromBoard removes position, clears manager, cascade-reassigns'` продолжает тестировать end-to-end. Новый unit-тест опционален.

### 6.5 Checkpoint

`bun run test` → commit: `refactor(org-board): extract cascadeRemoveFromBoard into features/org-board/lib`

---

## Step 7: Извлечь `ReassignConfirmComponent`

**Цель:** Убрать dialog state machine из page.

### 7.1 Модель

**Изменить:** `src/app/features/org-board/org-board.model.ts` — добавить `PendingConnection` interface (переместить из page).

Экспортировать через barrel: `export type { ..., PendingConnection } from './org-board.model';`

### 7.2 Создать компонент

**Новый файл:** `src/app/features/org-board/ui/reassign-confirm/reassign-confirm.ts`

- Input: `pending: PendingConnection | null` (required)
- Output: `confirmed: EventEmitter<PendingConnection>`, `cancelled: EventEmitter<void>`
- Содержит: `ConfirmDialogComponent`, computed `message`, effect для `open()`, viewChild для dialog ref
- Template: `<app-confirm-dialog>` с биндингами

**Ключевое:** при `confirmed` — emit полный `PendingConnection` объект (page использует его для вызова `setManager`).

### 7.3 Экспорт

**Изменить:** `src/app/features/org-board/index.ts`

### 7.4 Рефакторить page

**Изменить:** `src/app/pages/org-board/org-board.ts`

Удалить:
- `reassignMessage` computed
- `confirmDialogRef` viewChild
- constructor с effect
- `PendingConnection` interface (перенесён в model)

Упростить `confirmReassignment(pending: PendingConnection)` — принимает аргумент вместо чтения signal.

Убрать `ConfirmDialogComponent` из imports, добавить `ReassignConfirmComponent`.

Убрать `effect`, `viewChild` из `@angular/core` import (если больше не используются).

**Изменить:** `src/app/pages/org-board/org-board.html`

Заменить `<app-confirm-dialog>` блок (строки 74–81) на:
```html
<app-reassign-confirm
  [pending]="pendingConnection()"
  (confirmed)="confirmReassignment($event)"
  (cancelled)="cancelReassignment()"
/>
```

### 7.5 Тесты

**Новый файл:** `src/app/features/org-board/ui/reassign-confirm/reassign-confirm.spec.ts`

1. Не показывает ничего при `pending = null`
2. Показывает correct message при `pending` set
3. Emit `confirmed` с PendingConnection при confirm click
4. Emit `cancelled` при cancel click

**Изменить:** `src/app/pages/org-board/org-board.spec.ts` — тест `confirmReassignment` передаёт `PendingConnection` как аргумент.

### 7.6 Checkpoint

`bun run test` → commit: `refactor(org-board): extract ReassignConfirmComponent; simplify page`

---

## Step 8: Minor — naming + comment

### 8.1 `_dragging` → `isDragging`

**Изменить:** `src/app/widgets/org-board-canvas/org-board-canvas.ts` — rename `_dragging` → `private isDragging = false`, обновить все 3 ссылки.

### 8.2 JSDoc на `onConnectionReassigned`

Добавить комментарий:
```ts
/** Handles disconnect only (drag to void). If Foblex emits reassign to new target, handle here. */
```

### 8.3 Checkpoint

`bun run test` → commit: `chore(org-board): naming fixes and clarifying comments`

---

## Итоговое состояние page после всех шагов

~130–140 строк (было 239). Остаются:
- Store injection + `ngOnInit` — загрузка данных
- Thin computed wrappers — однострочные вызовы pure functions
- `selectedUserId` signal + `selectedUser` computed
- `pendingConnection` signal
- Event handlers — делегируют в stores
- `autoLayout` с `Promise.all`
- `loading`/`error` combined computeds

Все — page-level coordination. Exactly right for FSD.

---

## Новые файлы (итого)

| Файл | Тип |
|---|---|
| `src/app/entities/user/ui/user-avatar/user-avatar.ts` | component |
| `src/app/entities/user/ui/user-avatar/user-avatar.spec.ts` | test |
| `src/app/features/org-board/lib/board-view.ts` | pure functions |
| `src/app/features/org-board/lib/board-view.unit.spec.ts` | unit test |
| `src/app/features/org-board/lib/cascade-remove.ts` | pure function |
| `src/app/features/org-board/ui/reassign-confirm/reassign-confirm.ts` | component |
| `src/app/features/org-board/ui/reassign-confirm/reassign-confirm.spec.ts` | test |

## Verification

После каждого шага: `bun run test` — все тесты зелёные.
После всех шагов: ручная проверка в браузере — drag & drop, connections, auto-layout, reassignment dialog, sidebar details mode.
