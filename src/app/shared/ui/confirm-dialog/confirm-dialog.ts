import { ChangeDetectionStrategy, Component, ElementRef, input, output, viewChild } from '@angular/core';

@Component({
  selector: 'app-confirm-dialog',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog #dialog class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">{{ title() }}</h3>
        <p class="py-4">{{ message() }}</p>
        <div class="modal-action">
          <button class="btn" (click)="cancel()">Cancel</button>
          <button class="btn btn-error" (click)="onConfirm()">{{ confirmLabel() }}</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button>close</button></form>
    </dialog>
  `,
})
export class ConfirmDialogComponent {
  readonly title = input('Confirm');
  readonly message = input.required<string>();
  readonly confirmLabel = input('Delete');

  readonly confirmed = output<void>();
  readonly cancelled = output<void>();

  private readonly dialogEl = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');

  open(): void {
    this.dialogEl().nativeElement.showModal();
  }

  cancel(): void {
    this.dialogEl().nativeElement.close();
    this.cancelled.emit();
  }

  onConfirm(): void {
    this.dialogEl().nativeElement.close();
    this.confirmed.emit();
  }
}
