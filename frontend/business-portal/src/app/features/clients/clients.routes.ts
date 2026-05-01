import { Routes } from '@angular/router';

export const CLIENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./clients-list.component').then((m) => m.ClientsListComponent),
    data: {
      title: 'Clients',
      description: 'Client list, onboarding, and detailed client profile views.',
    },
  },
  {
    path: ':clientId',
    loadComponent: () =>
      import('./client-detail.component').then((m) => m.ClientDetailComponent),
    data: {
      title: 'Client Detail',
      description: 'Overview, projects, invoices, documents, messages, and requests.',
    },
  },
];
