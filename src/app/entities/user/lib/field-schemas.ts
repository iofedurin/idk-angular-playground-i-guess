import { debounce, email, required, validateHttp } from '@angular/forms/signals';
import type { User } from '../user.model';

type StringSchemaField = Parameters<typeof email>[0];
type AnySchemaField = Parameters<typeof required>[0];

/** Base email validation: required + email format. */
export function emailBaseSchema(emailField: StringSchemaField): void {
  required(emailField, { message: 'Email is required' });
  email(emailField, { message: 'Enter a valid email address' });
}

/** Full user-email validation: format + uniqueness check against /api/users. */
export function userEmailSchema(emailField: StringSchemaField, options?: { excludeId?: () => string | undefined }): void {
  emailBaseSchema(emailField);
  debounce(emailField, 400);
  validateHttp<string, User[]>(emailField, {
    request: (ctx) => {
      const v = ctx.value();
      return v ? `/api/users?email=${encodeURIComponent(v)}` : undefined;
    },
    onSuccess: (users) => {
      const id = options?.excludeId?.();
      const taken = users.some((u) => !id || u.id !== id);
      return taken ? { kind: 'emailTaken', message: 'This email is already registered' } : null;
    },
    onError: () => null,
  });
}

/** Role validation: required. */
export function roleSchema(roleField: AnySchemaField): void {
  required(roleField, { message: 'Role is required' });
}
