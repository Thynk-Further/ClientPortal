import { Routes } from '@angular/router';

export const PROJECTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./projects-list.component').then((m) => m.ProjectsListComponent),
    data: {
      breadcrumb: 'Projects',
      title: 'Projects',
      description: 'Browse and manage your projects across all clients.',
    },
  },
  {
    path: 'analytics',
    loadComponent: () =>
      import('./project-analytics.component').then((m) => m.ProjectAnalyticsComponent),
    data: {
      breadcrumb: 'Project Analytics',
      title: 'Project Analytics',
      description: 'Portfolio-wide delivery metrics across status, health, tasks, and budget.',
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
