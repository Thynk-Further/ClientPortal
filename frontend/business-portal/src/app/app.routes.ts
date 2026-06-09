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
  { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
  {
    path: '',
    canActivate: [authGuard, tenantGuard],
    loadComponent: () =>
      import('./core/layout/authenticated-toolbar.component').then(
        (m) => m.AuthenticatedToolbarComponent,
      ),
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/business-dashboard.component').then(
            (m) => m.BusinessDashboardComponent,
          ),
        data: {
          initialView: 'dashboard',
        },
      },
      {
        path: 'clients/workspace',
        loadComponent: () =>
          import('./features/dashboard/business-dashboard.component').then(
            (m) => m.BusinessDashboardComponent,
          ),
        data: {
          initialView: 'client-workspace',
          breadcrumb: 'Client Workspace',
        },
      },
      {
        path: 'clients/invite-onboarding',
        loadComponent: () =>
          import('./features/clients/client-invite-onboarding.component').then(
            (m) => m.ClientInviteOnboardingComponent,
          ),
        data: {
          breadcrumb: 'Invite & Onboard',
        },
      },
      {
        path: 'clients',
        loadComponent: () =>
          import('./features/dashboard/business-dashboard.component').then(
            (m) => m.BusinessDashboardComponent,
          ),
        data: {
          initialView: 'client-list',
          breadcrumb: 'Client List',
        },
      },
      {
        path: 'clients/:clientId',
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./features/clients/client-detail.component').then(
                (m) => m.ClientDetailComponent,
              ),
          },
          {
            path: 'projects/:projectId',
            loadComponent: () =>
              import('./features/projects/project-detail.component').then(
                (m) => m.ProjectDetailComponent,
              ),
          },
        ],
      },
      {
        path: 'projects',
        loadChildren: () =>
          import('./features/projects/projects.routes').then(
            (m) => m.PROJECTS_ROUTES,
          ),
      },
      {
        path: 'finance',
        loadChildren: () =>
          import('./features/finance/finance.routes').then(
            (m) => m.FINANCE_ROUTES,
          ),
      },
      {
        path: 'documents',
        loadChildren: () =>
          import('./features/documents/documents.routes').then(
            (m) => m.DOCUMENTS_ROUTES,
          ),
      },
      {
        path: 'communication',
        loadChildren: () =>
          import('./features/communication/communication.routes').then(
            (m) => m.COMMUNICATION_ROUTES,
          ),
      },
      {
        path: 'reports',
        loadChildren: () =>
          import('./features/reports/reports.routes').then(
            (m) => m.REPORTS_ROUTES,
          ),
      },
      {
        path: 'settings',
        canActivate: [roleGuard],
        data: { roles: ['Owner', 'Admin'] },
        loadChildren: () =>
          import('./features/settings/settings.routes').then(
            (m) => m.SETTINGS_ROUTES,
          ),
      },
    ],
  },
  { path: '**', redirectTo: 'dashboard' },
];
