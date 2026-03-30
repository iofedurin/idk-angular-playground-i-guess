import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivityFeedStore } from '../../activity-feed.store';

@Component({
  selector: 'app-activity-bell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="dropdown dropdown-end">
      <div
        tabindex="0"
        role="button"
        class="btn btn-ghost btn-circle"
        aria-label="Notifications"
        (click)="store.markAllRead()"
      >
        <div class="indicator">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
            />
          </svg>
          @if (store.unreadCount() > 0) {
            <span class="badge badge-xs badge-primary indicator-item">{{ store.unreadCount() }}</span>
          }
        </div>
      </div>
      <div
        tabindex="0"
        class="dropdown-content bg-base-200 rounded-box shadow-lg w-80 max-h-96 overflow-y-auto z-10"
      >
        <div class="p-2">
          <div class="flex justify-between items-center px-2 pb-2 border-b border-base-content/10">
            <span class="font-semibold text-sm">Activity</span>
          </div>
          @for (event of store.events(); track event.timestamp) {
            <div class="p-2 text-sm border-b border-base-content/5">
              <span>{{ event.summary }}</span>
              <span class="text-xs text-base-content/50 ml-2">{{ formatTime(event.timestamp) }}</span>
            </div>
          } @empty {
            <div class="p-4 text-center text-base-content/50">No recent activity</div>
          }
        </div>
      </div>
    </div>
  `,
})
export class ActivityBellComponent {
  protected readonly store = inject(ActivityFeedStore);

  protected formatTime(ts: number): string {
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'just now';
    if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
    return new Date(ts).toLocaleTimeString();
  }
}
