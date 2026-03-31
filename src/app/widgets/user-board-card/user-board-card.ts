import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { User } from '@entities/user';

@Component({
  selector: 'app-user-board-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card card-compact bg-base-100 shadow-md w-48 select-none"
      [class.ring-2]="selected()"
      [class.ring-primary]="selected()"
    >
      <div class="card-body p-3">
        <div class="flex items-center gap-2">
          <div class="avatar avatar-placeholder">
            <div class="bg-neutral text-neutral-content w-8 rounded-full">
              <span class="text-xs">{{ initials() }}</span>
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-sm truncate">{{ user().firstName }} {{ user().lastName }}</h3>
            <p class="text-xs text-base-content/60 truncate">{{ user().jobTitle }}</p>
          </div>
        </div>
        @if (directReportsCount() > 0) {
          <div class="badge badge-sm badge-outline mt-1">
            {{ directReportsCount() }} reports
          </div>
        }
      </div>
    </div>
  `,
})
export class UserBoardCardComponent {
  readonly user = input.required<User>();
  readonly selected = input(false);
  readonly directReportsCount = input(0);

  protected readonly initials = computed(() => {
    const u = this.user();
    return (u.firstName[0] ?? '') + (u.lastName[0] ?? '');
  });
}
