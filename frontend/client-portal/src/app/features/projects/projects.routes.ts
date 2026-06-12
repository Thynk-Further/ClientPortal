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
  {
    path: ':projectId',
    loadComponent: () =>
      import('./client-project-detail.component').then(
        (m) => m.ClientProjectDetailComponent,
      ),
    data: {
      title: 'Project Detail',
      description: 'Milestones, tasks, documents, messages, and requests for a project.',
    },
  },
];
