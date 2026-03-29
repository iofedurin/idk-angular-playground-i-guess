import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { UsersStore } from '@entities/user';

@Component({
  selector: 'app-user-delete-action',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      class="btn btn-sm btn-error btn-outline"
      [disabled]="deleting()"
      (click)="delete()"
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

  async delete() {
    this.deleting.set(true);
    await this.store.remove(this.userId());
    this.deleting.set(false);
  }
}
