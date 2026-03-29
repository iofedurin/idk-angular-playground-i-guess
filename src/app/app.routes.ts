import { Routes } from '@angular/router';
import { appSwitchGuard } from './app.guard';

export const routes: Routes = [
  { path: '', redirectTo: '/app/acme/users', pathMatch: 'full' },
  {
    path: 'app/:appId',
    canActivate: [appSwitchGuard],
    children: [
      { path: '', redirectTo: 'users', pathMatch: 'full' },
      {
        path: 'users',
        loadComponent: () => import('./pages/users-list').then((m) => m.UsersListComponent),
      },
      {
        path: 'users/new',
        loadComponent: () => import('./pages/user-create').then((m) => m.UserCreatePage),
      },
      {
        path: 'users/:id',
        loadComponent: () => import('./pages/user-edit').then((m) => m.UserEditPage),
      },
    ],
  },
];
