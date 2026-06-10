import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./login-screen.component').then((m) => m.LoginScreenComponent),
    data: {
      title: 'Sign in',
      description: 'Email and password authentication for client portal users.',
    },
  },
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
    path: 'forgot-password',
    loadComponent: () =>
      import('../feature-shell/feature-shell.component').then(
        (m) => m.FeatureShellComponent,
      ),
    data: {
      title: 'Forgot Password',
      description: 'Password reset flow placeholder for client portal users.',
    },
  },
];
