import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  effect,
  inject,
  input,
  signal,
  viewChild,
} from '@angular/core';
import { form, FormRoot } from '@angular/forms/signals';
import { InvitationStore, InviteFormModel } from '@entities/invitation';
import { EmailFieldComponent, RoleFieldComponent, UserRole, roleSchema, userEmailSchema } from '@entities/user';

@Component({
  selector: 'app-user-invite-dialog',
  imports: [FormRoot, EmailFieldComponent, RoleFieldComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { style: 'display: contents' },
  template: `
    <span style="display: contents" (click)="open.set(true)">
      <ng-content />
    </span>

    <dialog class="modal" #dialog>
      <div class="modal-box">
        <h3 class="font-bold text-lg mb-4">Invite User</h3>

        <form [formRoot]="inviteForm" class="flex flex-col gap-4">
          <app-email-field [field]="inviteForm.email" />
          <app-role-field [field]="inviteForm.role" />

          <div class="modal-action mt-0">
            <button type="submit" [disabled]="inviteForm().submitting()" class="btn btn-primary">Send Invite</button>
            <button type="button" class="btn btn-ghost" (click)="close()">Cancel</button>
          </div>
        </form>
      </div>

      <form method="dialog" class="modal-backdrop">
        <button (click)="close()">close</button>
      </form>
    </dialog>
  `,
})
export class UserInviteDialogComponent {
  readonly appId = input.required<string>();

  protected readonly open = signal(false);
  private readonly dialogRef = viewChild<ElementRef<HTMLDialogElement>>('dialog');
  private readonly store = inject(InvitationStore);

  private readonly model = signal<InviteFormModel>({ email: '', role: '' as UserRole });

  protected readonly inviteForm = form(
    this.model,
    (s) => {
      userEmailSchema(s.email);
      roleSchema(s.role);
    },
    {
      submission: {
        action: async () => {
          const invitation = await this.store.create({
            email: this.model().email,
            role: this.model().role,
            appId: this.appId(),
          });
          if (invitation) this.close();
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
        this.model.set({ email: '', role: '' as UserRole });
      }
    });
  }

  protected close(): void {
    this.open.set(false);
  }
}
