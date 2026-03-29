import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { FieldTree } from '@angular/forms/signals';
import { FirstNameFieldComponent } from '../first-name-field/first-name-field';
import { LastNameFieldComponent } from '../last-name-field/last-name-field';

export interface NameModel {
  firstName: string;
  lastName: string;
}

@Component({
  selector: 'app-name-group',
  imports: [FirstNameFieldComponent, LastNameFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-first-name-field [field]="field().firstName" />
    <app-last-name-field [field]="field().lastName" />
  `,
})
export class NameGroupComponent {
  field = input.required<FieldTree<NameModel>>();
}
