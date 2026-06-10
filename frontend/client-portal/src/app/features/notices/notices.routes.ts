import { Routes } from '@angular/router';

export const NOTICES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-notices.component').then((m) => m.ClientNoticesComponent),
    data: {
      title: 'Notices',
      description: 'Company announcements and read/unread state handling.',
    },
  },
];
