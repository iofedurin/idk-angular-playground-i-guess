import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DepartmentStore } from '@entities/department';
import { UserRole, UsersStore } from '@entities/user';
import { UserDeleteActionComponent } from '@features/user-delete';
import {
  applyFilters,
  DEFAULT_SORT,
  EMPTY_FILTERS,
  sortUsers,
  SortField,
  SortState,
  UserFilters,
  UserFiltersComponent,
} from '@features/user-filters';
import { UserInviteDialogComponent } from '@features/user-invite';

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, UserDeleteActionComponent, UserFiltersComponent, UserInviteDialogComponent],
  templateUrl: './users-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent implements OnInit {
  readonly store = inject(UsersStore);
  private readonly departmentStore = inject(DepartmentStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

  protected readonly filters = signal<UserFilters>(EMPTY_FILTERS);
  protected readonly showInviteDialog = signal(false);
  protected readonly sort = signal<SortState>(DEFAULT_SORT);
  protected readonly filteredUsers = computed(() =>
    sortUsers(
      applyFilters(this.store.entities(), this.filters(), this.departmentStore.entities()),
      this.sort(),
    ),
  );

  ngOnInit() {
    this.store.loadAll();
  }

  protected toggleSort(field: SortField): void {
    this.sort.update((s) => ({
      field,
      direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc',
    }));
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
