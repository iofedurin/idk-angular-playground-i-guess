# FSD Improvement Plan

Конкретные шаги по устранению нарушений FSD в текущей кодовой базе.
Следует выполнять последовательно по фазам — каждая фаза должна завершаться зелёным `ng build`.

---

## Текущие нарушения

### Критические (нарушают правила FSD)

| # | Нарушение | Файл(ы) |
|---|---|---|
| 1 | `entities/user` содержит компоненты, импортирующие другие entities | `country-field.ts`, `department-field.ts`, `job-title-field.ts` |
| 2 | Нет ни одного `index.ts` (Public API) | все слайсы |
| 3 | Все импорты — глубокие пути, а не Public API | везде |

### Структурные (не нарушают правила, но противоречат канону)

| # | Нарушение | Файл(ы) |
|---|---|---|
| 4 | `pages/user-form` смешивает create и edit в одном компоненте | `user-form.ts` |

### Инструментальные (tech debt)

| # | Нарушение |
|---|---|
| 5 | Нет ESLint-линтера для автоматической проверки FSD-правил |

---

## Целевая структура

```
src/app/
  app/                      app.routes.ts, app.config.ts, app.ts

  pages/
    users-list/             тонкая страница → делегирует виджету
      users-list.ts
      index.ts
    user-create/            тонкая страница → делегирует features/user-create
      user-create.ts
      index.ts
    user-edit/              тонкая страница → делегирует features/user-edit
      user-edit.ts
      index.ts

  features/
    user-create/            форма создания + validateHttp + POST
      ui/user-create-form.ts
      index.ts
    user-edit/              загрузка по id + форма + validateHttp + PATCH
      ui/user-edit-form.ts
      index.ts

  entities/
    user/
      user.model.ts
      users-api.ts          (переименовать в user.api.ts — опционально)
      users.store.ts        (переименовать в user.store.ts — опционально)
      ui/
        fields/             только поля без кросс-entity зависимостей
          first-name-field/
          last-name-field/
          name-group/
          email-field/      дамб-компонент, логика валидации — в features
          username-field/   то же самое
      index.ts              ← экспорт: User, UserRole, UsersStore
    country/
      country.model.ts
      country-api.ts
      country.store.ts
      ui/
        country-select/     ← сюда переехал country-field
      index.ts              ← экспорт: Country, CountryStore, CountrySelectComponent
    department/
      department.model.ts
      department-api.ts
      department.store.ts
      ui/
        department-select/  ← сюда переехал department-field
      index.ts
    job-title/
      job-title.model.ts
      job-title-api.ts
      job-title.store.ts
      ui/
        job-title-select/   ← сюда переехал job-title-field
      index.ts

  shared/
    ui/
      field-errors/
      submit-button/
      index.ts
```

**Ключевое изменение по country/department/job-title**: компоненты-селекты переезжают
из `entities/user/ui/fields/` в `entities/<своя-сущность>/ui/` — они принадлежат
своей entity, а не user. Это устраняет кросс-entity импорт без поднятия в features.

---

## Фаза A — Public API (index.ts)

Добавить `index.ts` в каждый slice. Ничего не переносим, только создаём файлы.

### Файлы для создания

```
entities/user/index.ts
entities/country/index.ts
entities/department/index.ts
entities/job-title/index.ts
shared/ui/index.ts
pages/users-list/index.ts
pages/user-form/index.ts          (временно, удалится в фазе C)
```

### Что экспортировать

**`entities/user/index.ts`**
```ts
export type { User, UserRole, CreateUserDto, UpdateUserDto } from './user.model';
export { UsersStore } from './users.store';
// UsersApi — приватный, наружу НЕ выходит
// UI-компоненты — только те, что нужны снаружи
export { NameGroupComponent } from './ui/fields/name-group/name-group';
export { EmailFieldComponent } from './ui/fields/email-field/email-field';
export { UsernameFieldComponent } from './ui/fields/username-field/username-field';
export { FirstNameFieldComponent } from './ui/fields/first-name-field/first-name-field';
export { LastNameFieldComponent } from './ui/fields/last-name-field/last-name-field';
```

**`entities/country/index.ts`**
```ts
export type { Country } from './country.model';
export { CountryStore } from './country.store';
// CountrySelectComponent добавится после фазы B
```

**`entities/department/index.ts`** / **`entities/job-title/index.ts`** — аналогично.

**`shared/ui/index.ts`**
```ts
export { FieldErrorsComponent } from './field-errors/field-errors';
export { SubmitButtonComponent } from './submit-button/submit-button';
```

После создания файлов — обновить все импорты в проекте на короткие пути:
```ts
// было
import { UsersStore } from '../../entities/user/users.store';
// стало
import { UsersStore } from '../../entities/user';
```

---

## Фаза B — Устранение кросс-entity импортов

Переместить компоненты-селекты из `entities/user/ui/fields/` в их own entity.

### Перемещения

| Откуда | Куда | Изменения в коде |
|---|---|---|
| `entities/user/ui/fields/country-field/` | `entities/country/ui/country-select/` | Путь до `CountryStore`: `../../country.store` вместо `../../../../../entities/country/country.store` |
| `entities/user/ui/fields/department-field/` | `entities/department/ui/department-select/` | Аналогично |
| `entities/user/ui/fields/job-title-field/` | `entities/job-title/ui/job-title-select/` | Аналогично |

### Что обновить после перемещений

1. Добавить компоненты-селекты в `index.ts` своих entity
2. В `entities/user/index.ts` заменить экспорт field-компонентов на импорт из других entities:
   ```ts
   // нельзя — entities не может реэкспортировать другую entity
   // компоненты-селекты больше НЕ экспортируются из entities/user
   ```
3. В `pages/user-form/user-form.ts` обновить импорты:
   ```ts
   // было
   import { CountryFieldComponent } from '../../entities/user/ui/fields/country-field/country-field';
   // стало (через Public API)
   import { CountrySelectComponent } from '../../entities/country';
   ```
4. Удалить `entities/user/ui/fields/country-field/`, `department-field/`, `job-title-field/`

---

## Фаза C — Разделение user-form на features

Текущий `pages/user-form/user-form.ts` содержит логику и create, и edit.

### Новые slice

**`features/user-create/`**
- `ui/user-create-form.ts` — инициализация пустой модели, validateHttp, submit → POST
- `index.ts` → экспорт `UserCreateFormComponent`

**`features/user-edit/`**
- `ui/user-edit-form.ts` — загрузка по id, патч модели, validateHttp (с учётом currentId), submit → PATCH
- `index.ts` → экспорт `UserEditFormComponent`

### Новые pages

- `pages/user-create/user-create.ts` — тонкая страница, только `<app-user-create-form />`
- `pages/user-edit/user-edit.ts` — тонкая страница, извлекает `:id` из роута, передаёт в `<app-user-edit-form [userId]="userId" />`

### Обновление роутинга

```ts
// app.routes.ts
{ path: 'users/new', loadComponent: () => import('./pages/user-create').then(m => m.UserCreatePage) },
{ path: 'users/:id', loadComponent: () => import('./pages/user-edit').then(m => m.UserEditPage) },
```

### Удалить

- `pages/user-form/` полностью

---

## Фаза D — Линтер FSD

Установить `steiger` для автоматической проверки правил FSD в CI.

```bash
npm install --save-dev steiger @feature-sliced/steiger-plugin
```

Конфиг `steiger.config.ts`:
```ts
import { defineConfig } from 'steiger';
import fsd from '@feature-sliced/steiger-plugin';

export default defineConfig([...fsd.configs.recommended]);
```

Добавить в `package.json`:
```json
"lint:arch": "steiger ./src"
```

Правило `no-cross-imports` автоматически найдёт все кросс-entity нарушения.
Правило `public-api` проверит наличие index.ts.

---

## Опциональные улучшения (вне фаз)

**Переименование файлов под FSD-конвенции:**
```
users-api.ts   → user.api.ts
users.store.ts → user.store.ts
country-api.ts → country.api.ts (уже правильно)
```
Не критично, но повышает консистентность именования сегментов.

**Path aliases:** вместо `../../entities/user` добавить в `tsconfig.json`:
```json
"paths": {
  "@entities/*": ["src/app/entities/*"],
  "@features/*": ["src/app/features/*"],
  "@pages/*": ["src/app/pages/*"],
  "@shared/*": ["src/app/shared/*"]
}
```
Позволит писать `import { UsersStore } from '@entities/user'` везде.

---

## Порядок выполнения

- [x] A — Public API (index.ts) + обновление всех импортов
- [x] B — Перенос country/department/job-title-select в свои entities
- [x] C — features/user-create + features/user-edit + новые тонкие pages
- [x] E1 — features/user-delete (кнопка Delete из pages → feature)
- [x] E2 — field-компоненты для age/role/active/bio (inline поля → entities/user/ui/fields)
- [x] Refactor — widgets/user-form + createUserForm factory; форм-логика поднята из features в pages
- [x] D — Линтер steiger
- [x] Опционально: переименование файлов + path aliases
