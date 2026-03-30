import { email, required } from '@angular/forms/signals';

type StringSchemaField = Parameters<typeof email>[0];
type AnySchemaField = Parameters<typeof required>[0];

/** Base email validation: required + email format. */
export function emailBaseSchema(emailField: StringSchemaField): void {
  required(emailField, { message: 'Email is required' });
  email(emailField, { message: 'Enter a valid email address' });
}

/** Role validation: required. */
export function roleSchema(roleField: AnySchemaField): void {
  required(roleField, { message: 'Role is required' });
}
