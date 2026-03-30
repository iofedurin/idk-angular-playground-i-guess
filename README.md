# Angular HR Portal — Playground

Исследовательский проект на Angular 21+ для изучения современных фич: Signal Forms, CVA, NgRx Signal Store, FSD-архитектура, zoneless-режим.

## Что это

HR-портал с поддержкой multi-workspace. Два рабочих пространства (Acme Corp, Globex Inc) с независимыми данными, разделёнными по `appId`.

**Реализованные эпики:**
- **App Switching** — переключение workspace, HTTP interceptor, guard сброса сторов
- **Dashboard** — статистика по пользователям, разбивка по ролям и отделам
- **Users CRUD** — список с пагинацией, создание, редактирование, профиль
- **Departments CRUD** — список, создание, редактирование, удаление с группировкой по категориям
- **Filtering & Search** — фильтры с debounce, сортировка по колонкам, фильтрация по группам отделов
- **Bulk Actions** — множественный выбор, bulk-удаление и обновление ролей
- **User Invite** — приглашение через dialog, переиспользование email/role schema-валидации
- **Audit Log** — лог действий с infinite scroll и пагинацией
- **Activity Feed** — live-уведомления через WebSocket с reconnect и ring buffer

## Стек

| | |
|---|---|
| Framework | Angular 21+ (zoneless, standalone) |
| Forms | Signal Forms (`@angular/forms/signals`) |
| State | NgRx Signal Store (`withEntities`) |
| Styling | Tailwind CSS v4 + DaisyUI v5 |
| Tests | Vitest 4 + jsdom (builder `@angular/build:unit-test`) |
| Architecture | Feature-Sliced Design (FSD) |
| Fake backend | json-server + WebSocket |
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
bun run build           # Production build
bun run test            # Vitest (watch mode)
bun run lint:arch       # steiger + lint:app-scoped — проверка FSD-импортов и app-scoped stores
bun run lint:app-scoped # проверка withAppScoped() в entity stores
```

## Архитектура

```
src/app/
  pages/       — роутинговые компоненты (9 страниц)
  widgets/     — составные UI-блоки (user-form, department-form, user-card, audit-feed)
  features/    — изолированные действия (user-delete, department-delete, user-filters,
                 user-invite, user-bulk-actions, activity-feed)
  entities/    — доменные модели с API + Store + UI
                 (user, department, country, job-title, invitation, audit-entry, app)
  shared/
    ui/        — компоненты и директивы (FieldErrors, Spinner, Toast, ConfirmDialog,
                 ErrorAlert, InfiniteScroll)
    lib/       — утилиты без бизнес-логики
      http/    — appIdInterceptor, errorInterceptor, httpMutation
      app-scope/ — AppScopeRegistry, withAppScoped
      ws/      — WebSocketService
```

Правило импортов: `pages → (widgets, features) → entities → shared`. Контролируется `steiger`.

## Документация

- **ADRs**: [`docs/adr/`](docs/adr/) — 10 архитектурных решений (reference data, FSD, zoneless testing, signal forms, WebSocket, error handling...)
- **Project Skills**: [`.claude/project-skills/SKILL.md`](.claude/project-skills/SKILL.md) — паттерны для AI-агента: entity, page, store, forms, testing, FSD boundaries, shared organization

## Тестирование

37 spec-файлов, 214 тестов. Zoneless — без `zone.js`. Паттерны:

```ts
// Store-тесты: promise + flush + await
const promise = store.loadAll();
httpMock.expectOne('/api/entities').flush(data);
await promise;

// Component-тесты: detectChanges → flush → await → detectChanges
fixture.detectChanges();
httpMock.expectOne('/api/entities').flush(data);
await new Promise<void>(r => setTimeout(r)); // drain microtasks
fixture.detectChanges();
```

Подробнее: [ADR-003](docs/adr/0003-zoneless-testing.md).
