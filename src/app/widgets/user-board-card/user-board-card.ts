import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { User } from '@entities/user';
import { UserAvatarComponent } from '@entities/user';

@Component({
  selector: 'app-user-board-card',
  imports: [UserAvatarComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="card card-compact bg-base-100 shadow-md w-48 select-none transition-opacity"
      [class.ring-2]="selected()"
      [class.ring-primary]="selected()"
      [class.opacity-30]="!highlighted()"
    >
      <div class="card-body p-3">
        <div class="flex items-center gap-2">
          <app-user-avatar [firstName]="user().firstName" [lastName]="user().lastName" />
          <div class="min-w-0 flex-1">
            <h3 class="font-medium text-sm truncate">{{ user().firstName }} {{ user().lastName }}</h3>
            <div class="flex items-center gap-1">
              @if (departmentIcon()) {
                <span class="text-base-content/40 text-xs leading-none">
                  <i [class]="'airy-' + departmentIcon()"></i>
                </span>
              }
              <p class="text-xs text-base-content/60 truncate">{{ user().jobTitle }}</p>
            </div>
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
  readonly highlighted = input(true);
  readonly directReportsCount = input(0);
  readonly departmentIcon = input<string | undefined>();
}
