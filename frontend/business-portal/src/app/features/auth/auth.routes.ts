import { Routes } from '@angular/router';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./login-screen.component').then((m) => m.LoginScreenComponent),
    data: {
      title: 'Sign in',
      description: 'Email and password authentication for business portal users.',
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
      description: 'Password reset flow placeholder for business portal users.',
    },
  },
];
