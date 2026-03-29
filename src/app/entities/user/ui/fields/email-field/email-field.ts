import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';

const MESSAGES: Record<string, string> = {
  required: 'Email is required',
  email: 'Enter a valid email address',
  emailTaken: 'This email is already in use',
};

@Component({
  selector: 'app-email-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Email</legend>
      <input type="email" [formField]="field()" class="input w-full" placeholder="john@example.com" />
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class EmailFieldComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
}
