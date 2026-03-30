import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { InvitationStore, InviteFormModel, InviteRole } from '@entities/invitation';
import { EmailFieldComponent, RoleFieldComponent, roleSchema, userEmailSchema } from '@entities/user';

@Component({
  selector: 'app-user-invite-dialog',
  imports: [FormRoot, EmailFieldComponent, RoleFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <dialog class="modal" #dialog>
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Invite User</h3>

        <form [formRoot]="inviteForm" class="flex flex-col gap-4">
          <app-email-field [field]="inviteForm.email" />
          <app-role-field [field]="inviteForm.role" />

          <div class="modal-action mt-0">
            <button type="submit" [disabled]="inviteForm().submitting()" class="btn btn-primary">Send Invite</button>
            <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancel</button>
          </div>
        </form>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button (click)="closed.emit()">close</button>
      </form>
    </dialog>
  `,
})
export class UserInviteDialogComponent {
  readonly open = input.required<boolean>();
  readonly appId = input.required<string>();
  readonly closed = output<void>();

  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly store = inject(InvitationStore);

  private readonly model = signal<InviteFormModel>({ email: '', role: '' as InviteRole });

  protected readonly inviteForm = form(
    this.model,
    (s) => {
      userEmailSchema(s.email);
      roleSchema(s.role);
    },
    {
      submission: {
        action: async () => {
          await this.store.create({
            email: this.model().email,
            role: this.model().role,
            appId: this.appId(),
          });
          this.closed.emit();
          return undefined;
        },
      },
    },
  );

  constructor() {
    effect(() => {
      const dialog = this.dialogRef()?.nativeElement;
      if (!dialog) return;
      if (this.open()) {
        dialog.showModal();
      } else {
        dialog.close();
        this.inviteForm().reset();
        this.model.set({ email: '', role: '' as InviteRole });
      }
    });
  }
}
