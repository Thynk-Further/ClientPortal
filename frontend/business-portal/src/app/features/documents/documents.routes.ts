import { Routes } from '@angular/router';

export const DOCUMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./documents-library.component').then(
        (m) => m.DocumentsLibraryComponent,
      ),
    data: {
      title: 'Documents',
      description: 'Document library, upload, preview, and contract signing.',
    },
  },
];
