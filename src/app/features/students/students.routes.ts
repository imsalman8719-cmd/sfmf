import { Routes } from '@angular/router';
export const STUDENTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./students-list/students-list.component').then(m => m.StudentsListComponent) },
  { path: 'new', loadComponent: () => import('./student-form/student-form.component').then(m => m.StudentFormComponent) },
  { path: ':id', loadComponent: () => import('./student-detail/student-detail.component').then(m => m.StudentDetailComponent) },
  { path: ':id/edit', loadComponent: () => import('./student-form/student-form.component').then(m => m.StudentFormComponent) },
];
