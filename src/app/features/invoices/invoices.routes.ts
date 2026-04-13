import { Routes } from '@angular/router';
export const INVOICES_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./invoices-list/invoices-list.component').then(m => m.InvoicesListComponent) },
  { path: 'generate', loadComponent: () => import('./generate-invoice/generate-invoice.component').then(m => m.GenerateInvoiceComponent) },
  { path: 'bulk-generate', loadComponent: () => import('./bulk-generate/bulk-generate.component').then(m => m.BulkGenerateComponent) },
  { path: 'waivers', loadComponent: () => import('./waivers/waivers.component').then(m => m.WaiversComponent) },
  { path: ':id', loadComponent: () => import('./invoice-detail/invoice-detail.component').then(m => m.InvoiceDetailComponent) },
];
