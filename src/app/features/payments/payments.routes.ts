import { Routes } from '@angular/router';
export const PAYMENTS_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./payments-list/payments-list.component').then(m => m.PaymentsListComponent) },
  { path: 'new', loadComponent: () => import('./record-payment/record-payment.component').then(m => m.RecordPaymentComponent) },
  { path: ':id', loadComponent: () => import('./payment-detail/payment-detail.component').then(m => m.PaymentDetailComponent) },
];
