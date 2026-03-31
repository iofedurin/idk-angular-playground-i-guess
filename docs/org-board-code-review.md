# Code Review: Org-Board Feature

**Дата:** 2026-03-31
**Scope:** `pages/org-board`, `widgets/org-board-canvas`, `widgets/org-board-sidebar`, `widgets/user-board-card`, `features/org-board`, `shared/lib/graph`, `entities/user/lib/hierarchy`

---

## Общая оценка

Фича реализована **хорошо**: чёткое FSD-разделение, store следует установленным паттернам (`httpMutation`, `withAppScoped`, `withEntities`), чистые функции (`hierarchy.ts`, `tree-layout.ts`) вынесены и покрыты unit-тестами. Ниже — конкретные точки, которые можно улучшить.

---

## 1. OrgBoardPage — слишком много ответственностей (God Page)

**Файл:** `pages/org-board/org-board.ts` (239 строк)

Страница совмещает роли:

| Ответственность | Строки |
|---|---|
| Computed-маппинг BoardPosition → BoardNode (join 3 stores) | 46–63 |
| Computed-маппинг edges (join users + board positions) | 65–76 |
| Cycle-prevention (validTargetsByUser) | 78–92 |
| Highlight subtree | 119–124 |
| Selected user + derived details (manager, reports) | 94–109 |
| Reassignment dialog state machine (pending, confirm, cancel) | 10–16, 29–44, 132–165 |
| Cascade remove-from-board logic | 215–238 |
| Auto-layout orchestration | 200–213 |

Это **8 логически независимых блоков** в одном классе. Страница перестала быть «тонким координатором» — она стала orchestrator + state machine + data mapper одновременно.

### Что можно сделать

**a) Вынести computed-маппинг nodes/edges/validTargets в OrgBoardStore**

`nodes`, `edges` и `validTargetsByUser` — это **derived state**, вычисляемый из двух сторов. Сейчас этот join живёт на странице, но семантически это ответственность store-слоя. Стор знает о board positions, а user entities доступны через inject. Перенос в `withComputed` уберёт ~50 строк из page и сделает derived data переиспользуемым (если завтра появится dashboard-виджет с мини-картой борда).

**b) Вынести reassignment dialog state machine**

`PendingConnection` + `pendingConnection` signal + `confirmReassignment` + `cancelReassignment` + effect для `open()` — это замкнутая state machine. Она может жить в отдельном сервисе/хелпере или в feature-компоненте `ReassignmentConfirmation`, который принимает `@Output confirmed/cancelled` и инкапсулирует dialog + pending state.

**c) Вынести cascade-логику removeFromBoard**

`onRemoveFromBoard` (строки 215–238) содержит нетривиальную бизнес-логику: cascade reassignment подчинённых + параллельные мутации. Это не UI-координация — это доменная операция. Кандидат на метод в `OrgBoardStore` или отдельную feature `org-board-remove`.

---

## 2. `autoLayout()` — sequential HTTP в цикле

**Файл:** `pages/org-board/org-board.ts`, строки 200–213

```ts
for (const pos of positions) {
  const existing = this.boardStore.positionByUserId().get(pos.id);
  if (existing) {
    await this.boardStore.updatePosition(existing.id, pos.x, pos.y);
  }
}
```

Каждый `updatePosition` — это отдельный HTTP PATCH + `await`. При 20 нодах на борде это 20 последовательных запросов. Помимо медленности, пользователь видит, как ноды перемещаются по одной.

### Что можно сделать

Добавить bulk-метод `updatePositions(patches: { id, x, y }[])` в API и store. Один HTTP-запрос вместо N. Если backend не поддерживает bulk — хотя бы `Promise.all()` вместо sequential `await`.

---

## 3. `[directReportsCount]="0"` — hardcoded zero

**Файл:** `widgets/org-board-canvas/org-board-canvas.html`, строка 55

```html
<app-user-board-card
  [directReportsCount]="0"
  ...
/>
```

`UserBoardCardComponent` имеет input `directReportsCount` с badge "N reports", но canvas всегда передаёт `0`. Input существует, компонент его рендерит, но данные не вычисляются. Это либо забытая интеграция, либо input нужно убрать из card (YAGNI).

### Что можно сделать

Если badge нужен — вычислить count в `nodes` computed (данные для этого есть). Если не нужен — убрать input из `UserBoardCardComponent` чтобы не вводить в заблуждение.

---

## 4. Дублирование avatar-шаблона (×5)

Avatar с инициалами рендерится в **5 местах**:

1. `user-board-card.ts` — inline template (card на canvas)
2. `org-board-sidebar.html` — list mode, on-board user (строка 24–28)
3. `org-board-sidebar.html` — list mode, off-board user (строка 43–47)
4. `org-board-sidebar.html` — details mode, selected user (строка 76–80)
5. `org-board-sidebar.html` — details mode, manager / direct reports (строки 118–122, 147–151)

Каждый раз повторяется: `avatar avatar-placeholder` > `bg-<color> text-<color>-content w-<size> rounded-full` > `<span>{{ firstName[0] }}{{ lastName[0] }}</span>`. Отличаются только размер и цвет.

### Что можно сделать

Вынести `UserAvatarComponent` в `entities/user/ui/` (или `shared/ui/`). Input: `user`, `size` (`'sm' | 'md' | 'lg'`), опциональный `colorScheme`. Это уберёт дублирование и даст единое место для будущих изменений (например, фото вместо инициалов).

---

## 5. Sidebar details mode — implicit contract с page

**Файл:** `widgets/org-board-sidebar/org-board-sidebar.ts`

Sidebar принимает 5 inputs для details mode:

```ts
selectedUser = input<User | null>(null);
directReports = input<User[]>([]);
manager = input<User | null>(null);
```

Page **вычисляет** `directReports` и `manager` и **прокидывает** их вниз. Sidebar не знает, что `directReports` привязан к `selectedUser` — это implicit contract. Если page забудет обновить один из signals при смене selection — UI рассинхронизируется.

### Что можно сделать

Два варианта:

**a)** Sidebar сам вычисляет `directReports` и `manager` из `selectedUser` + `users`. Убирает 2 inputs, делает контракт явным. Sidebar уже получает `users` — данных достаточно.

**b)** Объединить в один input-объект `selectedUserDetails: { user, manager, directReports } | null`. Атомарное обновление — невозможно рассинхронизировать.

---

## 6. Canvas template — inline SVG icons (×6)

**Файл:** `widgets/org-board-canvas/org-board-canvas.html` (toolbar) + `pages/org-board/org-board.html` (auto-layout button)

6 inline SVG-иконок (zoom-in, zoom-out, fit, step, bezier, auto-layout) захардкожены прямо в шаблонах. Каждая — 3–5 строк SVG. Toolbar занимает ~50 строк чистого SVG.

### Что можно сделать

Проект уже использует `airy-icons` (CSS-класс `airy-<name>`). Если подходящие иконки есть — заменить. Если нет — вынести SVG в отдельные компоненты или использовать `<svg><use href="...">` через sprite. Это сократит шаблон и сделает иконки переиспользуемыми.

---

## 7. `onConnectionReassigned` — обрабатывает только один кейс

**Файл:** `widgets/org-board-canvas/org-board-canvas.ts`, строки 94–99

```ts
protected onConnectionReassigned(event: FReassignConnectionEvent): void {
  if (event.endpoint === 'target' && event.nextTargetId == null) {
    const subordinateId = event.previousTargetId.replace('in-', '');
    this.connectionRemoved.emit({ subordinateId });
  }
}
```

`FReassignConnectionEvent` может описывать разные сценарии (смена target, смена source, reassign to new target). Компонент обрабатывает только «target disconnected» (drop into void). Если Foblex позволяет drag edge на другой input — это будет reassign, и текущий код его проигнорирует.

### Что можно сделать

Если reassign через drag поддерживается — добавить обработку `event.nextTargetId != null` (emit `connectionCreated` с новым target). Если не поддерживается — добавить комментарий, объясняющий scope.

---

## 8. `getAncestors` / `getDirectReports` / `getSubtree` — O(n) на каждый вызов

**Файл:** `entities/user/lib/hierarchy.ts`

Каждая функция пробегает по массиву `users` (или строит `Map` заново). `validTargetsByUser` вызывает `getAncestors` **для каждого** on-board user. При 50 users × 30 on-board — это 30 вызовов `getAncestors`, каждый из которых строит `Map(users)`.

В текущем масштабе (playground, десятки users) — не проблема. Но при росте это станет bottleneck.

### Что можно сделать

Предвычислять `userMap = new Map(users.map(u => [u.id, u]))` один раз в computed на странице (или в store) и передавать в функции как аргумент. Или рефакторить hierarchy-функции на приём `Map<string, User>` вместо `User[]`.

---

## 9. Connection marker (arrow) — дублирование SVG

**Файл:** `widgets/org-board-canvas/org-board-canvas.html`

Одинаковый SVG marker для стрелки определён **дважды**: один раз в `<f-connection-for-create>` (строки 27–32) и один раз внутри каждого `<f-connection>` через `@for` (строки 85–90). Это идентичный код — `<polyline points="0,0 12,4 0,8" stroke="#6366f1">`.

### Что можно сделать

Если Foblex позволяет задать marker один раз через `<svg><defs>` — использовать shared `<marker>` definition. Если нет — вынести в отдельный компонент `ConnectionArrowMarker` (inline template, `display: contents`).

---

## 10. Minor: naming

| Место | Текущее | Предложение | Почему |
|---|---|---|---|
| `org-board-canvas.ts:62` | `_dragging` | `isDragging` | Underscore prefix — не идиоматичный Angular. `private` + camelCase достаточно |
| `org-board-canvas.ts:87` | `onConnectionCreated` | `onConnectionCreate` | Event handler для `fCreateConnection` — событие ещё не «created», а «requested». Отличие от output `connectionCreated` (факт) |
| `org-board.ts:222` | `clearPromises` | `cascadePromises` | Переменная содержит cascade-операции, не «clearing» |

---

## Резюме приоритетов

| # | Находка | Серьёзность | Усилие |
|---|---|---|---|
| 1 | God Page — 8 ответственностей | Высокая | Среднее |
| 2 | autoLayout sequential HTTP | Средняя | Низкое |
| 3 | directReportsCount hardcoded 0 | Низкая | Низкое |
| 4 | Avatar дублирование ×5 | Средняя | Низкое |
| 5 | Sidebar implicit contract | Средняя | Низкое |
| 6 | Inline SVG icons | Низкая | Низкое |
| 7 | onConnectionReassigned partial | Средняя | Низкое |
| 8 | hierarchy O(n) per call | Низкая | Низкое |
| 9 | Connection marker дублирование | Низкая | Низкое |
| 10 | Naming nits | Низкая | Низкое |

**Рекомендуемый порядок**: 1 → 4 → 5 → 2 → 3 → 7 → остальное.
