import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { DepartmentStore } from '../../department.store';
import { groupDepartments } from '../../lib/group-departments';

@Component({
  selector: 'app-department-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @for (group of groups(); track group.label) {
      <optgroup [label]="group.label">
        @if (groupSelectable()) {
          <option [value]="'group:' + group.label">All {{ group.label }}</option>
        }
        @for (d of group.departments; track d.id) {
          <option [value]="d.id">{{ d.name }}</option>
        }
      </optgroup>
    }
  `,
})
export class DepartmentOptionsComponent {
  readonly groupSelectable = input(false);

  private readonly store = inject(DepartmentStore);
  protected readonly groups = computed(() => groupDepartments(this.store.entities()));
}
