# Shared Layer Organization

**Trigger**: добавление нового файла в `shared/`, рефакторинг существующих файлов, code review.

---

## Two Segments: `ui/` and `lib/`

```
shared/
  ui/    — компоненты и директивы (всё, что имеет selector и используется в шаблонах)
  lib/   — сервисы, функции, токены, interceptors (без selector, не используется в HTML)
```

### Decision Tree

```
Есть selector, используется в HTML-шаблонах?
  → shared/ui/<name>/

Сервис / функция / InjectionToken / interceptor / type?
  → shared/lib/<concern>/
    Есть подходящая concern-поддиректория?
      → Добавить туда
    Нет?
      → Создать новую, назвать по concern
```

---

## shared/ui/ — Rules

1. **Компоненты И behavior-директивы** — всё, что имеет Angular selector
2. **Pipes** — имеют `name` (аналог selector), используются в шаблонах
3. **Одна директория на артефакт**: `<name>/<name>.ts`
4. **Co-located тесты**: `<name>/<name>.spec.ts`
5. **Тесно связанный сервис** живёт в той же директории (пример: `ToastService` + `ToastComponent` → `toast/toast.ts`)

```
shared/ui/
  field-errors/field-errors.ts
  confirm-dialog/confirm-dialog.ts
  spinner/spinner.ts
  error-alert/error-alert.ts
  toast/toast.ts                  ← компонент + сервис в одном файле
  infinite-scroll/infinite-scroll.directive.ts  ← директива = тоже ui/
  index.ts                        ← barrel: все публичные exports
```

### Barrel (`shared/ui/index.ts`)

Экспортирует **все** публичные артефакты:

```ts
export { FieldErrorsComponent } from './field-errors/field-errors';
export { SpinnerComponent } from './spinner/spinner';
export { InfiniteScrollDirective } from './infinite-scroll/infinite-scroll.directive';
// ...
```

---

## shared/lib/ — Rules

### Core Rule: No Loose Files

Ни одного "голого" файла в корне `lib/`. Каждый файл живёт в **concern-поддиректории**. Даже если в concern один файл — он в своей директории.

```
shared/lib/
  http/          ← interceptors + mutation util
  app-scope/     ← registry + store feature
  ws/            ← WebSocket transport
  index.ts       ← ТОЛЬКО re-export из поддиректорий
```

### Group by Concern, Not by Artifact Type

| Правильно (по concern) | Неправильно (по типу) |
|---|---|
| `http/` — interceptors + httpMutation | `interceptors/` — все interceptors |
| `ws/` — WebSocket service | `services/` — все сервисы |
| `app-scope/` — registry + withAppScoped | `utils/` — все утилиты |

**Почему**: файлы внутри concern-группы зависят друг от друга и меняются вместе. `errorInterceptor` и `httpMutation` оба про обработку HTTP-ошибок — они в `http/`.

### Each Concern Has `index.ts`

```ts
// shared/lib/ws/index.ts
export { WebSocketService, WEB_SOCKET_CTOR } from './websocket.service';
```

### Root `shared/lib/index.ts` — Only Re-exports

```ts
export { AppScopeRegistry, type Resettable, withAppScoped } from './app-scope';
export { GLOBAL_REQUEST, httpMutation, type MutationResult } from './http';
export { WebSocketService, WEB_SOCKET_CTOR } from './ws';
```

Ноль прямых export из файлов. Всё через поддиректории.

---

## Checklist

- [ ] Определить сегмент: `ui/` (selector/pipe) или `lib/` (без selector)
- [ ] Для `ui/`: создать `<name>/<name>.ts`, добавить в `ui/index.ts`
- [ ] Для `lib/`: найти или создать concern-поддиректорию, добавить в её `index.ts` и в `lib/index.ts`
- [ ] Нет "голых" файлов в корне `lib/`
- [ ] Потребители импортируют через barrel: `@shared/ui` или `@shared/lib`
- [ ] Нет deep imports (кроме внутри самого `shared/`)

---

## Examples

| Новый файл | Куда | Почему |
|---|---|---|
| `LogoComponent` | `shared/ui/logo/` | Компонент с selector |
| `InfiniteScrollDirective` | `shared/ui/infinite-scroll/` | Директива с selector, используется в шаблонах |
| `RetryInterceptor` | `shared/lib/http/` | Concern = HTTP, рядом с errorInterceptor |
| `LocalStorageService` | `shared/lib/storage/` | Новый concern, создать поддиректорию |
| `formatDate()` pipe | `shared/ui/format-date/` | Pipe имеет name, используется в шаблонах |
| `formatDate()` функция | `shared/lib/<concern>/` | Чистая функция без Angular selector |
