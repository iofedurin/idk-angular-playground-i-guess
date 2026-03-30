# Zoneless Testing Patterns

Vitest + jsdom, builder `@angular/build:unit-test`. Без `zone.js` — нет `fakeAsync`/`tick()`.

---

## Core Principle: Real Store + Mock HTTP

**Не мокать stores.** Всегда использовать реальный store + `HttpTestingController`. Это ловит баги в кэше, loading state, error handling и reset.

---

## Store Tests

```ts
let store: InstanceType<typeof EntityStore>;
let httpMock: HttpTestingController;

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting()],
  });
  store = TestBed.inject(EntityStore);
  httpMock = TestBed.inject(HttpTestingController);
});
```

### Паттерн: promise + flush + await

```ts
it('loadAll() populates entities', async () => {
  const promise = store.loadAll();
  expect(store.loading()).toBe(true);        // sync check ДО flush

  httpMock.expectOne('/api/entities').flush(mockData);
  await promise;                              // ждём завершения async-метода

  expect(store.loading()).toBe(false);
  expect(store.entities()).toEqual(mockData);
});
```

**Почему работает:** `httpMock.flush()` доставляет ответ синхронно → `lastValueFrom` резолвит промис → `await promise` ждёт завершения `patchState`.

### Тест ошибки

```ts
it('loadAll() handles error', async () => {
  const promise = store.loadAll();
  httpMock.expectOne('/api/entities').error(new ProgressEvent('error'));
  await promise;

  expect(store.loading()).toBe(false);
  expect(store.error()).toBeTruthy();
});
```

### Тест кэша (reference data)

```ts
it('load() skips HTTP when cached', async () => {
  // First load
  const p1 = store.load();
  httpMock.expectOne('/api/entities').flush(mockData);
  await p1;

  // Second load — no HTTP request
  await store.load();
  httpMock.verify();  // no outstanding requests
});
```

---

## Component Tests

### `flush()` — дренаж микротасков

В компонентных тестах нет прямого доступа к промису стора (он вызывается из `ngOnInit`). Используем `setTimeout`-flush:

```ts
const flush = () => new Promise<void>(r => setTimeout(r));
```

**Почему `setTimeout`, а не `Promise.resolve()`:** `Promise.resolve()` дренирует один уровень микротасков. Если стор имеет цепочку `.then()`, второй уровень не выполнится. `setTimeout` ставит macrotask — JavaScript гарантирует полный дренаж микротасков перед macrotask.

### Паттерн: detectChanges → flush → httpMock → await flush → detectChanges

```ts
it('renders content after load', async () => {
  fixture.detectChanges();                    // → ngOnInit → store.loadAll()
  httpMock.expectOne('/api/entities').flush(mockData);
  await flush();                              // drain ALL microtasks
  fixture.detectChanges();                    // re-render

  expect(el.querySelectorAll('tr')).toHaveLength(mockData.length);
});
```

---

## afterEach — Mandatory Cleanup

### Async form validators

Signal Forms `validateHttp` + `debounce()` запускают HTTP-запросы при патче модели. Сбрасываем в `afterEach`:

```ts
afterEach(() => {
  httpMock
    .match(r =>
      r.method === 'GET' &&
      r.url.startsWith('/api/entities?') &&
      (r.url.includes('fieldname='))
    )
    .forEach(req => req.flush([]));
  httpMock.verify();
});
```

**Нюанс:** `validateHttp` формирует URL как строку `/api/entities?field=value` (query params в URL, не в `HttpParams`). Поэтому `r.url` содержит параметры, а `r.params` — пуст.

### Простой afterEach (без форм)

```ts
afterEach(() => {
  httpMock.verify();
});
```

---

## File Naming

| Тип теста | Файл | Содержит |
|---|---|---|
| Unit (чистые функции) | `*.unit.spec.ts` | Без TestBed |
| Store / Integration | `*.spec.ts` | TestBed + HttpTestingController |
| UI / Component | `*.spec.ts` | TestBed + fixture + template checks |

**Правило**: если slice имеет и чистую функцию, и компонент — они получают **отдельные** spec файлы. Никогда не смешивать TestBed-тесты с pure function тестами в одном файле.

---

## Anti-Patterns

| Не делать | Вместо этого |
|---|---|
| `fakeAsync` / `tick()` | `async`/`await` |
| `fixture.whenStable()` | `await flush()` (setTimeout-based) |
| Mock store в компонентных тестах | Real store + mock HTTP |
| `vi.mock('rxjs/webSocket')` | `InjectionToken` + mock class в TestBed |
| `done()` callback | `async` test function |

---

## Best Practices

- Все тесты — `async` функции
- `httpMock.verify()` в каждом `afterEach`
- Store tests: `const promise = store.method(); httpMock.flush(); await promise;`
- Component tests: `fixture.detectChanges() → httpMock.flush() → await flush() → fixture.detectChanges()`
- Для debounce-таймеров: `vi.useFakeTimers()` из Vitest (если нужно)
