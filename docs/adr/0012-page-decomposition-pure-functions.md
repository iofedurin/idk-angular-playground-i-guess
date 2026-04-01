# ADR 0012 — Page decomposition: pure functions с явными зависимостями

**Статус:** Принято
**Дата:** 2026-04-01

---

## Контекст

`OrgBoardPage` координирует три store (`UsersStore`, `OrgBoardStore`, `DepartmentStore`), содержит 5+ computed-маппингов и несколько async-операций с каскадной логикой. До рефакторинга — 239 строк, 8 ответственностей. Страница объединяла доменную логику (вычисление edges, cycle prevention, cascade reassignment) с page-level coordination (загрузка данных, роутинг, UI state).

Вопрос: **как** декомпозировать page, сохранив FSD-принцип «page = координатор»?

Варианты:
1. **Pure functions** — принимают данные, возвращают результат. Без DI, без side-effects
2. **Injectable service** — `inject()` stores внутри, методы вызываются со страницы
3. **Дополнительный store** — feature store для page-level computed state
4. **Оставить inline** — page остаётся большим, но единообразным

## Решение

Два типа извлечения — **pure functions для computed** и **async functions с deps interface** для операций.

### Тип 1: Pure functions для computed-маппинга

Файл: `features/org-board/lib/board-view.ts`

```ts
// Принимают данные (не store instances), возвращают результат
export function computeBoardNodes(
  positions: BoardPosition[],
  userMap: Record<string, User>,
  deptMap: Record<string, { icon?: string }>,
  directReportsCounts?: Map<string, number>,
): BoardNode[] { ... }

export function computeBoardEdges(
  users: User[],
  onBoardUserIds: Set<string>,
): BoardEdge[] { ... }

export function computeValidTargets(
  users: User[],
  onBoardUserIds: Set<string>,
): Map<string, string[]> { ... }

export function computeHighlightedUserIds(
  selectedUserId: string | null,
  users: User[],
): Set<string> { ... }
```

Page computed сводится к однострочному вызову:

```ts
// ДО: 10+ строк inline-логики в каждом computed
protected readonly nodes = computed(() => {
  const positions = this.boardStore.entities();
  return positions.map(pos => {
    const user = this.usersStore.entityMap()[pos.userId];
    if (!user) return null;
    return { userId: pos.userId, user, x: pos.x, y: pos.y, ... };
  }).filter(Boolean);
});

// ПОСЛЕ: single-line delegation
protected readonly nodes = computed<BoardNode[]>(() =>
  computeBoardNodes(
    this.boardStore.entities(),
    this.usersStore.entityMap(),
    this.deptStore.entityMap(),
    this.directReportsCounts(),
  ),
);
```

### Тип 2: Async functions с deps interface для операций

Файл: `features/org-board/lib/cascade-remove.ts`

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
): Promise<void> {
  const newManagerId = removedUser?.managerId ?? null;
  const promises: Promise<unknown>[] = [deps.removeFromBoard(position.id)];

  if (removedUser?.managerId) {
    promises.push(deps.setManager(userId, null));
  }
  for (const u of allUsers) {
    if (u.managerId === userId) {
      promises.push(deps.setManager(u.id, newManagerId));
    }
  }

  await Promise.all(promises);
}
```

Page вызывает, передавая store-методы как deps:

```ts
protected async onRemoveFromBoard(userId: string): Promise<void> {
  const pos = this.boardStore.positionByUserId().get(userId);
  if (!pos) return;

  await cascadeRemoveFromBoard(userId, pos, this.usersStore.entityMap()[userId], this.usersStore.entities(), {
    removeFromBoard: (id) => this.boardStore.removeFromBoard(id),
    setManager: (uid, managerId) => this.usersStore.setManager(uid, managerId),
  });

  if (this.selectedUserId() === userId) this.selectedUserId.set(null);
}
```

### Тип 3: Extracted UI component для dialog state machine

`ReassignConfirmComponent` — пример третьего типа: не pure function, а **компонент**, извлечённый из page. Инкапсулирует `effect()` + `viewChild` + `ConfirmDialogComponent`. Page передаёт `[pending]` signal и получает `(confirmed)` / `(cancelled)` events.

### Размещение

```
features/org-board/
  lib/
    board-view.ts          ← pure functions (computed-маппинг)
    board-view.unit.spec.ts← unit-тесты без TestBed
    cascade-remove.ts      ← async function с deps interface
  ui/
    reassign-confirm/      ← extracted component
```

`lib/` — для чистых функций и async-логики без Angular-зависимостей.
`ui/` — для компонентов с Angular DI и template.

## Decision tree: когда извлекать из page

```
Computed или метод на странице...

1. Содержит ≥5 строк чистой трансформации данных?
   └─ ДА → Pure function в lib/
          (принимает данные, не store; тестируется без TestBed)

2. Содержит async-логику, координирующую ≥2 store-вызова?
   └─ ДА → Async function с deps interface в lib/
          (deps = interface с методами; page передаёт store-методы)

3. Управляет DOM API (dialog, focus) через effect/viewChild?
   └─ ДА → Отдельный component в ui/
          (инкапсулирует effect + viewChild + template)

4. Однострочная делегация в store?
   └─ НЕТ, не извлекать — page-level coordination:
      protected async onConnectionRemoved(event) {
        await this.usersStore.setManager(event.subordinateId, null);
      }
```

## Причины

**1. Тестируемость без TestBed**
Pure functions тестируются plain Vitest: `expect(computeBoardEdges(users, onBoard)).toHaveLength(2)`. Без `TestBed.configureTestingModule`, без `HttpTestingController`, без `fixture.detectChanges()`. Тесты запускаются мгновенно (2ms vs 400ms+ для TestBed).

В проекте это 19 unit-тестов в `board-view.unit.spec.ts` — покрывают edge cases (пустые данные, cycle prevention, подсчёт direct reports), которые сложно воспроизвести через page component test.

**2. Deps interface вместо `inject()` — явные зависимости**
`CascadeRemoveDeps` декларирует ровно 2 операции: `removeFromBoard` и `setManager`. Функция не знает о `OrgBoardStore`, `UsersStore` или Angular DI. Это делает невозможным неявное расширение зависимостей. Если функции нужна новая операция — deps interface расширяется явно, и все call sites обновляются.

Сравнение с injectable service:
```ts
// Service: зависимости неявны, любой метод store доступен
@Injectable()
class CascadeRemoveService {
  private board = inject(OrgBoardStore);  // доступен весь API store
  private users = inject(UsersStore);     // доступен весь API store
}

// Deps interface: зависимости явны, только нужные методы
interface CascadeRemoveDeps {
  removeFromBoard(positionId: string): Promise<boolean>;
  setManager(userId: string, managerId: string | null): Promise<boolean>;
}
```

**3. Page остаётся координатором**
После рефакторинга page (208 → 185 строк) содержит только:
- Store injection + `ngOnInit` — загрузка данных
- Однострочные computed — делегация в pure functions
- Event handlers — делегация в stores и extracted functions
- `selectedUserId` + `pendingConnection` — UI state

Это ровно то, что должна делать FSD page: координировать stores, widgets и features.

**4. Файлы в `lib/` feature, не в `shared/`**
`board-view.ts` использует типы `BoardNode`, `BoardEdge`, `BoardPosition` из `org-board.model.ts` — это feature-specific. В `shared/` живут только generic утилиты (например, `computeTreeLayout` в `shared/lib/graph/`).

## Последствия

- Новые computed на странице: сначала написать pure function с тестом, потом обернуть в `computed()` на странице
- Новые cascade-операции: определить deps interface, написать async function, page передаёт store-методы
- Unit spec файлы именуются `*.unit.spec.ts` для отделения от TestBed-тестов (конвенция проекта)
- Page-тесты (`org-board.spec.ts`) продолжают тестировать end-to-end через store + HTTP mock — pure function тесты дополняют, а не заменяют

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| Injectable service с `inject()` | Скрывает зависимости за DI; тестирование требует TestBed + mock. Для pure-логики — over-engineering |
| Feature store для computed state | Store без HTTP и без state mutation — бессмысленная обёртка. `computed()` на странице достаточно |
| Оставить inline на странице | 239 строк, 8 ответственностей. Computed содержат нетривиальную логику (cycle prevention, cascade). Unit-тестирование невозможно без page fixture |
| Извлечь в `entities/user/lib/` | `computeBoardNodes` зависит от `BoardPosition`, `BoardNode` — типов из `features/org-board`. Entity не может импортировать feature (FSD rule). Hierarchy functions (`getAncestors`, `getSubtree`) корректно живут в entity, но board-specific маппинг — нет |
| `rxMethod` / pipe-based decomposition | Нарушает signal-first паттерн (ADR 0007). Все CRUD — async/await, computed — синхронные. RxJS operators для synchronous data transformation — семантически неверно |
