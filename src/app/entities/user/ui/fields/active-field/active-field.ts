import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';

@Component({
  selector: 'app-active-field',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="form-control">
      <label class="label cursor-pointer justify-start gap-3">
        <input type="checkbox" [formField]="field()" class="checkbox" />
        <span class="label-text">Active</span>
      </label>
    </div>
  `,
})
export class ActiveFieldComponent {
  field = input.required<Field<boolean>>();
}
