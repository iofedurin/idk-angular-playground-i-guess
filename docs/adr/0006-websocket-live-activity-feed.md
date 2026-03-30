# ADR 0006 — WebSocket live activity feed: rxjs/webSocket + Signal Store

**Статус:** Принято
**Дата:** 2026-03-30

---

## Контекст

В проекте есть CRUD-операции над `users` и `departments`. Нужен механизм реального времени: при мутации в одной вкладке — уведомление во всех остальных. Это демонстрирует паттерн server→client push, который в реальных приложениях используется для activity feed, live dashboards, коллаборативного редактирования.

Ключевые требования:
1. **Server→client push** — клиент не должен поллить сервер
2. **Reconnect** — сеть ненадёжна, вкладка может быть фоновой
3. **Type-safe channels** — подписка на конкретные типы событий
4. **Тестируемость** — mock WebSocket без zone.js (zoneless-проект, см. ADR 0003)
5. **Signal-first UI** — состояние соединения и список событий — сигналы для шаблонов

## Решение

Двуслойная архитектура: **WebSocketService (rxjs) → ActivityFeedStore (signals)**.

### Слой 1: `WebSocketService` — transport + reconnect

```ts
// shared/lib/websocket.service.ts
@Injectable({ providedIn: 'root' })
export class WebSocketService {
  readonly connected = signal(false);
  readonly reconnecting = signal(false);

  connect(url: string): void { /* создаёт webSocket subject, подписывается */ }
  on$<T>(channel: string): Observable<T> { /* фильтр по exact channel */ }
  onPrefix$<T>(prefix: string): Observable<T> { /* фильтр по prefix, '' = все */ }
}
```

**Почему `rxjs/webSocket`, а не нативный WebSocket:**
- `retry()` с exponential backoff + jitter — одна строка вместо 50+ строк ручного reconnect
- `share()` — multicast для нескольких подписчиков без дублирования connection
- `filter()` + `map()` — type-safe channel routing
- `takeUntilDestroyed()` — автоматический cleanup без ручного unsubscribe

**Это не нарушает signal-first архитектуру:**
- RxJS = event infrastructure (stream сообщений, reconnect, backoff)
- Signals = state для UI (`connected`, `reconnecting`, `events[]`, `unreadCount`)
- Граница: store подписывается на Observable, вызывает `patchState()` → Signal → шаблон

### Слой 2: `ActivityFeedStore` — state + ring buffer

```ts
// features/activity-feed/activity-feed.store.ts
const MAX_EVENTS = 50;

interface StoredEvent extends ActivityEvent {
  isRead: boolean; // frontend-only, не приходит с backend
}

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState({ events: [] as StoredEvent[], unreadCount: 0 }),
  withMethods((store) => ({
    addEvent(event: ActivityEvent): void { /* prepend + ring buffer */ },
    markAllRead(): void { /* isRead: true для всех, unreadCount: 0 */ },
    clear(): void { /* полный сброс */ },
  })),
  withHooks({
    onInit(store) {
      inject(WebSocketService).onPrefix$<ActivityEvent>('')
        .pipe(takeUntilDestroyed())
        .subscribe(event => store.addEvent(event));
    },
  }),
);
```

**Почему подписка в `withHooks.onInit()`, а не в компоненте:**
Store — `providedIn: 'root'`, живёт всё время приложения. Если подписаться в компоненте, при destroy компонента события перестают накапливаться. Store сам управляет своим lifecycle — аналогично `loadAll()` в `UsersStore`.

**Ring buffer (max 50):**
Без ограничения — утечка памяти. 50 — компромисс между полезностью feed и потреблением памяти. При добавлении 51-го события самое старое удаляется.

### Формат сообщений

```ts
interface WebSocketMessage<T = unknown> {
  channel: string;   // '<singular>.<action>' — 'user.created', 'department.deleted'
  payload: T;        // { resource, action, summary, timestamp }
}
```

Channel naming: `<singular-entity>.<past-tense-action>`. Единственное число entity — потому что канал описывает событие с одним ресурсом, а не коллекцию. Bulk-действия: `user.bulk-deleted`, `user.bulk-updated`.

---

## Reconnect: exponential backoff + jitter

```ts
retry({
  count: Infinity,
  delay: (_error, retryCount) => {
    const base = Math.min(1000 * 2 ** retryCount, 30_000); // 1s → 2s → 4s → ... → 30s max
    const jitter = base * 0.3 * Math.random();              // ±30% randomization
    return timer(base + jitter);
  },
})
```

**Почему jitter обязателен:**
Без jitter: сервер перезапускается → 100 клиентов пытаются reconnect ровно через 1s, потом через 2s, потом через 4s. Сервер получает burst нагрузки в предсказуемые моменты (thundering herd). С 30% jitter клиенты размазаны по временному окну — нагрузка распределяется равномерно.

**Page Visibility API:**
```ts
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && !this.connected()) {
    this.#startConnection(); // принудительный reconnect
  }
});
```

Без этого: вкладка в фоне → соединение теряется → exponential backoff может дойти до 30s → пользователь возвращается и ждёт до 30s. С visibility: reconnect немедленно при возврате на вкладку.

---

## Тестируемость: `WEB_SOCKET_CTOR` injection token

```ts
export const WEB_SOCKET_CTOR = new InjectionToken<typeof WebSocket>('WEB_SOCKET_CTOR', {
  providedIn: 'root',
  factory: () => WebSocket,
});
```

В тестах:
```ts
class MockWebSocket {
  static lastInstance: MockWebSocket | null = null;
  constructor(public url: string) {
    MockWebSocket.lastInstance = this;
    Promise.resolve().then(() => this.onopen?.());
  }
  simulateMessage(data: object) { this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent); }
  simulateClose() { this.onclose?.({ ... } as CloseEvent); }
}

TestBed.configureTestingModule({
  providers: [{ provide: WEB_SOCKET_CTOR, useValue: MockWebSocket }],
});
```

**Почему не `vi.mock('rxjs/webSocket')`:**
`vi.mock()` — глобальный, влияет на все тесты в файле, сложнее сбросить. `InjectionToken` — per-TestBed, изолированно, идиоматично для Angular DI. Согласуется с ADR 0003 (реальные сторы + мок-зависимости).

---

## FSD-размещение

```
shared/lib/
  websocket.service.ts       — generic transport, не знает о business domain

features/activity-feed/
  activity-feed.model.ts     — ActivityEvent interface
  activity-feed.store.ts     — state + ring buffer + WS subscription
  ui/activity-bell/
    activity-bell.ts         — UI: bell + badge + dropdown
  index.ts                   — public API
```

`WebSocketService` в `shared/lib` — инфраструктурный сервис без бизнес-логики.
`ActivityFeedStore` в `features/` — содержит бизнес-логику (ring buffer, unread tracking), зависит от `WebSocketService` из `shared`. Не `entities/` — activity events не имеют CRUD, нет backend persistence.

---

## Причины

**1. `rxjs/webSocket` вместо нативного WebSocket**
Нативный WebSocket требует ручного reconnect (exponential backoff, jitter, state tracking) — ~300 строк. `rxjs/webSocket` + `retry()` + `share()` — 20 строк с тем же поведением. `rxjs` — уже peer dependency Angular, нулевой overhead по bundle size.

**2. Observable для streams, Signals для state**
WebSocket — это continuous stream, а не one-shot операция. `lastValueFrom` (паттерн из ADR 0001) не подходит — промис резолвится один раз. Observable нативно представляет поток. Store подписывается, переводит в signals через `patchState()`.

**3. `providedIn: 'root'` для обоих**
И `WebSocketService`, и `ActivityFeedStore` живут всё время приложения. Singleton гарантирует одно WS-соединение и единый список событий. Нет необходимости в per-component или per-route lifecycle.

**4. Heartbeat через ping/pong**
Клиентский `rxjs/webSocket` автоматически отвечает на ping (browser WebSocket API). Ping/pong на уровне WebSocket-протокола — стандартный паттерн zombie detection. Сервер отвечает за отправку ping, клиент — за pong (прозрачно для прикладного кода).

**5. `StoredEvent extends ActivityEvent` — разделение серверного контракта и frontend state**
`isRead` — чисто frontend state, не приходит с сервера. Отдельный тип `StoredEvent` (приватный для стора) сохраняет `ActivityEvent` как чистый контракт. При добавлении `store.addEvent(event)` обогащает `isRead: false`.

## Последствия

- Нет новых frontend-зависимостей — `rxjs/webSocket` уже в `rxjs`
- `WebSocketService.connect()` вызывается в конструкторе `App` — соединение устанавливается при старте приложения
- При добавлении нового потребителя WS-событий (например, dashboard live counter) — подписка через `ws.on$('channel')` или `ws.onPrefix$('prefix')`
- Тесты компонентов/сторов, не связанных с WS, не затронуты — `WebSocketService` мокается как `{ onPrefix$: () => EMPTY }`
- URL WebSocket-сервера конфигурируется через `environment` или `InjectionToken` при деплое

## Отвергнутые варианты

| Вариант | Почему отклонён |
|---|---|
| HTTP polling (setInterval + GET /events) | Latency 1–5s, избыточная нагрузка на сервер, не real-time |
| Server-Sent Events (SSE) | Однонаправленный (только server→client), нет встроенного reconnect с backoff, менее гибок для future bidirectional needs |
| Нативный WebSocket без rxjs | 300+ строк ручного кода: reconnect, backoff, jitter, share, cleanup. `rxjs/webSocket` даёт это из коробки |
| `httpResource` / `resource()` stream | Предназначен для HTTP-based polling, не для persistent connection. Не подходит для WebSocket transport |
| Socket.IO | Избыточная зависимость (40KB+), собственный протокол поверх WS, fallback на polling не нужен в playground |
| Store-level `toSignal()` вместо `subscribe()` | `toSignal()` создаёт один signal из Observable. Для push-based потока нужен callback (`subscribe`) который вызывает `addEvent()` при каждом событии. `toSignal()` перезаписывает значение, а не аккумулирует |
