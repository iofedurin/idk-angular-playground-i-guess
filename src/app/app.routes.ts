import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', redirectTo: 'users', pathMatch: 'full' },
  {
    path: 'users',
    loadComponent: () =>
      import('./pages/users-list').then((m) => m.UsersListComponent),
  },
  {
    path: 'users/new',
    loadComponent: () =>
      import('./pages/user-create').then((m) => m.UserCreatePage),
  },
  {
    path: 'users/:id',
    loadComponent: () =>
      import('./pages/user-edit').then((m) => m.UserEditPage),
  },
];
