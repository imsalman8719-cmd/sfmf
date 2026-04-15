import { Routes } from '@angular/router';

export const INVOICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./invoices-list/invoices-list.component').then(m => m.InvoicesListComponent),
  },
  {
    path: 'waivers',
    loadComponent: () => import('./waivers/waivers.component').then(m => m.WaiversComponent),
  },
  {
    path: ':id',
    loadComponent: () => import('./invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent),
  },
];
