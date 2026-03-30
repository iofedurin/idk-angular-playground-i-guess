# ADR 0010 — Обработка ошибок мутаций: interceptor + httpMutation + store boundary

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

В проекте два класса HTTP-операций с разными требованиями к обработке ошибок:

**Чтения** (`loadAll`, `loadPage`, `load`) — try/catch в сторе, `patchState({ error: '...' })`, inline `<app-error-alert>` на странице. Пользователь видит ошибку в контексте данных, которые он пытался загрузить.

**Мутации** (`create`, `update`, `remove`, `bulkRemove`, `bulkUpdate`) — без обработки ошибок. Промис реджектится, никто не ловит → unhandled promise rejection. При сетевой ошибке или 500 пользователь не получает обратной связи, форма или страница выглядит зависшей.

Наивное решение — обернуть каждый вызов мутации в try/catch на странице — создаёт проблемы:

1. **Catch ловит всё** — и `HttpErrorResponse`, и баги в `patchState`. Нужно проверять тип ошибки в каждом месте. Если забыть re-throw non-HTTP ошибки — баги проглатываются молча
2. **Boilerplate** — 5+ мутаций × одинаковый try/catch с проверкой типа = повторяющийся код
3. **Размытая ответственность** — страница знает о транспортных ошибках, хотя её задача — UX-flow

## Решение

Трёхслойная архитектура: interceptor → утилита → store boundary.

### Слой 1: `errorInterceptor` — глобальный toast через side-effect

```ts
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const toast = inject(ToastService);

  return next(req).pipe(
    tap({
      error: (err: HttpErrorResponse) => {
        if (req.method === 'GET') return;

        const message = typeof err.error === 'string'
          ? err.error
          : err.error?.message ?? 'Operation failed';
        toast.error(message);
      },
    }),
  );
};
```

Ключевое решение: `tap({ error })`, а не `catchError`. Interceptor **наблюдает** ошибку (показывает toast), но **не перехватывает** — ошибка продолжает идти по Observable-потоку к `lastValueFrom`.

GET-ошибки не тостятся: чтения показывают ошибку inline через `store.error()` + `<app-error-alert>`. Двойное уведомление (toast + inline) — плохой UX.

### Слой 2: `httpMutation()` — замена `lastValueFrom` для мутаций

```ts
type MutationResult<T> = { ok: true; data: T } | { ok: false };

export async function httpMutation<T>(source: Observable<T>): Promise<MutationResult<T>> {
  try {
    const data = await lastValueFrom(source);
    return { ok: true, data };
  } catch (e) {
    if (e instanceof HttpErrorResponse) return { ok: false };
    throw e;
  }
}
```

Функция решает три задачи:

1. **Единственное место проверки типа ошибки** — `instanceof HttpErrorResponse` написан один раз, а не в каждом catch-блоке
2. **Non-HTTP ошибки всплывают** — баги в коде не проглатываются
3. **Дискриминированный результат** — `{ ok }` вместо `T | undefined`. Это необходимо потому что `remove()` возвращает `Observable<void>`, у которого `lastValueFrom` резолвится в `undefined` — неотличимо от «ошибка, вернули undefined»

### Слой 3: Store — граница обработки ошибок

```ts
async create(dto: CreateUserDto): Promise<User | undefined> {
  const r = await httpMutation(api.create(dto));
  if (!r.ok) return;
  patchState(store, addEntity(r.data));
  return r.data;
}

async remove(id: string): Promise<boolean> {
  const r = await httpMutation(api.remove(id));
  if (!r.ok) return false;
  patchState(store, removeEntity(id));
  return true;
}
```

Стор — единственное место, где ошибка трансформируется в результат. Методы, возвращающие данные (`create`, `update`), возвращают `T | undefined`. Void-методы (`remove`, `bulkRemove`, `bulkUpdate`) возвращают `boolean`.

### Результат для страниц

```ts
// Ноль try/catch. Toast уже показан interceptor'ом.
const user = await this.store.create(dto);
if (user) this.router.navigate(['/users', user.id]);

if (await this.store.remove(id)) {
  this.router.navigate(['/users']);
}
```

## Почему нет opt-out

Мутации вызываются через стор (`store.create(dto)`), не напрямую через API. У страницы нет доступа к `HttpContext` — он устанавливается внутри API-класса, за двумя слоями абстракции. Чтобы протащить opt-out со страницы → через стор → в API → в `HttpContext`, нужно менять сигнатуры всех трёх слоёв — worse than try/catch.

Если появится реальный кейс для подавления toast (например, 409 Conflict с field-level ошибкой), решение будет спроектировано под конкретную задачу.

## Причины

**1. Interceptor — side-effect, не catch**
`tap({ error })` позволяет показать toast без перехвата ошибки. Ошибка продолжает путь к `lastValueFrom` → `httpMutation` → store. Каждый слой работает с оригинальной ошибкой, а не с трансформированной.

**2. `httpMutation` — единая точка type-narrowing**
`instanceof HttpErrorResponse` проверяется один раз. Все 5+ мутаций стора используют одну функцию. При изменении API ошибок Angular — одно место правки.

**3. Store как граница, не страница**
Стор уже является границей для чтений (try/catch + error state). Логично, что и для мутаций стор — место, где HTTP-ошибка превращается в «falsy результат». Страница работает с доменными значениями (`User | undefined`, `boolean`), а не с транспортными ошибками.

**4. Дискриминированный `MutationResult<T>`**
`Observable<void>` через `lastValueFrom` резолвится в `undefined`. Если использовать `T | undefined` как результат `httpMutation`, void-методы (`remove`) неотличимы: успех и ошибка — оба `undefined`. `{ ok: true, data }` / `{ ok: false }` — однозначный дискриминант.

**5. GET vs non-GET — разный UX**
Ошибка загрузки данных — пользователь видит пустую страницу с inline-ошибкой и может retry. Ошибка мутации — пользователь заполнил форму, нажал submit; inline-ошибка уничтожит контекст. Toast сохраняет форму и даёт обратную связь.

## Последствия

- `ToastService` + `<app-toast>` — новая зависимость в `shared/`
- `httpMutation()` — в `shared/lib/`, экспорт через barrel
- `errorInterceptor` — регистрируется в `app.config.ts` рядом с `appIdInterceptor`
- Чтения (`loadAll`, `loadPage`, `load`) — **не меняются**: try/catch + `store.error()` + inline alert
- Return types мутаций в сторах меняются: `Promise<User>` → `Promise<User | undefined>`, `Promise<void>` → `Promise<boolean>`
- Страницы упрощаются: удаляются любые существующие try/catch (если были), добавляется проверка `if (result)`

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| try/catch на каждой странице | Boilerplate, catch ловит всё (и баги), нужна проверка типа в каждом месте |
| try/catch + error state в сторе (`mutationError`) | Стор теряет контекст UX: не знает, показывать toast, inline alert, или field error. Generic строка в state — не actionable |
| `catchError` в interceptor (вместо `tap`) | Interceptor перехватывает ошибку, `lastValueFrom` не реджектится, стор не узнаёт об ошибке. Нужен обратный канал (signal, Subject) — over-engineering |
| Global `ErrorHandler` override | Ловит ВСЕ ошибки (не только HTTP). Нет доступа к `HttpRequest` — не отличить GET от POST. Слишком грубый инструмент |
| Не обрабатывать (оставить как есть) | Unhandled promise rejection в production. Пользователь не видит ошибку при сбое мутации |
