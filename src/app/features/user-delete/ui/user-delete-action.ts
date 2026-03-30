import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { UsersStore } from '@entities/user';
import { ConfirmDialogComponent } from '@shared/ui';

@Component({
  selector: 'app-user-delete-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConfirmDialogComponent],
  template: `
    <app-confirm-dialog
      #confirmDialog
      message="Are you sure you want to delete this user?"
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
export class UserDeleteActionComponent {
  readonly userId = input.required<string>();

  private readonly store = inject(UsersStore);
  protected readonly deleting = signal(false);

  async doDelete(): Promise<void> {
    this.deleting.set(true);
    await this.store.remove(this.userId());
    this.deleting.set(false);
  }
}
