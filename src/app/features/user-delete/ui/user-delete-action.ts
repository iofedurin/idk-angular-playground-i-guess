import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { getDirectReports, UsersStore } from '@entities/user';
import { ConfirmDialogComponent } from '@shared/ui';

@Component({
  selector: 'app-user-delete-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    <app-confirm-dialog
      title="Delete user"
      [message]="deleteMessage()"
      confirmLabel="Delete"
      (confirmed)="doDelete()"
    >
      <button
        class="btn btn-sm btn-error btn-outline"
        [disabled]="deleting()"
      >
        @if (deleting()) {
          <span class="loading loading-spinner loading-xs"></span>
        }
        Delete
      </button>
    </app-confirm-dialog>
  `,
})
export class UserDeleteActionComponent {
  readonly userId = input.required<string>();

  private readonly store = inject(UsersStore);
  protected readonly deleting = signal(false);

  protected readonly directReports = computed(() =>
    getDirectReports(this.userId(), this.store.entities()),
  );

  private readonly manager = computed(() => {
    const user = this.store.entityMap()[this.userId()];
    return user?.managerId ? (this.store.entityMap()[user.managerId] ?? null) : null;
  });

  protected readonly deleteMessage = computed(() => {
    const reports = this.directReports();
    if (reports.length === 0) {
      return 'Are you sure you want to delete this user?';
    }
    const count = reports.length;
    const label = count === 1 ? 'direct report' : 'direct reports';
    const mgr = this.manager();
    const reassignTo = mgr ? `${mgr.firstName} ${mgr.lastName}` : 'no manager';
    return `This user has ${count} ${label}. They will be reassigned to ${reassignTo}. Continue?`;
  });

  async doDelete(): Promise<void> {
    this.deleting.set(true);

    const reports = this.directReports();
    if (reports.length > 0) {
      const user = this.store.entityMap()[this.userId()];
      const newManagerId = user?.managerId ?? null;
      await Promise.all(reports.map((r) => this.store.setManager(r.id, newManagerId)));
    }

    await this.store.remove(this.userId());
    this.deleting.set(false);
  }
}
