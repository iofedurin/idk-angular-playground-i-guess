import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';
import { JobTitleStore } from '../../job-title.store';

const MESSAGES: Record<string, string> = {
  required: 'Job title is required',
};

@Component({
  selector: 'app-job-title-select',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Job Title</legend>
      @if (store.loading()) {
        <div class="skeleton h-10 w-full rounded-field"></div>
      } @else {
        <select [formField]="field()" class="select w-full">
          <option value="">Select job title...</option>
          @for (j of store.jobTitles(); track j.id) {
            <option [value]="j.id">{{ j.name }}</option>
          }
        </select>
      }
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class JobTitleSelectComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
  protected readonly store = inject(JobTitleStore);

  constructor() {
    this.store.load();
  }
}
