import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormField, FormRoot } from '@angular/forms/signals';
import { DepartmentForm } from '@entities/department';
import { FieldErrorsComponent } from '@shared/ui';

@Component({
  selector: 'app-department-form',
  imports: [FormRoot, FormField, RouterLink, FieldErrorsComponent],
  templateUrl: './department-form.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DepartmentFormComponent {
  readonly departmentForm = input.required<DepartmentForm>();
  readonly title = input.required<string>();
  readonly submitLabel = input<string>('Save');
  readonly cancelLink = input<string[]>(['/']);
}
