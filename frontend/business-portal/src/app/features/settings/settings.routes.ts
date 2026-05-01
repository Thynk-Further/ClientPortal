import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./business-settings.component').then(
        (m) => m.BusinessSettingsComponent,
      ),
    data: {
      title: 'Settings',
      description: 'Branding, team members, notification, and tax settings.',
    },
  },
];
