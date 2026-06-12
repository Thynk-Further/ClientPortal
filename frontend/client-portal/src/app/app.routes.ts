import { Routes } from '@angular/router';

import { authGuard } from './core/guards/auth.guard';
import { clientRoleGuard } from './core/guards/client-role.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard, clientRoleGuard],
    loadComponent: () =>
      import('./core/layout/client-portal-shell.component').then(
        (m) => m.ClientPortalShellComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then(
            (m) => m.DASHBOARD_ROUTES,
          ),
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then(
            (m) => m.PROJECTS_ROUTES,
          ),
      },
      {
        path: 'requests',
        loadChildren: () =>
          import('./features/requests/requests.routes').then(
            (m) => m.REQUESTS_ROUTES,
          ),
      },
      {
        path: 'invoices',
        loadChildren: () =>
          import('./features/invoices/invoices.routes').then(
            (m) => m.INVOICES_ROUTES,
          ),
      },
      {
        path: 'rfqs',
        loadChildren: () =>
          import('./features/rfqs/rfqs.routes').then((m) => m.RFQS_ROUTES),
      },
      {
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then(
            (m) => m.DOCUMENTS_ROUTES,
          ),
      },
      {
        path: 'messages',
        loadChildren: () =>
          import('./features/messages/messages.routes').then(
            (m) => m.MESSAGES_ROUTES,
          ),
      },
      {
        path: 'meetings',
        loadChildren: () =>
          import('./features/meetings/meetings.routes').then(
            (m) => m.MEETINGS_ROUTES,
          ),
      },
      {
        path: 'notices',
        loadChildren: () =>
          import('./features/notices/notices.routes').then(
            (m) => m.NOTICES_ROUTES,
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then(
            (m) => m.PROFILE_ROUTES,
          ),
      },
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
