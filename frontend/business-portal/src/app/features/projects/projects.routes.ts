import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./projects-list.component').then((m) => m.ProjectsListComponent),
    data: {
      breadcrumb: 'Projects',
      title: 'Projects',
      description: 'Project list across all clients.',
    },
  },
  {
    path: 'my-tasks',
    loadComponent: () =>
      import('./my-tasks.component').then((m) => m.MyTasksComponent),
    data: {
      breadcrumb: 'Kanban',
      title: 'My Tasks',
      description: 'Cross-client task inbox.',
    },
  },
  {
    path: ':projectId',
    loadComponent: () =>
      import('./project-detail.component').then((m) => m.ProjectDetailComponent),
    data: {
      title: 'Project Detail',
      description: 'Project workspace with milestones, tasks, and risks.',
    },
  },
];
