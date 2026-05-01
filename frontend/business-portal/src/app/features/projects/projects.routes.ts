import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./projects-list.component').then((m) => m.ProjectsListComponent),
    data: {
      title: 'Projects',
      description: 'Project list, detail pages, and kanban task workflows.',
    },
  },
  {
    path: ':projectId',
    loadComponent: () =>
      import('./project-detail.component').then((m) => m.ProjectDetailComponent),
    data: {
      title: 'Project Detail',
      description: 'Project detail with kanban board view for execution tasks.',
    },
  },
];
