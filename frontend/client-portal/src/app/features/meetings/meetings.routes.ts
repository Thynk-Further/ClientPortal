import { Routes } from '@angular/router';

export const MEETINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-meetings.component').then((m) => m.ClientMeetingsComponent),
    data: {
      title: 'Meetings',
      description: 'Upcoming meetings, countdowns, and join-link actions.',
    },
  },
];
