# ADR 0002 — FSD как архитектура слоёв

**Статус:** Принято
**Дата:** 2026-03-27
**Обновлено:** 2026-03-29

---

## Контекст

При создании нового проекта нужно было выбрать архитектурный подход, который:
- Явно разделяет ответственность между частями приложения
- Масштабируется при росте команды
- Предотвращает хаотичные зависимости между модулями
- Имеет чёткие правила — куда класть новый код

## Решение

Использовать **Feature-Sliced Design (FSD)** со слоями:

```
src/app/
  pages/     — страницы (роутинговые узлы)
  widgets/   — составные UI-блоки, переиспользуемые между страницами
  features/  — изолированные пользовательские действия (user-delete)
  entities/  — доменные модели (User, Country, Department...)
  shared/    — UI-кит и утилиты без бизнес-логики
```

Корневой `app/` — инициализация: `app.routes.ts`, `app.config.ts`, `app.ts`.

**Правило импортов**: только вниз по иерархии.
`app → pages → widgets → features → entities → shared`

---

## Ключевые правила

### 1. Public API — обязательный контракт

Каждый slice **обязан** иметь `index.ts` в своём корне. Внешний код импортирует **только** через него.

```ts
// entities/user/index.ts
export type { User, UserRole, CreateUserDto } from './user.model';
export { UsersStore } from './user.store';
export { createUserForm } from './lib/user-form-factory';
// user.api.ts — приватный, наружу НЕ экспортируется
```

Прямой импорт внутренних путей — нарушение архитектуры:
```ts
// ❌ Нельзя
import { UsersStore } from '@entities/user/user.store';

// ✅ Правильно
import { UsersStore } from '@entities/user';
```

Контролируется `steiger` (`bun run lint:arch`).

---

### 2. Запрет кросс-импортов на одном слое

Слайсы **одного** слоя не могут импортировать друг друга.
`entities/user` **не может** импортировать `entities/country` — и наоборот.

**Три легитимных решения:**

| Ситуация | Решение |
|---|---|
| Компонент загружает данные своей entity | Живёт в `entities/<own>/ui/` |
| Компонент нужен сразу нескольким слоям | Поднять в `widgets/` или `features/` |
| Нужен только тип из другой entity | `@x`-нотация (только типы, не компоненты) |

**`@x`-нотация** — явный контракт между двумя слайсами:
```ts
// entities/country/@x/user.ts
export type { Country } from '../country.model';

// entities/user/user.model.ts
import type { Country } from '@entities/country/@x/user';
```

---

### 3. Где живут UI-компоненты с доменной логикой

| Тип компонента | Слой |
|---|---|
| Примитивный input без бизнес-контекста (TextField, SubmitButton) | `shared/ui` |
| Компонент отображает данные **своей** entity (UserCard, AgeField) | `entities/user/ui` |
| Компонент загружает данные **своей** entity (CountrySelect → CountryStore) | `entities/country/ui` |
| Компонент пересекает несколько entities или содержит сложный local state | `features/` |

**Ключевой принцип**: `CountrySelect` живёт в `entities/country/ui/`, а не в `features/`,
потому что загружает данные только своей entity. Нарушением было бы держать его в `entities/user/`.

---

### 4. Страница и общая форм-логика

Если форма используется **только** на одной странице — логика живёт прямо на странице:

```ts
// pages/user-create/user-create.ts
export class UserCreatePage {
  protected readonly userForm = createUserForm(this.model, {
    onSubmit: async () => { await this.store.create(...); },
  });
}
// Шаблон: <app-user-form [userForm]="userForm" ... />
```

Если шаблон формы **переиспользуется** (create + edit) — шаблон выносится в `widgets/`:

```
pages/user-create  ──→  widgets/user-form (шаблон)
pages/user-edit    ──→  widgets/user-form
                         ──→  entities/user, country, department, job-title
```

Общая логика (валидаторы, фабрика формы) — в `entities/user/lib/`.

---

### 5. Widgets — переиспользуемые составные блоки

Виджет собирает несколько entity-компонентов в законченный блок UI.

**Когда создавать виджет:**
- Один и тот же шаблон нужен на нескольких страницах (create + edit форма)
- Страница становится перегруженной множеством импортов

**Когда НЕ создавать:**
- Блок используется только в одном месте — оставить на странице

Пример в проекте: `widgets/user-form` принимает `[userForm]`, `[model]`, `[title]`, `[submitLabel]`
и рендерит все поля, не зная о конкретном действии (create/edit).

---

### 6. Factory-паттерн для переиспользуемой логики

Общая логика, не привязанная к конкретному действию, живёт в `lib/` сегменте entity:

```ts
// entities/user/lib/user-form-factory.ts
export function createUserForm(
  model: WritableSignal<UserFormModel>,
  options: { excludeId?: () => string; onSubmit: () => Promise<void> }
) { ... }

export type UserForm = ReturnType<typeof createUserForm>;
```

`excludeId` — пример опционального параметра: для edit-формы исключает текущего пользователя
из HTTP-валидации на уникальность username/email.

Для HTTP-валидаторов используется `debounce()` из `@angular/forms/signals` — аналог `debounceTime` из RxJS:
```ts
debounce(s.username, 400); // задержка 400ms перед HTTP-запросом
validateHttp(s.username, { ... });
```

---

### 7. Прагматика: не все слои обязательны сразу

`features` и `widgets` не нужны в начале. Вводить их только когда:
- Логика начинает переиспользоваться
- Компонент страницы становится слишком большим

Начало: `pages + entities + shared` — уже рабочая FSD-структура.

---

### 8. Стандартные сегменты внутри slice

| Сегмент | Назначение | Пример |
|---|---|---|
| `ui/` | Компоненты | `user-card/`, `user-avatar/` |
| `model` (файл) | Типы, интерфейсы, DTO | `user.model.ts` |
| `api` (файл) | HttpClient-методы | `user.api.ts` |
| `store` (файл) | NgRx Signal Store | `user.store.ts` |
| `lib/` | Утилиты, фабрики | `user-form-factory.ts` |

Плоская структура (`user.model.ts` в корне slice) допустима и предпочтительна для небольших slice.

`pages` — намеренно без сегментов: каждая страница — один компонент,
дополнительные сегменты только раздуют структуру без пользы. Настроено в `steiger.config.ts`.

---

## Текущее состояние проекта

Проект полностью следует FSD. `steiger ./src/app` — **No problems found**.

**Все слои задействованы:**
```
pages/      users-list, user-create, user-edit
widgets/    user-form
features/   user-delete
entities/   user, country, department, job-title
shared/     ui (FieldErrors, SubmitButton)
```

**Path aliases** (настроены в `tsconfig.json`):
```ts
import { UsersStore } from '@entities/user';
import { UserFormComponent } from '@widgets/user-form';
import { UserDeleteActionComponent } from '@features/user-delete';
import { FieldErrorsComponent } from '@shared/ui';
```

---

## Причины выбора FSD

- Явные правила импортов контролируются линтером (`steiger`)
- Хорошая документация: [feature-sliced.design](https://feature-sliced.design)
- Предотвращает circular dependencies на уровне архитектуры
- Органично совмещается с Angular DI, Standalone Components и NgRx Signal Store

## Отвергнутые варианты

**Feature-based (по фичам в корне)** — нет явных правил импортов, легко получить circular deps.

**Модульная архитектура Angular (NgModules)** — отвергнута вместе с NgModules.

## Последствия

- `steiger` добавлен в dev-зависимости, скрипт `lint:arch` запускается отдельно (не в CI)
- Фичи не могут импортировать виджеты — только страницы могут использовать и виджеты, и фичи
- `index.ts` на каждый slice увеличивает количество файлов, но снижает хрупкость при рефакторинге
- Новый разработчик должен ознакомиться с FSD перед началом работы
