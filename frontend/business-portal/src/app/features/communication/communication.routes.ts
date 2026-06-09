import { Routes } from '@angular/router';

export const COMMUNICATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./messages-inbox.component').then((m) => m.MessagesInboxComponent),
    data: {
      breadcrumb: 'Inbox & Threads',
      title: 'Communication',
      description: 'Messages, meetings, and notices management.',
    },
  },
  {
    path: 'meetings',
    loadComponent: () =>
      import('./meetings-hub.component').then((m) => m.MeetingsHubComponent),
    data: {
      breadcrumb: 'Meetings Calendar',
      title: 'Meetings',
      description: 'Calendar and list views with meeting scheduler form.',
    },
  },
  {
    path: 'notices',
    loadComponent: () =>
      import('./notices-manager.component').then((m) => m.NoticesManagerComponent),
    data: {
      breadcrumb: 'Notices',
      title: 'Notices',
      description: 'Publish, archive, and target notices to specific clients.',
    },
  },
];
