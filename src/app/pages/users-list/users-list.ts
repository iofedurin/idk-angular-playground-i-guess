import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { UserRole, UsersStore } from '@entities/user';
import { UserDeleteActionComponent } from '@features/user-delete';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, UserDeleteActionComponent],
  templateUrl: './users-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  readonly store = inject(UsersStore);
  protected appId = '';

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.appId = params.get('appId')!;
        this.store.loadAll();
      });
  }

  roleBadgeClass(role: UserRole): string {
    const map: Record<UserRole, string> = {
      admin: 'badge badge-error badge-sm',
      editor: 'badge badge-primary badge-sm',
      viewer: 'badge badge-neutral badge-sm',
    };
    return map[role];
  }
}
