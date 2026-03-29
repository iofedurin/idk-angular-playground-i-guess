import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { createUserForm, User, UserFormModel, UserRole, UsersStore } from '@entities/user';
import { UserFormComponent } from '@widgets/user-form';

@Component({
  selector: 'app-user-edit-page',
  imports: [UserFormComponent],
  template: `
    <app-user-form [userForm]="userForm" [model]="model" title="Edit User" submitLabel="Save" />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserEditPage implements OnInit {
  private readonly router = inject(Router);
  private readonly store = inject(UsersStore);
  private readonly route = inject(ActivatedRoute);
  protected readonly appId = this.route.snapshot.paramMap.get('appId')!;
  protected readonly userId = this.route.snapshot.paramMap.get('id')!;

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
    excludeId: () => this.userId,
    onSubmit: async () => {
      const { name, ...rest } = this.model();
      await this.store.update(this.userId, { ...rest, firstName: name.firstName, lastName: name.lastName });
      await this.router.navigate(['/app', this.appId, 'users']);
    },
  });

  async ngOnInit() {
    if (!this.store.entityMap()[this.userId]) {
      await this.store.loadAll();
    }
    const user = this.store.entityMap()[this.userId];
    if (user) {
      this.patchModel(user);
    }
  }

  private patchModel(user: User) {
    this.model.set({
      username: user.username,
      name: { firstName: user.firstName, lastName: user.lastName },
      email: user.email,
      age: user.age,
      country: user.country,
      department: user.department,
      jobTitle: user.jobTitle,
      role: user.role,
      active: user.active,
      bio: user.bio ?? '',
    });
  }
}
