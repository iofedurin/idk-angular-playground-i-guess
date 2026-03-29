import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { UserRole, UsersStore } from '@entities/user';
import { UserDeleteActionComponent } from '@features/user-delete';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, UserDeleteActionComponent],
  templateUrl: './users-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  readonly store = inject(UsersStore);

  ngOnInit() {
    this.store.loadAll();
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
