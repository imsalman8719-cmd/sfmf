import { Routes } from '@angular/router';
export const ACADEMIC_YEARS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./academic-years-list/academic-years-list.component').then(m => m.AcademicYearsListComponent) },
  { path: 'new', loadComponent: () => import('./academic-year-form/academic-year-form.component').then(m => m.AcademicYearFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./academic-year-form/academic-year-form.component').then(m => m.AcademicYearFormComponent) },
];
