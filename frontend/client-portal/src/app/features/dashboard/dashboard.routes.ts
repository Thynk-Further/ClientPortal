import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-dashboard.component').then((m) => m.ClientDashboardComponent),
    data: {
      title: 'Client Dashboard',
      description:
        'Active projects, outstanding invoices, upcoming meetings, and messages.',
    },
  },
];
