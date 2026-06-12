import { Routes } from '@angular/router';

export const REQUESTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-requests-page.component').then(
        (m) => m.ClientRequestsPageComponent,
      ),
    data: {
      title: 'Requests',
      description: 'Submit requests and track priority and current status.',
    },
  },
];
