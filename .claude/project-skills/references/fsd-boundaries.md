# FSD Boundaries

Feature-Sliced Design — архитектура слоёв с однонаправленными зависимостями.

---

## Layers

```
src/app/
  pages/     — страницы (роутинговые узлы)
  widgets/   — составные UI-блоки, переиспользуемые между страницами
  features/  — изолированные пользовательские действия
  entities/  — доменные модели (API + Store + UI)
  shared/    — UI-кит и утилиты без бизнес-логики
```

Корневой `app/` — инициализация: `app.routes.ts`, `app.config.ts`, `app.ts`.

---

## Import Rule

```
app → pages → (widgets, features) → entities → shared
```

Однонаправленный поток. **Никогда** вверх, **никогда** lateral между slices одного слоя.

Единственное задокументированное исключение: `shared/lib/http/app-id.interceptor.ts` → `AppStore` (инфраструктурный reverse import). При появлении второго reverse import — пересмотреть архитектуру.

---

## Barrel Exports — Hard Contract

Каждый slice **обязан** иметь `index.ts`. Внешний код импортирует **только** через barrel.

```ts
// ✅ Через barrel:
import { EntityStore } from '@entities/entity';

// ❌ Deep import — нарушение:
import { EntityStore } from '@entities/entity/entity.store';
```

Path aliases настроены в `tsconfig.json`:

```ts
import { EntityStore } from '@entities/entity';
import { EntityFormComponent } from '@widgets/entity-form';
import { EntityDeleteActionComponent } from '@features/entity-delete';
import { FieldErrorsComponent } from '@shared/ui';
import { httpMutation } from '@shared/lib';
```

---

## Cross-Slice Dependencies (`@x`-нотация)

Slices одного слоя **не** импортируют друг друга. Если нужен **только тип** из соседнего slice — `@x`-нотация:

```ts
// entities/country/@x/user.ts — явный контракт
export type { Country } from '../country.model';

// entities/user/user.model.ts — использование
import type { Country } from '@entities/country/@x/user';
```

Только типы, не компоненты и не runtime-зависимости.

---

## When to Create a Widget

Widget собирает несколько entity-компонентов в законченный блок UI.

### Создавать widget когда:

- **Шаблон используется на 2+ страницах** — типичный случай: create + edit форма
- **Страница перегружена** множеством entity-импортов

### НЕ создавать widget когда:

- Блок используется **только на одной странице** — оставить inline

### File Structure

```
widgets/<name>/
  ui/<name>/<name>.ts       — component
  ui/<name>/<name>.html     — template
  ui/<name>/<name>.spec.ts  — tests
  index.ts                  — barrel
```

### Pattern: Inputs-driven, Action-agnostic

Widget не знает о конкретном действии (create/edit). Всё через inputs:

```ts
@Component({
  selector: 'app-entity-form',
  imports: [FormRoot, RouterLink, /* entity field components */],
  templateUrl: './entity-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EntityFormComponent {
  readonly entityForm = input.required<EntityForm>();
  readonly model = input.required<Signal<EntityFormModel>>();
  readonly title = input.required<string>();
  readonly submitLabel = input<string>('Save');
  readonly cancelLink = input<string[]>(['/']);
}
```

Страница передаёт form object, model, и конфигурацию:

```html
<app-entity-form
  [entityForm]="entityForm"
  [model]="model"
  [title]="'Create Entity'"
  [submitLabel]="'Create'"
  [cancelLink]="['/app', appId, 'entities']"
/>
```

---

## When to Create a Feature

Feature — изолированное пользовательское действие, которое может иметь свой UI и state.

### Создавать feature когда:

- **Действие пересекает несколько entities** — например, bulk-операции над entity + selection state
- **Действие имеет свой local state** — SelectionStore, FiltersStore
- **Действие имеет свой UI** — delete button с confirm dialog, filter panel, invite dialog

### НЕ создавать feature когда:

- **Простой CRUD** — хватает page + entity store
- **Нет отдельного state** — просто вызов `store.method()` со страницы

### File Structure

```
features/<name>/
  <name>.model.ts           — типы (если есть)
  <name>.store.ts           — local state (если есть)
  ui/<component>/
    <component>.ts          — UI component
    <component>.spec.ts     — tests
  lib/                      — утилиты (если есть)
  index.ts                  — barrel
```

### Examples

**Feature с UI + state** (bulk actions):

```
features/entity-bulk-actions/
  ui/bulk-toolbar/bulk-toolbar.ts
  lib/selection.store.ts
  index.ts
```

**Feature с только UI** (delete confirmation):

```
features/entity-delete/
  ui/entity-delete-action/entity-delete-action.ts
  index.ts
```

**Feature с UI + формой** (invite dialog):

```
features/entity-invite/
  entity-invite.model.ts
  ui/entity-invite-dialog/entity-invite-dialog.ts
  index.ts
```

---

## Placement Decision Tree

```
Куда положить новый артефакт?

1. Это доменная модель / API / state?
   → entities/<entity>/

2. Это generic UI без бизнес-логики?
   → shared/ui/ (компоненты, директивы)
   → shared/lib/ (сервисы, interceptors, утилиты)

3. Это изолированное действие с UI и/или state?
   → features/<action>/

4. Это составной блок из нескольких entity, используемый на 2+ страницах?
   → widgets/<name>/

5. Это роутинговый узел?
   → pages/<name>/
```

---

## Standard Segments Inside a Slice

| Сегмент | Назначение | Пример |
|---|---|---|
| `ui/` | Компоненты | `entity-card/`, `entity-avatar/` |
| `model` (файл) | Типы, интерфейсы, DTO | `entity.model.ts` |
| `api` (файл) | HttpClient-методы | `entity-api.ts` |
| `store` (файл) | NgRx Signal Store | `entity.store.ts` |
| `lib/` | Утилиты, фабрики | `entity-form-factory.ts` |

`pages` — без сегментов: каждая страница — один компонент.

---

## Pragmatics

Не все слои обязательны сразу. `features/` и `widgets/` вводить только когда:

- Логика начинает переиспользоваться
- Компонент страницы становится слишком большим

Начало: `pages + entities + shared` — уже рабочая FSD-структура.
