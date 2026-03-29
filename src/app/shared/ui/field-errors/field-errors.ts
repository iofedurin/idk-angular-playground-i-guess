import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { Field } from '@angular/forms/signals';

const DEFAULT_MESSAGES: Record<string, string> = {
  required: 'This field is required',
  minLength: 'Value is too short',
  maxLength: 'Value is too long',
  email: 'Enter a valid email address',
  min: 'Value is too small',
  max: 'Value is too large',
  pattern: 'Invalid format',
};

@Component({
  selector: 'app-field-errors',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `@if (message()) { <p class="fieldset-label text-error">{{ message() }}</p> }`,
})
export class FieldErrorsComponent {
  field = input.required<Field<unknown>>();
  messages = input<Record<string, string>>({});

  protected message = computed(() => {
    const state = this.field()();
    if (!state.touched()) return null;
    const errors = state.errors();
    if (!errors.length) return null;
    const { kind, message } = errors[0];
    return this.messages()[kind] ?? message ?? DEFAULT_MESSAGES[kind] ?? kind;
  });
}
