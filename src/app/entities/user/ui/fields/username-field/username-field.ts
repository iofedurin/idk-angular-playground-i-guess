import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';

const MESSAGES: Record<string, string> = {
  required: 'Username is required',
  minLength: 'Username must be at least 3 characters',
  usernameTaken: 'This username is already taken',
};

@Component({
  selector: 'app-username-field',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Username</legend>
      <input [formField]="field()" class="input w-full" placeholder="jdoe" />
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class UsernameFieldComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
}
