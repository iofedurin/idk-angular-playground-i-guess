import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';

const MESSAGES: Record<string, string> = {
  required: 'Last name is required',
};

@Component({
  selector: 'app-last-name-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Last Name</legend>
      <input [formField]="field()" class="input w-full" placeholder="Doe" />
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class LastNameFieldComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
}
