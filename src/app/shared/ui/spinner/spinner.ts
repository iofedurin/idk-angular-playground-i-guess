import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-spinner',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex justify-center py-12' },
  template: `<span class="loading loading-spinner loading-lg"></span>`,
})
export class SpinnerComponent {}
