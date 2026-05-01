import { Routes } from '@angular/router';

export const DASHBOARD_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./business-dashboard.component').then(
        (m) => m.BusinessDashboardComponent,
      ),
    data: {
      title: 'Business Dashboard',
      description: 'Overview metrics, activity feed, and owner KPIs.',
    },
  },
];
