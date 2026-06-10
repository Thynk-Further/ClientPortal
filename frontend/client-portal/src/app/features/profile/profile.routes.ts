import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-profile.component').then((m) => m.ClientProfileComponent),
    data: {
      title: 'Profile',
      description: 'Manage personal details, password, and notification settings.',
    },
  },
];
