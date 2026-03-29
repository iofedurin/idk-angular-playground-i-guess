import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'app-submit-button',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button type="submit" [disabled]="pending()" class="btn btn-primary w-full">
      <ng-content />
    </button>
  `,
})
export class SubmitButtonComponent {
  pending = input(false);
}
