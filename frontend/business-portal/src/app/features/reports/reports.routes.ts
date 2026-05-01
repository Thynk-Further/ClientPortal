import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./business-reports.component').then((m) => m.BusinessReportsComponent),
    data: {
      title: 'Reports',
      description:
        'Financial summary charts, project status overview, and client activity.',
    },
  },
];
