import { WritableSignal } from '@angular/core';
import { form, minLength, required } from '@angular/forms/signals';
import type { DepartmentFormModel } from '../department.model';

export interface DepartmentFormOptions {
  onSubmit: () => Promise<void>;
}

export function createDepartmentForm(
  model: WritableSignal<DepartmentFormModel>,
  options: DepartmentFormOptions,
) {
  return form(
    model,
    (s) => {
      required(s.name);
      minLength(s.name, 2);
      required(s.group);
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

export type DepartmentForm = ReturnType<typeof createDepartmentForm>;
