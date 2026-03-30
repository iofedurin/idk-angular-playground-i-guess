import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CountryStore } from '../../country.store';

@Component({
  selector: 'app-country-options',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    @for (c of store.countries(); track c.code) {
      <option [value]="c.code">{{ c.name }}</option>
    }
  `,
})
export class CountryOptionsComponent {
  protected readonly store = inject(CountryStore);
}
