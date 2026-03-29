import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';

const MESSAGES: Record<string, string> = {
  required: 'First name is required',
  minLength: 'First name must be at least 2 characters',
};

@Component({
  selector: 'app-first-name-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">First Name</legend>
      <input [formField]="field()" class="input w-full" placeholder="John" />
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class FirstNameFieldComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
}
