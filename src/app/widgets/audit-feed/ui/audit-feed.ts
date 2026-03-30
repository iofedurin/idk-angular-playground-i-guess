import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { AuditEntry } from '@entities/audit-entry';
import { InfiniteScrollDirective } from '@shared/ui';

const ACTION_LABELS: Record<string, string> = {
  create: 'Created',
  update: 'Updated',
  delete: 'Deleted',
  role_change: 'Changed role of',
  invite: 'Invited',
};

@Component({
  selector: 'app-audit-feed',
  imports: [InfiniteScrollDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (entries().length === 0 && !loading()) {
      <p class="text-base-content/60 py-8 text-center">No audit entries found.</p>
    }

    <ul class="timeline timeline-vertical timeline-compact">
      @for (entry of entries(); track entry.id) {
        <li>
          <div class="timeline-middle">
            <span class="badge badge-sm {{ badgeClass(entry.action) }}">{{ actionLabel(entry.action) }}</span>
          </div>
          <div class="timeline-end timeline-box">
            <p class="font-medium text-sm">{{ entry.details }}</p>
            <p class="text-xs text-base-content/60 mt-1">
              by <span class="font-semibold">{{ entry.userName }}</span>
              &mdash; {{ formatDate(entry.timestamp) }}
            </p>
          </div>
          <hr />
        </li>
      }
    </ul>

    @if (loading()) {
      <div class="flex justify-center py-6">
        <span class="loading loading-spinner loading-md"></span>
      </div>
    }

    @if (hasMore() && !loading()) {
      <div appInfiniteScroll (scrolled)="loadMore.emit()" class="h-4"></div>
    }
  `,
})
export class AuditFeedComponent {
  readonly entries = input.required<AuditEntry[]>();
  readonly loading = input.required<boolean>();
  readonly hasMore = input.required<boolean>();
  readonly loadMore = output<void>();

  protected actionLabel(action: string): string {
    return ACTION_LABELS[action] ?? action;
  }

  protected badgeClass(action: string): string {
    const map: Record<string, string> = {
      create: 'badge-success',
      update: 'badge-info',
      delete: 'badge-error',
      role_change: 'badge-warning',
      invite: 'badge-secondary',
    };
    return map[action] ?? 'badge-neutral';
  }

  protected formatDate(timestamp: string): string {
    return new Date(timestamp).toLocaleString();
  }
}
