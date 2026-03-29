import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';

@Component({
  selector: 'app-age-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Age</legend>
      <input type="number" [formField]="field()" class="input w-full" placeholder="25" />
      <app-field-errors [field]="field()" />
    </fieldset>
  `,
})
export class AgeFieldComponent {
  field = input.required<Field<number>>();
}
