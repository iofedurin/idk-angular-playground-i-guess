import { TestBed } from '@angular/core/testing';
import { EMPTY, Subject } from 'rxjs';
import { WebSocketService } from '@shared/lib';
import { ActivityFeedStore } from './activity-feed.store';
import { ActivityEvent } from './activity-feed.model';

const mockEvent = (n: number): ActivityEvent => ({
  resource: 'users',
  action: 'created',
  summary: `user ${n} created`,
  timestamp: n,
});

describe('ActivityFeedStore', () => {
  let store: InstanceType<typeof ActivityFeedStore>;
  let eventSubject: Subject<ActivityEvent>;

  beforeEach(() => {
    eventSubject = new Subject<ActivityEvent>();

    TestBed.configureTestingModule({
      providers: [
        {
          provide: WebSocketService,
          useValue: {
            onPrefix$: () => eventSubject.asObservable(),
            connected: () => false,
            reconnecting: () => false,
          },
        },
      ],
    });

    store = TestBed.inject(ActivityFeedStore);
  });

  it('starts with empty state', () => {
    expect(store.events()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
  });

  it('addEvent() prepends event and increments unreadCount', () => {
    store.addEvent(mockEvent(1));
    store.addEvent(mockEvent(2));

    expect(store.events()[0].timestamp).toBe(2);
    expect(store.events()[1].timestamp).toBe(1);
    expect(store.unreadCount()).toBe(2);
  });

  it('markAllRead() resets unreadCount to 0', () => {
    store.addEvent(mockEvent(1));
    store.addEvent(mockEvent(2));
    store.markAllRead();

    expect(store.unreadCount()).toBe(0);
    expect(store.events()).toHaveLength(2);
  });

  it('clear() removes all events and resets unreadCount', () => {
    store.addEvent(mockEvent(1));
    store.clear();

    expect(store.events()).toEqual([]);
    expect(store.unreadCount()).toBe(0);
  });

  it('ring buffer: keeps max 50 events, drops oldest', () => {
    for (let i = 1; i <= 55; i++) store.addEvent(mockEvent(i));

    expect(store.events()).toHaveLength(50);
    expect(store.events()[0].timestamp).toBe(55);
    expect(store.events()[49].timestamp).toBe(6);
  });

  it('receives events from WebSocket via onPrefix$()', () => {
    eventSubject.next(mockEvent(42));

    expect(store.events()).toHaveLength(1);
    expect(store.events()[0].timestamp).toBe(42);
    expect(store.unreadCount()).toBe(1);
  });
});
