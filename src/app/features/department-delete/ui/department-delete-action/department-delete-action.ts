import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { DepartmentStore } from '@entities/department';

@Component({
  selector: 'app-department-delete-action',
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
export class DepartmentDeleteActionComponent {
  readonly departmentId = input.required<string>();

  private readonly store = inject(DepartmentStore);
  protected readonly deleting = signal(false);

  async delete() {
    this.deleting.set(true);
    await this.store.remove(this.departmentId());
    this.deleting.set(false);
  }
}
