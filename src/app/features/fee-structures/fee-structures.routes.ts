import { Routes } from '@angular/router';
export const FEE_STRUCTURES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./fee-structures-list/fee-structures-list.component').then(m => m.FeeStructuresListComponent) },
  { path: 'new', loadComponent: () => import('./fee-structure-form/fee-structure-form.component').then(m => m.FeeStructureFormComponent) },
  { path: ':id/edit', loadComponent: () => import('./fee-structure-form/fee-structure-form.component').then(m => m.FeeStructureFormComponent) },
  { path: 'discounts', loadComponent: () => import('./discounts/discounts.component').then(m => m.DiscountsComponent) },
];
