# ADR 0013 — Directive-based canvas: @foblex/flow в FSD-архитектуре

**Статус:** Принято
**Дата:** 2026-04-01

---

## Контекст

Для Org Board нужна интерактивная канвас-библиотека с тремя типами drag & drop:

1. **Free-form node drag** — перетаскивание карточек по канвасу
2. **Connection creation** — drag от output к input для создания manager→subordinate связи
3. **External drop** — drag из sidebar-списка на канвас для добавления пользователя

Дополнительные требования:
- Pan/zoom канваса
- SVG-связи между нодами
- Декларативная валидация соединений (cycle prevention)
- Zoneless-совместимость (Angular 21+, без zone.js)
- Совместимость с FSD: ноды = Angular-компоненты со своими inputs/outputs/DI

## Решение

**`@foblex/flow` v18+** — Angular-native библиотека с directive-based API.

### Ключевое архитектурное свойство: directives, не components

Foblex использует **directives на реальных DOM-элементах**, а не wrapper-компоненты:

```html
<!-- fNode, fDragHandle — directives на <div> -->
<div fNode fDragHandle [fNodePosition]="{ x: node.x, y: node.y }">

  <!-- fNodeInput — directive на <div> для drop-зоны -->
  <div fNodeInput [fInputId]="'in-' + node.userId"></div>

  <!-- Обычный Angular-компонент внутри fNode -->
  <app-user-board-card
    [user]="node.user"
    [selected]="selectedUserId() === node.userId"
    (click)="onNodeClick(node.userId)"
  />

  <!-- fNodeOutput — directive на <div> для drag-точки -->
  <div fNodeOutput [fOutputId]="'out-' + node.userId"
       [fCanBeConnectedInputs]="validTargetsByUser().get(node.userId) ?? []">
  </div>
</div>
```

Следствие: `UserBoardCardComponent` — обычный Angular standalone component. Полный доступ к DI (`inject()`), signal inputs, outputs, `ChangeDetectionStrategy.OnPush`. Foblex не оборачивает его — карточка не знает о canvas-библиотеке.

### FSD-маппинг

```
pages/org-board/
  org-board.ts            ← координатор: stores + event handlers + data loading
  org-board.html          ← layout: aside (sidebar) + main (canvas) + dialog

widgets/org-board-canvas/
  org-board-canvas.ts     ← Foblex directives: fFlow, fCanvas, fNode, fConnection
  org-board-canvas.html   ← template с @for nodes/edges
  org-board-curve-builder.ts ← custom connection path builder

widgets/org-board-sidebar/
  org-board-sidebar.ts    ← list + details + fExternalItem directives
  org-board-sidebar.html  ← template с fExternalItem для drag-to-canvas

widgets/user-board-card/
  user-board-card.ts      ← чистый presentational component, без Foblex-зависимостей

features/org-board/
  org-board.store.ts      ← state: BoardPosition[] + CRUD
  lib/board-view.ts       ← pure functions: nodes, edges, validTargets, highlights

entities/user/
  user.store.ts           ← hierarchy: setManager(), managerId
  lib/hierarchy.ts        ← pure functions: getAncestors(), getSubtree()
```

**Принцип разделения:**
- **Page** не знает о Foblex API — получает domain events (`connectionCreated`, `nodeClicked`, `externalDrop`)
- **Canvas widget** знает о Foblex — транслирует Foblex events (`FCreateConnectionEvent`, `FReassignConnectionEvent`) в domain events
- **Card widget** не знает ни о Foblex, ни о canvas — чистый presentational component
- **Sidebar widget** знает о `fExternalItem` directive — это единственная точка связи sidebar с canvas

### Три ключевых паттерна интеграции

#### 1. `fCanBeConnectedInputs` — декларативная валидация

```html
<div fNodeOutput [fOutputId]="'out-' + node.userId"
     [fCanBeConnectedInputs]="validTargetsByUser().get(node.userId) ?? []">
```

Foblex принимает массив допустимых input ID. Библиотека блокирует невалидные соединения на уровне UX (cursor, snap). Массив вычисляется pure function `computeValidTargets()` — cycle prevention через `getAncestors()`.

Альтернатива (callback-based validation) потребовала бы императивной логики внутри canvas widget.

#### 2. `fExternalItem [fData]` — external drag с типизацией

```html
<!-- sidebar: li с fExternalItem directive -->
<li fExternalItem [fData]="user.id" class="cursor-grab">...</li>

<!-- canvas: fCreateNode event -->
<f-flow (fCreateNode)="onExternalDrop($event)">
```

`FCreateNodeEvent<string>` — generic, `fData` типизирован. `event.externalItemRect` содержит **canvas-local координаты** — не нужна ручная конвертация screen→canvas.

Sidebar и Canvas — разные widgets. Связь между ними: Foblex internal messaging через `FFlowModule`. Оба widget импортируют `FFlowModule`, sidebar помечает элементы как `fExternalItem`, canvas ловит `fCreateNode`.

#### 3. `F_CONNECTION_BUILDERS` — custom curve provider

```ts
// org-board-curve-builder.ts
export const ORG_BOARD_CURVE_BUILDER = {
  provide: F_CONNECTION_BUILDERS,
  useValue: { 'org-board-curve': new OrgBoardStepBuilder() },
};

// canvas component
@Component({
  providers: [ORG_BOARD_CURVE_BUILDER], // Angular DI injection
  template: `<f-connection [fType]="connectionMode()" ...>`
})
```

Custom curve builder регистрируется через Angular DI (`providers`). Canvas переключает `connectionMode` signal между `'org-board-curve'` и `'bezier'`. Это демонстрирует, как Foblex использует Angular DI для extensibility.

### Drag vs Click disambiguation

Foblex `fDragHandle` перехватывает mousedown → mousemove, но click event всё равно срабатывает после mouseup. Решение:

```ts
private isDragging = false;

protected onDragStarted(): void { this.isDragging = true; }
protected onDragEnded(): void {
  // Reset AFTER click (click fires synchronously after mouseup)
  setTimeout(() => (this.isDragging = false), 0);
}
protected onNodeClick(userId: string): void {
  if (this.isDragging) return; // suppress click after drag
  this.nodeClicked.emit(userId);
}
```

`setTimeout(0)` гарантирует: `mouseup → click → macrotask(reset)`. Без этого click event прошёл бы как selection toggle после каждого перетаскивания.

## Причины выбора @foblex/flow

**1. Directive-based = Angular-native DI внутри нод**
Конкурирующие библиотеки (React Flow, xyflow) создают own rendering context. `fNode` — directive на `<div>` → внутри живёт обычный Angular-компонент с полным DI, signals, OnPush. `UserBoardCardComponent` не имеет зависимостей от Foblex.

**2. Zoneless-совместимость**
Документация Foblex явно поддерживает zoneless-режим. Внутренние event handlers не полагаются на zone.js для change detection. `FFlowModule` работает с signal-based inputs и OnPush.

**3. Декларативная валидация соединений**
`[fCanBeConnectedInputs]` — binding, а не callback. Computed signal `validTargetsByUser()` пересчитывается автоматически при изменении иерархии. Foblex реагирует на новое значение без дополнительного кода.

**4. Три типа drag из коробки**
`fDragHandle` (node drag), `fNodeOutput/fNodeInput` (connection creation), `fExternalItem/fCreateNode` (external drop) — все три в одном пакете, с единым coordinate system и event model.

**5. Лёгкие peer dependencies**
4 пакета `@foblex/*` — специализированные, без тяжёлых зависимостей типа d3. Суммарный bundle impact минимален.

## Последствия

- `@foblex/flow`, `@foblex/2d`, `@foblex/mediator`, `@foblex/utils` — новые dependencies
- Canvas widget (`org-board-canvas`) — единственное место, знающее о Foblex API в кодовой базе
- Sidebar widget импортирует `FFlowModule` для `fExternalItem` — вторая точка зависимости от Foblex
- Presentational components внутри нод (`UserBoardCard`) **не** зависят от Foblex — их можно переиспользовать вне canvas
- При замене Foblex на другую библиотеку — меняются только canvas widget и sidebar widget; page, store, pure functions, card — без изменений
- Custom connection builders — через Angular DI (`providers`), а не через глобальную конфигурацию

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| **ngx-vflow** | Хороший кандидат, но peer dependency на 3 пакета `d3-*`. Нет документации по zoneless. Был бы fallback при проблемах с Foblex |
| **Angular CDK DnD** | Два из трёх типов drag (нет connection creation). Нет SVG-связей, pan/zoom, canvas координат. Пришлось бы дописывать connection layer вручную |
| **Нативный Drag and Drop API** | Нет free-form позиционирования (только drop zones). Нет SVG connections. Огромный объём кода для базовой функциональности |
| **React Flow через Angular wrapper** | Чужой rendering context, потеря Angular DI внутри нод. Тяжёлая зависимость. Нарушает Angular-native подход проекта |
| **Чистый SVG + pointer events** | Полный контроль, но 1000+ строк кода только на drag + pan + zoom + connections. Не оправдано для playground-проекта |
