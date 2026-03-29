import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { Field, FormField } from '@angular/forms/signals';

@Component({
  selector: 'app-bio-field',
  imports: [FormField],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <fieldset class="fieldset">
      <legend class="fieldset-legend">Bio</legend>
      <textarea
        [formField]="field()"
        class="textarea w-full h-24"
        placeholder="Tell us about yourself..."
      ></textarea>
    </fieldset>
  `,
})
export class BioFieldComponent {
  field = input.required<Field<string>>();
}
