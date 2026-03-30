import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { User, UserRole } from '@entities/user';

const ROLE_BADGE: Record<UserRole, string> = {
  admin: 'badge badge-error badge-sm',
  editor: 'badge badge-primary badge-sm',
  viewer: 'badge badge-neutral badge-sm',
};

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCardComponent {
  readonly user = input.required<User>();

  protected readonly initials = computed(() => {
    const u = this.user();
    return `${u.firstName[0] ?? ''}${u.lastName[0] ?? ''}`.toUpperCase();
  });

  protected roleBadgeClass(): string {
    return ROLE_BADGE[this.user().role];
  }
}
