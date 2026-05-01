import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { roleGuard } from './core/guards/role.guard';
import { tenantGuard } from './core/guards/tenant.guard';

export const routes: Routes = [
  {
    path: 'auth',
    loadChildren: () =>
      import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'dashboard',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/dashboard/dashboard.routes').then(
        (m) => m.DASHBOARD_ROUTES,
      ),
  },
  {
    path: 'clients',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/clients/clients.routes').then((m) => m.CLIENTS_ROUTES),
  },
  {
    path: 'projects',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/projects/projects.routes').then(
        (m) => m.PROJECTS_ROUTES,
      ),
  },
  {
    path: 'finance',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/finance/finance.routes').then((m) => m.FINANCE_ROUTES),
  },
  {
    path: 'documents',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/documents/documents.routes').then(
        (m) => m.DOCUMENTS_ROUTES,
      ),
  },
  {
    path: 'communication',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/communication/communication.routes').then(
        (m) => m.COMMUNICATION_ROUTES,
      ),
  },
  {
    path: 'reports',
    canActivate: [authGuard, tenantGuard],
    loadChildren: () =>
      import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
  },
  {
    path: 'settings',
    canActivate: [authGuard, tenantGuard, roleGuard],
    data: { roles: ['Owner', 'Admin'] },
    loadChildren: () =>
      import('./features/settings/settings.routes').then(
        (m) => m.SETTINGS_ROUTES,
      ),
  },
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  { path: '**', redirectTo: 'dashboard' },
];
