import { Routes } from '@angular/router';

export const MESSAGES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-messages-inbox.component').then(
        (m) => m.ClientMessagesInboxComponent,
      ),
    data: {
      title: 'Messages',
      description: 'Client inbox with conversations and unread message tracking.',
    },
  },
];
