import { inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { patchState, signalStore, withHooks, withMethods, withState } from '@ngrx/signals';
import { WebSocketService } from '@shared/lib';
import { ActivityEvent } from './activity-feed.model';

const MAX_EVENTS = 50;

export const ActivityFeedStore = signalStore(
  { providedIn: 'root' },
  withState({
    events: [] as ActivityEvent[],
    unreadCount: 0,
  }),
  withMethods((store) => ({
    addEvent(event: ActivityEvent): void {
      patchState(store, (state) => ({
        events: [event, ...state.events.slice(0, MAX_EVENTS - 1)],
        unreadCount: state.unreadCount + 1,
      }));
    },
    markAllRead(): void {
      patchState(store, { unreadCount: 0 });
    },
    clear(): void {
      patchState(store, { events: [], unreadCount: 0 });
    },
  })),
  withHooks({
    onInit(store) {
      const ws = inject(WebSocketService);

      ws.onPrefix$<ActivityEvent>('').pipe(takeUntilDestroyed()).subscribe((event) => {
        store.addEvent(event);
      });
    },
  }),
);
