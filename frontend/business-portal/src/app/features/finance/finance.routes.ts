import { Routes } from '@angular/router';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./invoice-list.component').then((m) => m.InvoiceListComponent),
    data: {
      title: 'Finance',
      description:
        'Invoices, quotes, payment workflows, and reporting screens.',
    },
  },
  {
    path: 'quotes',
    loadComponent: () =>
      import('./quote-list.component').then((m) => m.QuoteListComponent),
    data: {
      title: 'Quotes',
      description: 'Quote list and acceptance workflow tracking.',
    },
  },
  {
    path: 'quotes/create',
    loadComponent: () =>
      import('./quote-builder.component').then((m) => m.QuoteBuilderComponent),
    data: {
      title: 'Quote Builder',
      description: 'Create quote with line item composition.',
    },
  },
  {
    path: 'quotes/:quoteId',
    loadComponent: () =>
      import('./quote-workflow.component').then((m) => m.QuoteWorkflowComponent),
    data: {
      title: 'Quote Workflow',
      description: 'Send, accept, and reject quote workflow state.',
    },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create-invoice-wizard.component').then(
        (m) => m.CreateInvoiceWizardComponent,
      ),
    data: {
      title: 'Create Invoice',
      description: 'Multi-step wizard for invoice creation.',
    },
  },
  {
    path: ':invoiceId',
    loadComponent: () =>
      import('./invoice-detail.component').then((m) => m.InvoiceDetailComponent),
    data: {
      title: 'Invoice Detail',
      description: 'Invoice detail and payment recording workflow.',
    },
  },
];
