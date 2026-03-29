import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { createUserForm, UserFormModel, UserRole, UsersStore } from '@entities/user';
import { UserFormComponent } from '@widgets/user-form';

@Component({
  selector: 'app-user-create-page',
  imports: [UserFormComponent],
  template: `
    <app-user-form [userForm]="userForm" [model]="model" title="New User" submitLabel="Create" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreatePage {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);

  protected readonly model = signal<UserFormModel>({
    username: '',
    name: { firstName: '', lastName: '' },
    email: '',
    age: 0,
    country: '',
    department: '',
    jobTitle: '',
    role: 'viewer' as UserRole,
    active: false,
    bio: '',
  });

  protected readonly userForm = createUserForm(this.model, {
    onSubmit: async () => {
      const { name, ...rest } = this.model();
      await this.store.create({ ...rest, firstName: name.firstName, lastName: name.lastName });
      await this.router.navigate(['/users']);
    },
  });
}
