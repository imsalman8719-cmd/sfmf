import { Routes } from '@angular/router';
export const USERS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./users-list/users-list.component').then(m => m.UsersListComponent) },
  { path: 'new', loadComponent: () => import('./user-form/user-form.component').then(m => m.UserFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./user-form/user-form.component').then(m => m.UserFormComponent) },
];
