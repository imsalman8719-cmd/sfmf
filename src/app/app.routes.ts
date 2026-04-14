import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then(m => m.AUTH_ROUTES),
  },
  {
    path: '',
    loadComponent: () => import('./shared/components/layout/layout.component').then(m => m.LayoutComponent),
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', loadComponent: () => import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent) },
      { path: 'students', loadChildren: () => import('./features/students/students.routes').then(m => m.STUDENTS_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance', 'admission', 'teacher'] } },
      { path: 'classes', loadChildren: () => import('./features/classes/classes.routes').then(m => m.CLASSES_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance', 'admission', 'teacher'] } },
      { path: 'fee-structures', loadChildren: () => import('./features/fee-structures/fee-structures.routes').then(m => m.FEE_STRUCTURES_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance'] } },
      { path: 'student-fee-plans', loadChildren: () => import('./features/student-fee-plans/student-fee-plans.routes').then(m => m.STUDENT_FEE_PLAN_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance'] } },
      { path: 'invoices', loadChildren: () => import('./features/invoices/invoices.routes').then(m => m.INVOICES_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance', 'teacher', 'student'] } },
      { path: 'payments', loadChildren: () => import('./features/payments/payments.routes').then(m => m.PAYMENTS_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance'] } },
      { path: 'reports', loadChildren: () => import('./features/reports/reports.routes').then(m => m.REPORTS_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance'] } },
      { path: 'users', loadChildren: () => import('./features/users/users.routes').then(m => m.USERS_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin'] } },
      { path: 'academic-years', loadChildren: () => import('./features/academic-years/academic-years.routes').then(m => m.ACADEMIC_YEARS_ROUTES), canActivate: [roleGuard], data: { roles: ['super_admin', 'finance'] } },
      { path: 'settings', loadComponent: () => import('./features/settings/settings.component').then(m => m.SettingsComponent), canActivate: [roleGuard], data: { roles: ['super_admin'] } },
    ],
  },
  { path: '**', redirectTo: '' },
];
