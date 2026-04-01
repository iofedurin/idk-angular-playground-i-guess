# ADR 0011 — Feature store для UI-специфичного состояния

**Статус:** Принято
**Дата:** 2026-04-01

---

## Контекст

При создании Org Board нужно было хранить **позиции карточек на канвасе** (`BoardPosition: { id, userId, x, y }`). Позиции персистируются в backend (`/api/board-positions`), имеют CRUD, сбрасываются при смене workspace.

Вопрос: где в FSD-структуре должен жить store для этих данных?

Два кандидата:

1. **`entities/board-position/`** — по аналогии с `entities/country/`, `entities/department/`
2. **`features/org-board/`** — как часть feature, а не самостоятельная entity

## Решение

Store живёт в **`features/org-board/`**, а не в `entities/`.

```
features/org-board/
  org-board.model.ts      ← BoardPosition, BoardNode, BoardEdge, PendingConnection
  org-board.api.ts        ← HTTP CRUD для /api/board-positions
  org-board.store.ts      ← withEntities<BoardPosition>() + withAppScoped()
  lib/
    board-view.ts         ← pure functions для computed-маппинга
    cascade-remove.ts     ← cascade-логика удаления
  ui/
    reassign-confirm/     ← UI-компонент подтверждения
  index.ts                ← barrel
```

### Структура стора

```ts
export const OrgBoardStore = signalStore(
  { providedIn: 'root' },
  withEntities<BoardPosition>(),
  withState<{ loading: boolean; error: string | null }>({ loading: false, error: null }),
  withComputed(({ entities }) => ({
    positionByUserId: computed(() => { /* Map<string, BoardPosition> */ }),
    userIdsOnBoard: computed(() => new Set(entities().map(p => p.userId))),
  })),
  withMethods((store, api = inject(OrgBoardApi)) => ({
    async loadPositions() { /* кэш + lastValueFrom */ },
    async addToBoard(userId, x, y) { /* httpMutation + addEntity */ },
    async updatePosition(positionId, x, y) { /* httpMutation + updateEntity */ },
    async removeFromBoard(positionId) { /* httpMutation + removeEntity */ },
    async bulkUpdatePositions(updates) { /* httpMutation + updateEntity loop */ },
    reset() { /* setAllEntities([]) */ },
  })),
  withAppScoped(),
);
```

Паттерн идентичен entity-сторам (ADR 0001): `Api` + `Store`, `lastValueFrom`, `httpMutation` (ADR 0010), `withAppScoped()` для reset при смене workspace. Единственное отличие — размещение в `features/`, а не в `entities/`.

## Decision tree: entities/ vs features/ для store

```
Данные представляют самостоятельный бизнес-домен?
  │
  ├─ ДА → Используются ≥2 разными features/pages?
  │         ├─ ДА  → entities/<name>/     (User, Country, Department)
  │         └─ НЕТ → entities/<name>/     (всё равно entity — другие features могут появиться)
  │
  └─ НЕТ → Данные — UI/presentation state, привязанный к конкретному use case?
            ├─ ДА  → features/<use-case>/  (BoardPosition, ActivityFeedEvent)
            └─ НЕТ → пересмотреть — возможно, это entity
```

**Ключевой вопрос:** «Имеет ли смысл `BoardPosition` без Org Board?»

- `User` без Org Board — да, пользователи существуют на всех страницах
- `Country` без формы — да, справочник не привязан к одному use case
- `BoardPosition` без Org Board — **нет**, координаты на канвасе бессмысленны вне конкретной визуализации

Если данные не имеют самостоятельного бизнес-смысла — это UI state конкретной feature.

## Причины

**1. Семантика FSD: entity = доменный объект**
`entities/` содержит объекты, имеющие бизнес-смысл: User (сотрудник), Department (отдел), Country (страна). `BoardPosition` — техническая запись о визуальном расположении. Размещение в `entities/` размывает семантику слоя.

**2. Кросс-слайс зависимости не нужны**
`OrgBoardStore` использует `withEntities<BoardPosition>()` — это implementation detail Org Board, не контракт для других features. Никакой другой feature не импортирует `BoardPosition`. В `entities/` объект доступен всем — создаётся ложное ожидание переиспользуемости.

**3. Прецедент: `features/activity-feed/`**
`ActivityFeedStore` — аналогичный случай: имеет state (events, unreadCount), модель (`ActivityEvent`), но не является доменной entity (нет CRUD, нет backend persistence). Оба feature-стора следуют одному паттерну: `providedIn: 'root'` + feature-specific state.

**4. Весь org-board API — внутренняя деталь**
`OrgBoardApi` вызывается только из `OrgBoardStore`. Если бы api жил в `entities/board-position/`, а store — в `features/org-board/`, получился бы искусственный split: api в одном слое, единственный его потребитель — в другом.

**5. `withAppScoped()` работает одинаково**
`withAppScoped()` + `AppScopeRegistry` не зависят от слоя размещения. Store в `features/` сбрасывается при `appSwitchGuard → registry.resetAll()` точно так же, как entity-store.

## Последствия

- Feature может содержать полный набор: `model.ts`, `api.ts`, `store.ts`, `lib/`, `ui/`, `index.ts`
- Barrel export feature включает типы, store, pure functions и UI-компоненты
- При появлении второго потребителя `BoardPosition` (например, dashboard widget) — пересмотреть: возможно, данные стали entity
- Store-тесты feature-стора идентичны по паттерну entity-store тестам (ADR 0003)

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| `entities/board-position/` | Ложная семантика: `BoardPosition` не имеет бизнес-смысла без Org Board. Создаёт ожидание переиспользуемости, которой нет |
| Store на странице (не `providedIn: 'root'`) | Не переживает навигацию внутри feature. `providedIn: 'root'` + `withAppScoped()` — единообразный lifecycle |
| Данные только в `localStorage` без backend | Не персистируются между устройствами, не подхватываются WebSocket broadcast |
| Inline state в page component (без store) | Нарушает паттерн: все HTTP-операции проходят через store (ADR 0001, 0007). Page вызывает store-методы, не api напрямую |
