import { Routes } from '@angular/router';
import { appSwitchGuard } from './app.guard';
import { LayoutComponent } from './layout';

export const routes: Routes = [
  { path: '', redirectTo: '/app/acme', pathMatch: 'full' },
  {
    path: 'app/:appId',
    component: LayoutComponent,
    canActivate: [appSwitchGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./pages/dashboard').then((m) => m.DashboardPage),
      },
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
        loadComponent: () => import('./pages/user-profile').then((m) => m.UserProfilePage),
      },
      {
        path: 'users/:id/edit',
        loadComponent: () => import('./pages/user-edit').then((m) => m.UserEditPage),
      },
      {
        path: 'departments',
        loadComponent: () =>
          import('./pages/departments-list').then((m) => m.DepartmentsListComponent),
      },
      {
        path: 'departments/new',
        loadComponent: () =>
          import('./pages/department-create').then((m) => m.DepartmentCreatePage),
      },
      {
        path: 'departments/:id',
        loadComponent: () =>
          import('./pages/department-edit').then((m) => m.DepartmentEditPage),
      },
    ],
  },
];
