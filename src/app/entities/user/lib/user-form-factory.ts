import { WritableSignal } from '@angular/core';
import { debounce, form, max, min, minLength, required, validateHttp } from '@angular/forms/signals';
import type { User, UserFormModel } from '../user.model';
import { roleSchema, userEmailSchema } from './field-schemas';

export interface UserFormOptions {
  excludeId?: () => string | undefined;
  onSubmit: () => Promise<void>;
}

export function createUserForm(model: WritableSignal<UserFormModel>, options: UserFormOptions) {
  return form(
    model,
    (s) => {
      required(s.username);
      minLength(s.username, 3);
      debounce(s.username, 400);
      validateHttp<string, User[]>(s.username, {
        request: (ctx) => {
          const v = ctx.value();
          return v ? `/api/users?username=${encodeURIComponent(v)}` : undefined;
        },
        onSuccess: (users) => {
          const excludeId = options.excludeId?.();
          const taken = users.some((u) => !excludeId || u.id !== excludeId);
          return taken ? { kind: 'usernameTaken' } : null;
        },
        onError: () => null,
      });

      required(s.name.firstName);
      minLength(s.name.firstName, 2);
      required(s.name.lastName);

      userEmailSchema(s.email, { excludeId: options.excludeId });

      required(s.age, { message: 'Age is required' });
      min(s.age, 18, { message: 'Must be at least 18' });
      max(s.age, 99, { message: 'Must be under 99' });

      required(s.country);
      required(s.department);
      required(s.jobTitle);
      roleSchema(s.role);
    },
    {
      submission: {
        action: async () => {
          await options.onSubmit();
          return undefined;
        },
      },
    },
  );
}

export type UserForm = ReturnType<typeof createUserForm>;
