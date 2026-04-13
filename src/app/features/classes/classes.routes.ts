import { Routes } from '@angular/router';
export const CLASSES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./classes-list/classes-list.component').then(m => m.ClassesListComponent) },
  { path: 'new', loadComponent: () => import('./class-form/class-form.component').then(m => m.ClassFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./class-form/class-form.component').then(m => m.ClassFormComponent) },
];
