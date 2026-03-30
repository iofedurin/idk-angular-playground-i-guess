import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';
import { DepartmentStore } from '../../department.store';
import { DepartmentOptionsComponent } from '../department-options/department-options';

const MESSAGES: Record<string, string> = {
  required: 'Department is required',
};

@Component({
  selector: 'app-department-select',
  imports: [FormField, FieldErrorsComponent, DepartmentOptionsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Department</legend>
      @if (store.loading()) {
        <div class="skeleton h-10 w-full rounded-field"></div>
      } @else {
        <select [formField]="field()" class="select w-full">
          <option value="" disabled hidden>Select department...</option>
          <app-department-options />
        </select>
      }
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class DepartmentSelectComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
  protected readonly store = inject(DepartmentStore);

  constructor() {
    this.store.load();
  }
}
