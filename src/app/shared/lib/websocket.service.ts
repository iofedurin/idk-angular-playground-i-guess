import { inject, Injectable, InjectionToken, signal } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DestroyRef } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { EMPTY, filter, map, Observable, retry, share, timer } from 'rxjs';

interface WebSocketMessage<T = unknown> {
  channel: string;
  payload: T;
}

/** Override in tests with a mock WebSocket constructor. */
export const WEB_SOCKET_CTOR = new InjectionToken<typeof WebSocket>('WEB_SOCKET_CTOR', {
  providedIn: 'root',
  factory: () => WebSocket,
});

@Injectable({ providedIn: 'root' })
export class WebSocketService {
  private subject$: WebSocketSubject<WebSocketMessage> | null = null;
  private connection$: Observable<WebSocketMessage> | null = null;
  private url: string | null = null;

  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);
  private readonly webSocketCtor = inject(WEB_SOCKET_CTOR);

  readonly connected = signal(false);
  readonly reconnecting = signal(false);

  constructor() {
    this.document.addEventListener('visibilitychange', () => {
      if (this.document.visibilityState === 'visible' && this.url && !this.connected()) {
        this.#startConnection();
      }
    });
  }

  connect(url: string): void {
    this.url = url;
    this.#startConnection();
  }

  /** Subscribe to a specific channel. */
  on$<T>(channel: string): Observable<T> {
    if (!this.connection$) return EMPTY;
    return this.connection$.pipe(
      filter((msg) => msg.channel === channel),
      map((msg) => msg.payload as T),
    );
  }

  /**
   * Subscribe to all channels matching a prefix.
   * Pass empty string to receive all events.
   */
  onPrefix$<T>(prefix: string): Observable<T> {
    if (!this.connection$) return EMPTY;
    return this.connection$.pipe(
      filter((msg) => !prefix || msg.channel.startsWith(prefix)),
      map((msg) => msg.payload as T),
    );
  }

  #startConnection(): void {
    this.subject$?.complete();

    this.subject$ = webSocket<WebSocketMessage>({
      url: this.url!,
      WebSocketCtor: this.webSocketCtor,
      openObserver: {
        next: () => {
          this.connected.set(true);
          this.reconnecting.set(false);
        },
      },
      closeObserver: {
        next: () => {
          this.connected.set(false);
        },
      },
    });

    this.connection$ = this.subject$.pipe(
      retry({
        count: Infinity,
        delay: (_error, retryCount) => {
          this.reconnecting.set(true);
          const base = Math.min(1000 * 2 ** retryCount, 30_000);
          const jitter = base * 0.3 * Math.random();
          return timer(base + jitter);
        },
      }),
      takeUntilDestroyed(this.destroyRef),
      share(),
    );

    this.connection$.subscribe();
  }
}
