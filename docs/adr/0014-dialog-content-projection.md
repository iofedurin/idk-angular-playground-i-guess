# ADR 0014 — Dialog content projection: trigger внутри диалога

**Статус:** Принято
**Дата:** 2026-04-02

---

## Контекст

В проекте два типа диалогов: `ConfirmDialogComponent` (shared) и `UserInviteDialogComponent` (feature). Оба используют нативный `<dialog>` + DaisyUI-стили + императивный `showModal()`/`close()`.

До рефакторинга потребители управляли открытием диалога снаружи:

```html
<!-- Паттерн 1: template ref + (click)="ref.open()" -->
<app-confirm-dialog #confirmDialog [message]="..." (confirmed)="doDelete()" />
<button (click)="confirmDialog.open()">Delete</button>

<!-- Паттерн 2: сигнал на странице -->
<button (click)="showDialog.set(true)">Invite</button>
<app-user-invite-dialog [open]="showDialog()" (closed)="showDialog.set(false)" />
```

Проблемы:
1. **Boilerplate на потребителе** — каждый потребитель создаёт template ref или signal для open/close state
2. **Размытая ответственность** — страница знает о механике открытия диалога
3. **Нарушение инкапсуляции** — open state живёт вне компонента, который им управляет

## Решение

Диалог оборачивает свой trigger через `<ng-content />`. Trigger проецируется внутрь компонента, клик по нему открывает диалог. Потребитель не знает о механике открытия.

### Паттерн: content projection + display: contents

```ts
@Component({
  selector: 'app-confirm-dialog',
  host: { style: 'display: contents' },
  template: `
    <span style="display: contents" (click)="open()">
      <ng-content />
    </span>

    <dialog #dialog class="modal">
      <!-- dialog content -->
    </dialog>
  `,
})
```

**`display: contents`** на host и span — убирает оба элемента из layout. Проецированная кнопка визуально и в CSS является прямым child родителя. `<dialog>` при `showModal()` уходит в top layer — не влияет на layout.

### Использование

```html
<!-- До: template ref + signal/click handler -->
<app-confirm-dialog #confirmDialog [message]="..." (confirmed)="doDelete()" />
<button [disabled]="deleting()" (click)="confirmDialog.open()">Delete</button>

<!-- После: trigger внутри -->
<app-confirm-dialog [message]="..." (confirmed)="doDelete()">
  <button [disabled]="deleting()">Delete</button>
</app-confirm-dialog>
```

Потребитель передаёт trigger как content. Не нужен template ref, не нужен signal, не нужен обработчик клика.

### Два варианта диалогов

| | ConfirmDialog | UserInviteDialog |
|---|---|---|
| **Слой** | `shared/ui/` | `features/user-invite/` |
| **Open/close** | Императивный: `open()` → `showModal()`, `cancel()` → `close()` | Signal: `open = signal(false)` + `effect()` |
| **Почему разница** | Stateless — нет формы, нет состояния для сброса | Stateful — при закрытии нужен `form.reset()` + `model.set()` |
| **Programmatic open** | `open()` метод остаётся public | Нет (внутренний signal) |

### Programmatic open (ReassignConfirm)

`ConfirmDialogComponent` сохраняет public `open()` метод для программного открытия. `ReassignConfirmComponent` вызывает его из `effect()` при изменении `pending` сигнала — без content projection:

```ts
// ReassignConfirmComponent — без проецированного trigger
effect(() => {
  if (this.pending()) {
    this.confirmDialogRef()?.open();
  }
});
```

Пустой `<span style="display: contents">` без проецированного контента невидим и не влияет на layout.

## Decision tree: как реализовать новый диалог

```
Диалог открывается по клику пользователя на конкретную кнопку?
  │
  ├─ ДА → Content projection:
  │        host: { style: 'display: contents' }
  │        <span (click)="open()"><ng-content /></span>
  │
  └─ НЕТ → Программное открытие:
            Public open() метод, потребитель вызывает через viewChild
            (пример: ReassignConfirmComponent)

Диалог содержит форму или state, который нужно сбрасывать при закрытии?
  │
  ├─ ДА → Signal + effect():
  │        open = signal(false)
  │        effect() { if (open()) showModal(); else { close(); form.reset(); } }
  │
  └─ НЕТ → Императивный:
            open() { showModal(); }
            cancel() { close(); cancelled.emit(); }
```

## Причины

**1. Инкапсуляция open/close state**
Диалог сам управляет своим lifecycle. Потребитель не создаёт signal, не хранит template ref, не обрабатывает `(closed)` event для сброса state. Меньше boilerplate = меньше багов.

**2. `display: contents` решает layout-проблему**
Без `display: contents` host-элемент `<app-confirm-dialog>` ломает flex/grid layout родителя (вставляет лишний DOM-узел между parent и button). `display: contents` убирает host из rendering tree — кнопка становится прямым visual child родителя.

**3. Нативный `<dialog>` + `showModal()` — браузерный API**
Не используются сторонние modal-библиотеки. `showModal()` даёт:
- Top layer (поверх всего DOM, без z-index хаков)
- `::backdrop` pseudo-element
- Focus trap (Tab не выходит за пределы диалога)
- Esc закрывает (dispatch `cancel` event)

DaisyUI (`modal`, `modal-box`, `modal-backdrop`) — только CSS-стилизация поверх нативного API.

**4. `<span>` vs `@HostListener('click')`**
`@HostListener('click')` на host-элементе ловит **все** клики, включая bubbling из `<dialog>` (Cancel, Submit, backdrop). Потребовался бы `if (dialog.contains(target)) return` — defensive код. `<span>` на `<ng-content />` ловит только клик по trigger. Dialog в отдельной ветке template — пересечений нет.

**5. Обратная совместимость**
`ConfirmDialogComponent.open()` остаётся public. Существующий потребитель (`ReassignConfirmComponent`) не меняется. Content projection — additive change: если content не проецирован, пустой span невидим.

## Последствия

- Все диалоги в проекте используют `<ng-content />` для trigger (кроме programmatic open)
- Потребители упрощаются: нет template ref, нет signal для open state, нет `(closed)` handler
- При создании нового диалога — следовать decision tree выше
- `host: { style: 'display: contents' }` обязателен — без него host ломает layout

## Применение в проекте

| Компонент | Паттерн | Trigger |
|---|---|---|
| `ConfirmDialogComponent` | Content projection + imperative `open()` | Button внутри `<ng-content />` |
| `UserInviteDialogComponent` | Content projection + signal `open` + `effect()` | Button внутри `<ng-content />` |
| `UserDeleteActionComponent` | Потребитель ConfirmDialog | Delete button проецирован |
| `DepartmentDeleteActionComponent` | Потребитель ConfirmDialog | Delete button проецирован |
| `BulkToolbarComponent` | Потребитель ConfirmDialog | "Delete selected" button проецирован |
| `ReassignConfirmComponent` | Потребитель ConfirmDialog (programmatic) | Без trigger — `open()` из `effect()` |

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| `@HostListener('click')` | Ловит все клики включая dialog internals, требует defensive filtering |
| `[open]` input + `(closed)` output | Boilerplate на каждом потребителе, open state размазан между двумя компонентами |
| Angular CDK Dialog / Overlay | Тяжёлая зависимость для задачи, которую решает нативный `<dialog>` |
| `<ng-template>` + `ngTemplateOutlet` | Over-engineering для проецирования одной кнопки |
| Signal-based state для ConfirmDialog | Избыточно — confirm dialog stateless (нет формы для reset), императивный `open()`/`close()` проще |
