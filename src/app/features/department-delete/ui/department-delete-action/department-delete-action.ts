import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DepartmentStore } from '@entities/department';
import { ConfirmDialogComponent } from '@shared/ui';

@Component({
  selector: 'app-department-delete-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    <app-confirm-dialog
      #confirmDialog
      message="Are you sure you want to delete this department?"
      (confirmed)="doDelete()"
    />
    <button
      class="btn btn-sm btn-error btn-outline"
      [disabled]="deleting()"
      (click)="confirmDialog.open()"
    >
      @if (deleting()) {
        <span class="loading loading-spinner loading-xs"></span>
      }
      Delete
    </button>
  `,
})
export class DepartmentDeleteActionComponent {
  readonly departmentId = input.required<string>();

  private readonly store = inject(DepartmentStore);
  protected readonly deleting = signal(false);

  async doDelete(): Promise<void> {
    this.deleting.set(true);
    await this.store.remove(this.departmentId());
    this.deleting.set(false);
  }
}
