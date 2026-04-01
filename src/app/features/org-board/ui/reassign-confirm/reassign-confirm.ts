import { ChangeDetectionStrategy, Component, computed, effect, input, output, viewChild } from '@angular/core';
import { ConfirmDialogComponent } from '@shared/ui';
import type { PendingConnection } from '../../org-board.model';

@Component({
  selector: 'app-reassign-confirm',
  imports: [ConfirmDialogComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <app-confirm-dialog
      #confirmDialog
      title="Reassign manager"
      [message]="message()"
      confirmLabel="Reassign"
      (confirmed)="onConfirm()"
      (cancelled)="onCancel()"
    />
  `,
})
export class ReassignConfirmComponent {
  readonly pending = input.required<PendingConnection | null>();
  readonly confirmed = output<PendingConnection>();
  readonly cancelled = output<void>();

  private readonly confirmDialogRef = viewChild<ConfirmDialogComponent>('confirmDialog');

  protected readonly message = computed(() => {
    const p = this.pending();
    if (!p) return '';
    return `${p.subordinateName} already reports to ${p.currentManagerName}. Reassign to ${p.newManagerName}?`;
  });

  constructor() {
    // Imperative DOM: ConfirmDialogComponent.open() calls showModal() — legitimate effect() use (ADR-0009)
    effect(() => {
      if (this.pending()) {
        this.confirmDialogRef()?.open();
      }
    });
  }

  protected onConfirm(): void {
    const p = this.pending();
    if (p) this.confirmed.emit(p);
  }

  protected onCancel(): void {
    this.cancelled.emit();
  }
}
