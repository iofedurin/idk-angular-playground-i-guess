import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { WebSocketService, WEB_SOCKET_CTOR } from './websocket.service';

/** Minimal mock WebSocket. Simulates open on construction. */
class MockWebSocket {
  static instances: MockWebSocket[] = [];
  static lastInstance: MockWebSocket | null = null;

  readyState = 1; // OPEN
  onopen: (() => void) | null = null;
  onclose: ((e: CloseEvent) => void) | null = null;
  onmessage: ((e: MessageEvent) => void) | null = null;
  onerror: ((e: Event) => void) | null = null;

  constructor(public url: string) {
    MockWebSocket.instances.push(this);
    MockWebSocket.lastInstance = this;
    Promise.resolve().then(() => this.onopen?.());
  }

  send(_data: string) {}
  close() { this.readyState = 3; }

  simulateMessage(data: object) {
    this.onmessage?.({ data: JSON.stringify(data) } as MessageEvent);
  }

  simulateClose() {
    this.readyState = 3;
    this.onclose?.({ type: 'close', wasClean: true, code: 1000 } as CloseEvent);
  }
}

const flush = () => new Promise<void>((r) => setTimeout(r));

describe('WebSocketService', () => {
  let service: WebSocketService;

  beforeEach(() => {
    MockWebSocket.instances = [];
    MockWebSocket.lastInstance = null;

    TestBed.configureTestingModule({
      providers: [{ provide: WEB_SOCKET_CTOR, useValue: MockWebSocket }],
    });
    service = TestBed.inject(WebSocketService);
  });

  it('connect() creates WS with the given URL', async () => {
    service.connect('ws://localhost:1234');
    await flush();
    expect(MockWebSocket.lastInstance?.url).toBe('ws://localhost:1234');
  });

  it('connected() becomes true after open', async () => {
    service.connect('ws://test');
    expect(service.connected()).toBe(false);
    await flush();
    expect(service.connected()).toBe(true);
  });

  it('connected() becomes false after close', async () => {
    service.connect('ws://test');
    await flush();
    MockWebSocket.lastInstance!.simulateClose();
    expect(service.connected()).toBe(false);
  });

  it('on$() delivers messages matching the channel', async () => {
    service.connect('ws://test');
    await flush();

    const received: unknown[] = [];
    service.on$<{ value: number }>('my.channel').subscribe((p) => received.push(p));

    MockWebSocket.lastInstance!.simulateMessage({ channel: 'my.channel', payload: { value: 1 } });
    MockWebSocket.lastInstance!.simulateMessage({ channel: 'other', payload: { value: 2 } });
    MockWebSocket.lastInstance!.simulateMessage({ channel: 'my.channel', payload: { value: 3 } });

    expect(received).toEqual([{ value: 1 }, { value: 3 }]);
  });

  it('onPrefix$() delivers messages matching the prefix', async () => {
    service.connect('ws://test');
    await flush();

    const received: unknown[] = [];
    service.onPrefix$<{ v: number }>('user.').subscribe((p) => received.push(p));

    MockWebSocket.lastInstance!.simulateMessage({ channel: 'user.created', payload: { v: 1 } });
    MockWebSocket.lastInstance!.simulateMessage({ channel: 'department.created', payload: { v: 2 } });
    MockWebSocket.lastInstance!.simulateMessage({ channel: 'user.deleted', payload: { v: 3 } });

    expect(received).toEqual([{ v: 1 }, { v: 3 }]);
  });

  it("onPrefix$('') delivers all messages", async () => {
    service.connect('ws://test');
    await flush();

    const received: unknown[] = [];
    service.onPrefix$<unknown>('').subscribe((p) => received.push(p));

    MockWebSocket.lastInstance!.simulateMessage({ channel: 'user.created', payload: 'a' });
    MockWebSocket.lastInstance!.simulateMessage({ channel: 'department.updated', payload: 'b' });

    expect(received).toEqual(['a', 'b']);
  });

  it('on$() returns EMPTY before connect()', () => {
    const received: unknown[] = [];
    service.on$('test').subscribe((v) => received.push(v));
    expect(received).toEqual([]);
  });
});
