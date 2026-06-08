import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: 'accept-invitation',
    loadComponent: () =>
      import('./accept-invitation-screen.component').then(
        (m) => m.AcceptInvitationScreenComponent,
      ),
    data: {
      title: 'Accept invitation',
      description: 'Set your password and activate your client portal account.',
    },
  },
  {
    path: '',
    loadComponent: () =>
      import('../feature-shell/feature-shell.component').then(
        (m) => m.FeatureShellComponent,
      ),
    data: {
      title: 'Client Authentication',
      description: 'Sign in to your client portal workspace.',
    },
  },
];
