import { Routes } from '@angular/router';
export const STUDENT_FEE_PLAN_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./plans-list/plans-list.component').then(m => m.PlansListComponent) },
  { path: 'assign', loadComponent: () => import('./assign-plan/assign-plan.component').then(m => m.AssignPlanComponent) },
];
