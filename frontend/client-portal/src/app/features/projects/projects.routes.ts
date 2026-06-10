import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./client-projects-list.component').then(
        (m) => m.ClientProjectsListComponent,
      ),
    data: {
      title: 'Projects',
      description: 'Project overview, progress, milestones, and activity timeline.',
    },
  },
];
