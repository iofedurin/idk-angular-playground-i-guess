# ADR 0004 — Entity options-компоненты: разделение рендера опций и формовой обвязки

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

В проекте три entity-select компонента (`DepartmentSelectComponent`, `CountrySelectComponent`, `JobTitleSelectComponent`), каждый из которых совмещает две ответственности:

1. **Рендер `<option>`-элементов** — загрузка данных из стора, формирование списка (или `<optgroup>` с группировкой)
2. **Формовая обвязка** — `[formField]` из Signal Forms, skeleton при загрузке, `<app-field-errors>` для валидации

При добавлении `UserFiltersComponent` (Epic 5) понадобились те же dropdown-списки, но **без** Signal Forms — обычные `<select>` c `(change)` → `model.update()`. Переиспользовать существующие select-компоненты невозможно, потому что они жёстко привязаны к `Field<string>` input.

В результате `UserFiltersComponent` дублировал `@for`-циклы по store data. При добавлении `<optgroup>` группировки для департаментов это дублирование стало бы источником багов: изменение логики отображения в одном месте не подхватится другим.

## Решение

Разделить каждый entity-select на два компонента:

### Options-компонент (чистый рендер)

```
entities/<entity>/ui/<entity>-options/<entity>-options.ts
```

- `host: { style: 'display: contents' }` — убирает кастомный элемент из layout внутри `<select>`
- Inject стора, `computed()` для трансформации данных (например, `groupDepartments()`)
- **Не вызывает `store.load()`** — это ответственность родительского компонента
- Без формовой обвязки, без побочных эффектов

```ts
@Component({
  selector: 'app-department-options',
  host: { style: 'display: contents' },
  template: `
    @for (group of groups(); track group.label) {
      <optgroup [label]="group.label">
        @for (d of group.departments; track d.id) {
          <option [value]="d.id">{{ d.name }}</option>
        }
      </optgroup>
    }
  `,
})
export class DepartmentOptionsComponent {
  private readonly store = inject(DepartmentStore);
  protected readonly groups = computed(() => groupDepartments(this.store.entities()));
}
```

### Form-select (обёртка)

Существующий `DepartmentSelectComponent` теперь делегирует рендер опций:

```html
<select [formField]="field()" class="select w-full">
  <option value="">Select department...</option>
  <app-department-options />
</select>
```

По-прежнему отвечает за: skeleton, `[formField]`, `<app-field-errors>`, вызов `store.load()`.

### Фильтры

`UserFiltersComponent` использует те же options-компоненты:

```html
<select (change)="setDepartment(...)">
  <option value="">All departments</option>
  <app-department-options />
</select>
```

При добавлении `<optgroup>` группировки — она автоматически появляется и в форме, и в фильтрах.

## Причины

**1. Single source of truth для отображения опций**
Логика рендера `<option>`/`<optgroup>` живёт в одном компоненте. Изменение (группировка, сортировка, иконки) автоматически распространяется на все места использования.

**2. FSD-совместимость**
Options-компонент живёт в `entities/<entity>/ui/` — правильный слой для UI, привязанного к своей entity. И form-select, и filter-select могут его импортировать (features → entities — разрешённый импорт).

**3. `display: contents` решает проблему с `<select>`**
`<select>` требует `<option>`/`<optgroup>` как прямых children. `display: contents` убирает host-элемент из rendering tree — `<optgroup>` и `<option>` становятся визуально прямыми children `<select>`.

**4. Ответственность за загрузку остаётся у родителя**
Options-компонент не вызывает `store.load()`. Это правильно: form-select вызывает его в конструкторе (с skeleton), а фильтры — тоже в конструкторе, но без skeleton. Разная UX-стратегия загрузки — разная ответственность.

## Последствия

- По 3 новых файла на entity (department, country, job-title): `*-options.ts`
- Entity `index.ts` экспортирует и select, и options компонент
- При добавлении новой entity (e.g. `Position`) — создать и options, и select по тому же паттерну
- `groupDepartments()` — чистая функция в `entities/department/lib/`, покрыта unit-тестом

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| Директива на `<select>`, инжектирующая `<option>` через DOM | Императивный стиль, нет Angular-шаблона, сложнее тестировать |
| Универсальный select с `mode` input (`'form'` / `'filter'`) | Нарушает single responsibility, `field` становится optional, запутывает API |
| Оставить дублирование в фильтрах | Источник багов при изменении логики отображения (группировка, сортировка) |
| `ng-template` + `ngTemplateOutlet` | Избыточная сложность для задачи рендера `<option>` |
