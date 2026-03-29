import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';
import { FieldErrorsComponent } from '@shared/ui';
import { CountryStore } from '../../country.store';

const MESSAGES: Record<string, string> = {
  required: 'Country is required',
};

@Component({
  selector: 'app-country-select',
  imports: [FormField, FieldErrorsComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Country</legend>
      @if (store.loading()) {
        <div class="skeleton h-10 w-full rounded-field"></div>
      } @else {
        <select [formField]="field()" class="select w-full">
          <option value="">Select country...</option>
          @for (c of store.countries(); track c.code) {
            <option [value]="c.code">{{ c.name }}</option>
          }
        </select>
      }
      <app-field-errors [field]="field()" [messages]="messages" />
    </fieldset>
  `,
})
export class CountrySelectComponent {
  field = input.required<Field<string>>();
  protected readonly messages = MESSAGES;
  protected readonly store = inject(CountryStore);

  constructor() {
    this.store.load();
  }
}
