# PLAN — App-scoped stores: авторегистрация + линтер

**Цель:** заменить ручной список `inject(XStore).reset()` в `appSwitchGuard` на авторегистрацию через `withAppScoped()` feature. Добавить линтер, чтобы разработчик не забыл пометить новый стор.

---

## Текущее состояние

`appSwitchGuard` знает о каждом сторе поимённо:

```ts
inject(UsersStore).reset();
inject(CountryStore).reset();
inject(DepartmentStore).reset();
inject(JobTitleStore).reset();
inject(InvitationStore).reset();
inject(AuditEntryStore).reset();
```

**Проблемы:**
- Open-closed violation: добавление нового стора требует правки guard
- Забыть добавить `reset()` в guard → утечка данных между приложениями
- Guard импортирует все entity-сторы напрямую

---

## Фаза 1 — Registry + withAppScoped()

### 1.1 Создать `shared/lib/app-scope-registry.ts`

```ts
import { Injectable } from '@angular/core';

export interface Resettable {
  reset(): void;
}

@Injectable({ providedIn: 'root' })
export class AppScopeRegistry {
  private readonly stores = new Set<Resettable>();

  register(store: Resettable): void {
    this.stores.add(store);
  }

  resetAll(): void {
    this.stores.forEach((s) => s.reset());
  }
}
```

### 1.2 Создать `shared/lib/with-app-scoped.ts`

```ts
import { inject } from '@angular/core';
import { signalStoreFeature, withHooks } from '@ngrx/signals';
import { AppScopeRegistry } from './app-scope-registry';

export function withAppScoped() {
  return signalStoreFeature(
    withHooks((store) => {
      // factory overload — runs in injection context (constructor)
      inject(AppScopeRegistry).register(store as unknown as Resettable);
      return {};
    }),
  );
}
```

**Важно:** используем factory-overload `withHooks((store) => ...)`, а не object-overload `withHooks({ onInit })`. Factory гарантированно выполняется в injection context — `inject()` работает.

### 1.3 Экспортировать из shared

Добавить в barrel-экспорт (создать `shared/lib/index.ts` если нет, или добавить path alias):

```ts
export { AppScopeRegistry, type Resettable } from './app-scope-registry';
export { withAppScoped } from './with-app-scoped';
```

Проверить, есть ли path alias `@shared/lib` в `tsconfig.json`. Если нет — добавить, либо импортировать по относительному пути через `@shared/lib/app-scope-registry`.

---

## Фаза 2 — Добавить withAppScoped() в entity-сторы

Добавить `withAppScoped()` **последним** в цепочку `signalStore()` каждого стора в `entities/`:

| Стор | Файл |
|---|---|
| `UsersStore` | `entities/user/user.store.ts` |
| `CountryStore` | `entities/country/country.store.ts` |
| `DepartmentStore` | `entities/department/department.store.ts` |
| `JobTitleStore` | `entities/job-title/job-title.store.ts` |
| `InvitationStore` | `entities/invitation/invitation.store.ts` |
| `AuditEntryStore` | `entities/audit-entry/audit-entry.store.ts` |

**НЕ добавлять в:**
- `AppStore` (`entities/app/`) — он управляет переключением, а не сбрасывается
- `SelectionStore` (`features/user-bulk-actions/`) — UI-состояние, не entity data

Пример изменения в `UsersStore`:

```diff
+import { withAppScoped } from '@shared/lib/with-app-scoped';

 export const UsersStore = signalStore(
   { providedIn: 'root' },
   withEntities<User>(),
   withState<UsersState>({ ... }),
   withMethods((store, api = inject(UsersApi)) => ({
     // ... все существующие методы, включая reset()
   })),
+  withAppScoped(),
 );
```

---

## Фаза 3 — Упростить appSwitchGuard

```ts
import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { AppStore } from '@entities/app';
import { AppScopeRegistry } from '@shared/lib/app-scope-registry';

export const appSwitchGuard: CanActivateFn = (route) => {
  const appId = route.paramMap.get('appId')!;
  const appStore = inject(AppStore);

  if (appStore.currentAppId() !== appId) {
    inject(AppScopeRegistry).resetAll();
    appStore.switchApp(appId);
  }

  return true;
};
```

Все импорты entity-сторов удаляются. Guard знает только о `AppStore` и `AppScopeRegistry`.

---

## Фаза 4 — Линтер: `lint:app-scoped`

### 4.1 Создать `scripts/lint-app-scoped.sh`

```bash
#!/usr/bin/env bash
# Ensures all entity stores (except AppStore) use withAppScoped()
set -euo pipefail

ERRORS=0
while IFS= read -r file; do
  if ! grep -q 'withAppScoped()' "$file"; then
    echo "ERROR: $file — missing withAppScoped()"
    ERRORS=$((ERRORS + 1))
  fi
done < <(find src/app/entities -name '*.store.ts' ! -path '*/entities/app/*')

if [ "$ERRORS" -gt 0 ]; then
  echo ""
  echo "$ERRORS store(s) missing withAppScoped()."
  echo "All entity stores must include withAppScoped() for automatic reset on app switch."
  exit 1
fi

echo "All entity stores use withAppScoped()"
```

### 4.2 Добавить npm-скрипт в `package.json`

```diff
 "scripts": {
+  "lint:app-scoped": "bash scripts/lint-app-scoped.sh",
 }
```

### 4.3 Опционально: добавить в `lint:arch` или pre-commit

Если `lint:arch` уже запускает `steiger`, можно объединить:

```diff
-"lint:arch": "steiger ./src/app",
+"lint:arch": "steiger ./src/app && bash scripts/lint-app-scoped.sh",
```

---

## Фаза 5 — Тесты

### 5.1 Unit-тест `AppScopeRegistry` (`shared/lib/app-scope-registry.unit.spec.ts`)

```ts
- register() добавляет стор в реестр
- resetAll() вызывает reset() на всех зарегистрированных сторах
- resetAll() работает корректно с пустым реестром
- register() не дублирует один и тот же стор (Set)
```

### 5.2 Integration-тест `withAppScoped()` (`shared/lib/with-app-scoped.spec.ts`)

```ts
- стор с withAppScoped() автоматически регистрируется в AppScopeRegistry при первом inject()
- registry.resetAll() вызывает reset() зарегистрированного стора
```

Создать тестовый стор с `withAppScoped()` + `reset()`, inject через TestBed, проверить регистрацию.

### 5.3 Обновить `app.guard.spec.ts` (если есть)

Проверить что guard вызывает `registry.resetAll()` вместо индивидуальных `reset()`.

### 5.4 Проверить что существующие store-тесты проходят

`bun run test` — все тесты должны пройти без изменений (withAppScoped не влияет на поведение сторов).

---

## Implementation order

- [ ] 1.1 Создать `AppScopeRegistry`
- [ ] 1.2 Создать `withAppScoped()`
- [ ] 1.3 Экспортировать из shared, настроить path alias если нужно
- [ ] 5.1 Тесты `AppScopeRegistry`
- [ ] 5.2 Тесты `withAppScoped()`
- [ ] 2 Добавить `withAppScoped()` во все 6 entity-сторов
- [ ] 3 Упростить `appSwitchGuard`
- [ ] 5.3 Обновить тесты guard (если есть)
- [ ] 5.4 `bun run test` — все тесты проходят
- [ ] 4.1 Создать `scripts/lint-app-scoped.sh`
- [ ] 4.2 Добавить npm-скрипт `lint:app-scoped`
- [ ] 4.3 Запустить линтер, убедиться что всё зелёное
- [ ] Удалить этот план после завершения

---

## Риски

1. **`inject()` в factory overload `withHooks`** — должен работать (factory выполняется в конструкторе), но нужно проверить при реализации. Если не работает — fallback: регистрация через `withMethods` factory (менее чисто, но inject() точно доступен).
2. **Порядок features** — `withAppScoped()` должен идти после `withMethods` (чтобы `reset()` уже был определён к моменту регистрации). Если ngrx вызывает hooks до завершения конструктора — reset может быть undefined. Проверить при реализации.
3. **Lazy instantiation** — сторы `providedIn: 'root'` создаются лениво. Если стор не inject'ился — его нет в реестре. Это корректно: нет данных → нечего сбрасывать. При следующем inject стор создастся заново с начальным состоянием и зарегистрируется.
