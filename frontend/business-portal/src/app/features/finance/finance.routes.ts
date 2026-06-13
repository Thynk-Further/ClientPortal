import { Routes } from '@angular/router';

export const FINANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./invoice-list.component').then((m) => m.InvoiceListComponent),
    data: {
      breadcrumb: 'Invoices',
      title: 'Finance',
      description:
        'Invoices, quotes, payment workflows, and reporting screens.',
    },
  },
  {
    path: 'rfqs',
    loadComponent: () =>
      import('./rfq-list.component').then((m) => m.RfqListComponent),
    data: { breadcrumb: 'RFQs', title: 'Client RFQs' },
  },
  {
    path: 'rfqs/:rfqId',
    loadComponent: () =>
      import('./rfq-detail.component').then((m) => m.RfqDetailComponent),
    data: { breadcrumb: 'RFQ Detail', title: 'RFQ Detail' },
  },
  {
    path: 'purchase-orders',
    loadComponent: () =>
      import('./purchase-order-list.component').then((m) => m.PurchaseOrderListComponent),
    data: { breadcrumb: 'Purchase Orders', title: 'Purchase Orders' },
  },
  {
    path: 'purchase-orders/:poId',
    loadComponent: () =>
      import('./purchase-order-detail.component').then((m) => m.PurchaseOrderDetailComponent),
    data: { breadcrumb: 'Purchase Order', title: 'Purchase Order' },
  },
  {
    path: 'quotes',
    loadComponent: () =>
      import('./quote-list.component').then((m) => m.QuoteListComponent),
    data: {
      breadcrumb: 'Quotes',
      title: 'Quotes',
      description: 'Quote list and acceptance workflow tracking.',
    },
  },
  {
    path: 'quotes/create',
    loadComponent: () =>
      import('./quote-builder.component').then((m) => m.QuoteBuilderComponent),
    data: {
      breadcrumb: 'Create Quote',
      title: 'Create Quote',
      description: 'Prepare a formal client quotation.',
    },
  },
  {
    path: 'quotes/:quoteId',
    loadComponent: () =>
      import('./quote-workflow.component').then((m) => m.QuoteWorkflowComponent),
    data: {
      breadcrumb: 'Quote',
      title: 'Quote',
      description: 'Review, edit, and send client quotations.',
    },
  },
  {
    path: 'summary',
    loadComponent: () =>
      import('./financial-summary.component').then((m) => m.FinancialSummaryComponent),
    data: {
      breadcrumb: 'Financial Summary',
      title: 'Financial Summary',
      description: 'Finance pipeline metrics, collections, and aging analytics.',
    },
  },
  {
    path: 'create',
    loadComponent: () =>
      import('./create-invoice-wizard.component').then(
        (m) => m.CreateInvoiceWizardComponent,
      ),
    data: {
      breadcrumb: 'Invoice Wizard',
      title: 'Create Invoice',
      description: 'Multi-step wizard for invoice creation.',
    },
  },
  {
    path: ':invoiceId',
    loadComponent: () =>
      import('./invoice-detail.component').then((m) => m.InvoiceDetailComponent),
    data: {
      breadcrumb: 'Invoice Detail',
      title: 'Invoice Detail',
      description: 'Invoice detail and payment recording workflow.',
    },
  },
];
