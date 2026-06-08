import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { readHttpErrorMessage } from '../api/api-envelope.util';
import {
  CreateProjectRequest,
  CreateProjectRiskRequest,
  MyTaskItem,
  ProjectApiService,
  ProjectDashboard,
  ProjectListQuery,
  ProjectSummary,
  ProjectTaskStatus,
  UpdateProjectRequest,
  UpdateProjectRiskRequest,
} from '../api/services/project-api.service';

interface ProjectState {
  projects: ProjectSummary[];
  selectedProject: ProjectDashboard | null;
  myTasks: MyTaskItem[];
  totalCount: number;
  myTasksTotalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: ProjectState = {
  projects: [],
  selectedProject: null,
  myTasks: [],
  totalCount: 0,
  myTasksTotalCount: 0,
  isLoading: false,
  error: null,
};

export const ProjectStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, projectApiService = inject(ProjectApiService)) => ({
    async loadProjects(query?: ProjectListQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(projectApiService.getProjects(query));
        patchState(store, {
          projects: result.items,
          totalCount: result.totalCount,
        });
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to load projects.') });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async loadProjectDashboard(projectId: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const dashboard = await firstValueFrom(projectApiService.getProjectDashboard(projectId));
        patchState(store, { selectedProject: dashboard });
      } catch (error) {
        patchState(store, {
          error: readHttpErrorMessage(error, 'Unable to load project workspace.'),
        });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async loadMyTasks(page = 1, pageSize = 50): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(projectApiService.getMyTasks(page, pageSize));
        patchState(store, {
          myTasks: result.items,
          myTasksTotalCount: result.totalCount,
        });
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to load tasks.') });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async createProject(request: CreateProjectRequest): Promise<string | null> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(projectApiService.createProject(request));
        return result.projectId;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to create project.') });
        return null;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async updateProject(projectId: string, request: UpdateProjectRequest): Promise<boolean> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(projectApiService.updateProject(projectId, request));
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to update project.') });
        return false;
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async completeMilestone(projectId: string, milestoneId: string): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.completeMilestone(projectId, milestoneId));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to complete milestone.') });
        return false;
      }
    },

    async changeTaskStatus(
      projectId: string,
      taskId: string,
      status: ProjectTaskStatus,
    ): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.changeTaskStatus(projectId, taskId, status));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to update task status.') });
        return false;
      }
    },

    async createProjectRisk(
      projectId: string,
      request: CreateProjectRiskRequest,
    ): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.createProjectRisk(projectId, request));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to create risk.') });
        return false;
      }
    },

    async updateProjectRisk(
      projectId: string,
      riskId: string,
      request: UpdateProjectRiskRequest,
    ): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.updateProjectRisk(projectId, riskId, request));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to update risk.') });
        return false;
      }
    },

    clearSelectedProject(): void {
      patchState(store, { selectedProject: null });
    },
  })),
);
