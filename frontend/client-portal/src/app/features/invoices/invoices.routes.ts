import { Routes } from '@angular/router';

export const INVOICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-invoices-list.component').then(
        (m) => m.ClientInvoicesListComponent,
      ),
    data: {
      title: 'Invoices',
      description: 'Invoice list, details, and online payment flow.',
    },
  },
  {
    path: ':invoiceId',
    loadComponent: () =>
      import('./client-invoice-detail.component').then(
        (m) => m.ClientInvoiceDetailComponent,
      ),
    data: {
      title: 'Invoice Detail',
      description: 'Invoice line items, totals, and online payment.',
    },
  },
];
