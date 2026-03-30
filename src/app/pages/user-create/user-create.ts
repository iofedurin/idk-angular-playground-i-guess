import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { createUserForm, UserFormModel, UserRole, UsersStore } from '@entities/user';
import { UserFormComponent } from '@widgets/user-form';

@Component({
  selector: 'app-user-create-page',
  imports: [UserFormComponent],
  template: `
    <app-user-form [userForm]="userForm" [model]="model" title="New User" submitLabel="Create" [cancelLink]="['/app', appId, 'users']" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserCreatePage {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);
  protected readonly appId = inject(ActivatedRoute).snapshot.paramMap.get('appId')!;

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
      const user = await this.store.create({ ...rest, firstName: name.firstName, lastName: name.lastName });
      if (user) await this.router.navigate(['/app', this.appId, 'users']);
    },
  });
}
