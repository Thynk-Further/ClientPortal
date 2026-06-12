import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-documents-list.component').then(
        (m) => m.ClientDocumentsListComponent,
      ),
    data: {
      title: 'Documents',
      description: 'Secure document access, downloads, and e-signature actions.',
    },
  },
  {
    path: ':documentId',
    loadComponent: () =>
      import('./client-document-detail.component').then(
        (m) => m.ClientDocumentDetailComponent,
      ),
    data: {
      title: 'Document Detail',
      description: 'View document details, download, and sign contracts.',
    },
  },
];
