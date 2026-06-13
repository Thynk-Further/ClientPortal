import { Routes } from '@angular/router';

export const RFQS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-rfqs-page.component').then((m) => m.ClientRfqsPageComponent),
  },
  {
    path: 'quotations/:quotationId',
    loadComponent: () =>
      import('./client-quotation-detail.component').then((m) => m.ClientQuotationDetailComponent),
  },
  {
    path: ':rfqId',
    loadComponent: () =>
      import('./client-rfq-detail.component').then((m) => m.ClientRfqDetailComponent),
  },
];
