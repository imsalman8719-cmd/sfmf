import { Routes } from '@angular/router';
export const REPORTS_ROUTES: Routes = [
  { path: '', redirectTo: 'target-vs-actual', pathMatch: 'full' },
  { path: 'target-vs-actual', loadComponent: () => import('./target-vs-actual/target-vs-actual.component').then(m => m.TargetVsActualComponent) },
  { path: 'defaulters', loadComponent: () => import('./defaulters/defaulters.component').then(m => m.DefaultersComponent) },
  { path: 'class-wise', loadComponent: () => import('./class-wise/class-wise.component').then(m => m.ClassWiseComponent) },
  { path: 'outstanding', loadComponent: () => import('./outstanding/outstanding.component').then(m => m.OutstandingComponent) },
  { path: 'student-statement/:id', loadComponent: () => import('./student-statement/student-statement.component').then(m => m.StudentStatementComponent) },
];
