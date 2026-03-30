import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';
import { UserRole } from '../../../user.model';

@Component({
  selector: 'app-role-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Role</legend>
      <select [formField]="field()" class="select w-full">
        @for (role of roles; track role) {
          <option [value]="role">{{ role }}</option>
        }
      </select>
      <app-field-errors [field]="field()" />
    </fieldset>
  `,
})
export class RoleFieldComponent {
  field = input.required<Field<string>>();
  protected readonly roles: UserRole[] = ['viewer', 'editor', 'admin'];
}
