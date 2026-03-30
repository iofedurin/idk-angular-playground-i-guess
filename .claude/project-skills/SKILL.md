# Project Architecture Patterns

Набор паттернов для Angular-проекта с FSD-архитектурой, NgRx Signal Store, Signal Forms и zoneless-рендерингом. Проект поддерживает multi-workspace — несколько приложений в рамках одного логина с изолированными данными.

Каждый reference — executable checklist с кодовыми примерами и decision tree.

---

## Deviation Rule

Если код **отклоняется** от паттерна, описанного в references, — обязателен комментарий `// Deviation from <skill-name>:` с объяснением причины.

```ts
// Deviation from store-pattern (no loading/error state):
// AppStore is infrastructure, not a domain entity. Workspace switcher
// degrades gracefully — shows appId as fallback name.
```

Без комментария отклонение выглядит как баг или недоработка. С комментарием — как осознанное решение.

---

## Architecture

Правила структуры проекта и размещения кода по слоям.

- **FSD Boundaries**: Слои, правило импортов, barrel exports, placement decisions для widget/feature/entity. Read [fsd-boundaries.md](references/fsd-boundaries.md)
- **Shared Organization**: Правила для `shared/ui/` и `shared/lib/` — decision tree, concern-группировка, barrel-структура. Read [shared-organization.md](references/shared-organization.md)

## Adding Code

Пошаговые алгоритмы для создания новых артефактов.

- **New Entity**: Модель, API, Store, UI-компоненты (select/options), barrel export. Read [entity-pattern.md](references/entity-pattern.md)
- **New Page**: Роутовый компонент с loading/error/content фазами, `ngOnInit` vs `effect`. Read [page-pattern.md](references/page-pattern.md)

## State Management

- **Store Patterns**: async-методы, `lastValueFrom`, `httpMutation`, кэширование, `reset()`, app-scoped stores. Read [store-pattern.md](references/store-pattern.md)

## Forms

- **Signal Forms**: Ownership модели на странице, form factory, schema-функции, field-компоненты, widget-форма. Read [signal-forms.md](references/signal-forms.md)

## Testing

- **Zoneless Testing**: `async`/`await` вместо `fakeAsync`, store-тесты, component-тесты, async-валидатор cleanup. Read [testing.md](references/testing.md)
