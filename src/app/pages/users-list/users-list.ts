import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { PER_PAGE, UserPageParams, UserRole, UsersStore } from '@entities/user';
import { BulkToolbarComponent, SelectionStore } from '@features/user-bulk-actions';
import { UserDeleteActionComponent } from '@features/user-delete';
import {
  DEFAULT_SORT,
  EMPTY_FILTERS,
  SortField,
  SortState,
  UserFilters,
  UserFiltersComponent,
} from '@features/user-filters';
import { UserInviteDialogComponent } from '@features/user-invite';

const SORT_FIELD_MAP: Record<SortField, string> = {
  name: 'firstName',
  role: 'role',
  department: 'department',
};

@Component({
  selector: 'app-users-list',
  imports: [RouterLink, UserDeleteActionComponent, UserFiltersComponent, UserInviteDialogComponent, BulkToolbarComponent],
  templateUrl: './users-list.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsersListComponent {
  readonly store = inject(UsersStore);
  protected readonly selectionStore = inject(SelectionStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

  protected readonly filters = signal<UserFilters>(EMPTY_FILTERS);
  protected readonly sort = signal<SortState>(DEFAULT_SORT);
  protected readonly page = signal(1);
  protected readonly showInviteDialog = signal(false);

  protected readonly pageStart = computed(() => (this.page() - 1) * PER_PAGE + 1);
  protected readonly pageEnd = computed(() => Math.min(this.page() * PER_PAGE, this.store.totalCount()));
  protected readonly pages = computed(() => Array.from({ length: this.store.totalPages() }, (_, i) => i + 1));

  private readonly params = computed<UserPageParams>(() => ({
    page: this.page(),
    q: this.filters().search || undefined,
    role: this.filters().role || undefined,
    department: this.filters().department || undefined,
    country: this.filters().country || undefined,
    jobTitle: this.filters().jobTitle || undefined,
    active: this.filters().active || undefined,
    sortField: SORT_FIELD_MAP[this.sort().field],
    sortOrder: this.sort().direction,
  }));

  constructor() {
    effect(() => { void this.store.loadPage(this.params()); });
  }

  protected onFiltersChange(f: UserFilters): void {
    this.filters.set(f);
    this.page.set(1);
  }

  protected toggleSort(field: SortField): void {
    this.sort.update((s) => ({
      field,
      direction: s.field === field && s.direction === 'asc' ? 'desc' : 'asc',
    }));
    this.page.set(1);
  }

  protected goToPage(n: number): void {
    this.page.set(n);
  }

  protected toggleSelectAll(): void {
    const allIds = this.store.entities().map((u) => u.id);
    if (this.selectionStore.allSelected(allIds)) {
      this.selectionStore.clearAll();
    } else {
      this.selectionStore.selectAll(allIds);
    }
  }

  protected async bulkDelete(): Promise<void> {
    const ids = [...this.selectionStore.selectedIds()];
    await Promise.all(ids.map((id) => this.store.remove(id)));
    this.selectionStore.clearAll();
  }

  protected async bulkChangeRole(role: UserRole): Promise<void> {
    const ids = [...this.selectionStore.selectedIds()];
    await Promise.all(ids.map((id) => this.store.update(id, { role })));
    this.selectionStore.clearAll();
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
