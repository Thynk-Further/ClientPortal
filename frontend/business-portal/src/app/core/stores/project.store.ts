import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import { readHttpErrorMessage } from '../api/api-envelope.util';
import {
  CreateMilestoneRequest,
  CreateProjectRequest,
  CreateProjectRiskRequest,
  CreateTaskRequest,
  ProjectAnalytics,
  ProjectApiService,
  ProjectDashboard,
  ProjectListQuery,
  ProjectSummary,
  ProjectTaskStatus,
  UpdateMilestoneRequest,
  UpdateProjectRequest,
  UpdateProjectRiskRequest,
  UpdateTaskRequest,
} from '../api/services/project-api.service';

interface ProjectState {
  projects: ProjectSummary[];
  selectedProject: ProjectDashboard | null;
  analytics: ProjectAnalytics | null;
  totalCount: number;
  isLoading: boolean;
  analyticsLoading: boolean;
  error: string | null;
  analyticsError: string | null;
}

const initialState: ProjectState = {
  projects: [],
  selectedProject: null,
  analytics: null,
  totalCount: 0,
  isLoading: false,
  analyticsLoading: false,
  error: null,
  analyticsError: null,
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

    async loadProjectAnalytics(): Promise<void> {
      patchState(store, { analyticsLoading: true, analyticsError: null });
      try {
        const analytics = await firstValueFrom(projectApiService.getProjectAnalytics());
        patchState(store, { analytics });
      } catch (error) {
        patchState(store, {
          analyticsError: readHttpErrorMessage(error, 'Unable to load project analytics.'),
        });
      } finally {
        patchState(store, { analyticsLoading: false });
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

    async createMilestone(projectId: string, request: CreateMilestoneRequest): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.createMilestone(projectId, request));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to create milestone.') });
        return false;
      }
    },

    async updateMilestone(
      projectId: string,
      milestoneId: string,
      request: UpdateMilestoneRequest,
    ): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.updateMilestone(projectId, milestoneId, request));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to update milestone.') });
        return false;
      }
    },

    async deleteMilestone(projectId: string, milestoneId: string): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.deleteMilestone(projectId, milestoneId));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to delete milestone.') });
        return false;
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

    async createTask(projectId: string, request: CreateTaskRequest): Promise<string | null> {
      try {
        const taskId = await firstValueFrom(projectApiService.createTask(projectId, request));
        await this.loadProjectDashboard(projectId);
        return taskId;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to create task.') });
        return null;
      }
    },

    async updateTask(
      projectId: string,
      taskId: string,
      request: UpdateTaskRequest,
    ): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.updateTask(projectId, taskId, request));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to update task.') });
        return false;
      }
    },

    async deleteTask(projectId: string, taskId: string): Promise<boolean> {
      try {
        await firstValueFrom(projectApiService.deleteTask(projectId, taskId));
        await this.loadProjectDashboard(projectId);
        return true;
      } catch (error) {
        patchState(store, { error: readHttpErrorMessage(error, 'Unable to delete task.') });
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
