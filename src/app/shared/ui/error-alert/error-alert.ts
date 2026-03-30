import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-error-alert',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'alert alert-error', role: 'alert' },
  template: `<span>{{ message() }}</span>`,
})
export class ErrorAlertComponent {
  readonly message = input.required<string>();
}
