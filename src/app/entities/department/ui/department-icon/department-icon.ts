import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-department-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (iconKey()) { <i [class]="'airy-' + iconKey()"></i> }`,
})
export class DepartmentIconComponent {
  readonly iconKey = input<string | undefined>();
}
