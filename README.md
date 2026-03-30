# Angular HR Portal — Playground

Исследовательский проект на Angular 21+ для изучения современных фич: Signal Forms, CVA, NgRx Signal Store, FSD-архитектура, zoneless-режим.

## Что это

HR-портал с поддержкой multi-workspace. Два рабочих пространства (Acme Corp, Globex Inc) с независимыми данными, разделёнными по `appId`.

**Реализованные эпики:**
- **App Switching** — переключение workspace, HTTP interceptor, guard сброса сторов
- **Dashboard** — статистика по пользователям, разбивка по ролям и отделам
- **Departments CRUD** — список, создание, редактирование, удаление с группировкой по категориям
- **User Profile** — карточка просмотра отдельно от формы редактирования
- **Filtering & Search** — фильтры с debounce, сортировка по колонкам, фильтрация по группам отделов

## Стек

| | |
|---|---|
| Framework | Angular 21+ (zoneless, standalone) |
| Forms | Signal Forms (`@angular/forms/signals`) |
| State | NgRx Signal Store (`withEntities`) |
| Styling | Tailwind CSS v4 + DaisyUI v5 |
| Tests | Vitest 4 + jsdom (builder `@angular/build:unit-test`) |
| Architecture | Feature-Sliced Design (FSD) |
| Fake backend | json-server |
| Package manager | bun |

## Запуск

```bash
# Установить зависимости
bun install

# Запустить dev-сервер + fake backend одновременно
bun run dev

# Только fake backend (порт 3000)
bun run backend

# Только Angular dev server (порт 4200)
bun run start
```

Открыть: `http://localhost:4200` — сразу редиректит на `/app/acme/dashboard`.

## Команды

```bash
bun run build        # Production build
bun run test         # Vitest (watch mode)
bun run lint:arch    # steiger — проверка FSD-импортов
```

## Архитектура

```
src/app/
  app/         — инициализация: routes, config, layout, guards
  pages/       — роутинговые компоненты (один компонент = одна страница)
  widgets/     — составные UI-блоки (user-form, department-form, stats-cards, user-card)
  features/    — изолированные действия (user-delete, department-delete, user-filters)
  entities/    — доменные модели с API + Store + UI (user, country, department, job-title, app)
  shared/      — UI-кит и утилиты без бизнес-логики
```

Правило импортов: только вниз по иерархии. Контролируется `steiger`.

## Тестирование

Zoneless — без `zone.js`. Паттерны:

```ts
// Store-тесты
const promise = store.loadAll();
httpMock.expectOne('/api/users').flush(data);
await promise;

// Component-тесты
fixture.detectChanges();
httpMock.expectOne(...).flush(data);
await new Promise<void>(r => setTimeout(r)); // drain microtasks
fixture.detectChanges();
```

Подробнее: [ADR-003](docs/adr/0003-zoneless-testing.md).
