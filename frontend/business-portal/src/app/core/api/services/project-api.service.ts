import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult, PagedResult } from '../models';

export type ProjectStatus = 1 | 2 | 3 | 4 | 5;
export type ProjectHealth = 1 | 2 | 3;
export type ProjectTaskStatus = 1 | 2 | 3 | 4;
export type ProjectTaskPriority = 1 | 2 | 3 | 4;
export type MilestoneStatus = 1 | 2;
export type ProjectRiskSeverity = 1 | 2 | 3 | 4;
export type ProjectRiskStatus = 1 | 2 | 3;
export type ClientRequestStatus = 1 | 2 | 3 | 4 | 5;
export type ClientRequestPriority = 1 | 2 | 3 | 4;

export interface ProjectSummary {
  id: string;
  clientId: string;
  clientCompanyName: string;
  name: string;
  status: ProjectStatus;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  health: ProjectHealth;
}

export interface ProjectTaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  done: number;
}

export interface ProjectDashboardMilestone {
  id: string;
  name: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAtUtc: string | null;
}

export interface ProjectDashboardTask {
  id: string;
  milestoneId: string;
  title: string;
  assigneeId: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  dueDate: string;
}

export interface ProjectDashboardRequest {
  id: string;
  clientId: string;
  title: string;
  description: string;
  status: ClientRequestStatus;
  priority: ClientRequestPriority;
}

export interface ProjectDashboardRisk {
  id: string;
  title: string;
  description: string;
  severity: ProjectRiskSeverity;
  status: ProjectRiskStatus;
  ownerId: string;
  dueDate: string | null;
}

export interface ProjectDashboardActivity {
  occurredAtUtc: string;
  type: string;
  description: string;
}

export interface ProjectDashboard extends ProjectSummary {
  projectId: string;
  clientCompanyName: string;
  description: string;
  openRiskCount: number;
  overdueMilestoneCount: number;
  taskSummary: ProjectTaskSummary;
  milestones: ProjectDashboardMilestone[];
  tasks: ProjectDashboardTask[];
  requests: ProjectDashboardRequest[];
  risks: ProjectDashboardRisk[];
  recentActivity: ProjectDashboardActivity[];
}

export interface MyTaskItem {
  id: string;
  projectId: string;
  projectName: string;
  clientId: string;
  clientCompanyName: string;
  title: string;
  status: ProjectTaskStatus;
  priority: ProjectTaskPriority;
  dueDate: string;
}

export interface ProjectListQuery {
  search?: string;
  status?: ProjectStatus;
  clientId?: string;
  page?: number;
  pageSize?: number;
}

export interface CreateProjectMilestoneRequest {
  name: string;
  dueDate: string;
}

export interface CreateProjectRequest {
  clientId: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
  milestones?: CreateProjectMilestoneRequest[];
}

export interface UpdateProjectRequest {
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  budget: number;
  currency: string;
}

export interface CreateMilestoneRequest {
  name: string;
  dueDate: string;
}

export interface UpdateMilestoneRequest {
  name: string;
  dueDate: string;
  status: MilestoneStatus;
  completedAtUtc?: string | null;
}

export interface CreateTaskRequest {
  milestoneId: string;
  title: string;
  assigneeId: string;
  priority: ProjectTaskPriority;
  dueDate: string;
}

export interface UpdateTaskRequest {
  title: string;
  assigneeId: string;
  priority: ProjectTaskPriority;
  dueDate: string;
}

export interface CreateProjectRiskRequest {
  title: string;
  description: string;
  severity: ProjectRiskSeverity;
  ownerId: string;
  dueDate?: string | null;
}

export interface UpdateProjectRiskRequest extends CreateProjectRiskRequest {
  status: ProjectRiskStatus;
}

@Injectable({ providedIn: 'root' })
export class ProjectApiService {
  private readonly basePath = '/api/v1/projects';

  constructor(private readonly apiClient: ApiClientService) {}

  getProjects(query?: ProjectListQuery): Observable<PagedResult<ProjectSummary>> {
    return this.apiClient
      .get<ApiEnvelope<PagedResult<ProjectSummary>>>(`${this.basePath}/`, query)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getMyTasks(page = 1, pageSize = 50): Observable<PagedResult<MyTaskItem>> {
    return this.apiClient
      .get<ApiEnvelope<PagedResult<MyTaskItem>>>(`${this.basePath}/my-tasks`, { page, pageSize })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getProjectDashboard(projectId: string): Observable<ProjectDashboard> {
    return this.apiClient
      .get<ApiEnvelope<ProjectDashboard>>(`${this.basePath}/${projectId}/dashboard`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  createProject(request: CreateProjectRequest): Observable<{ projectId: string; milestoneIds: string[] }> {
    return this.apiClient
      .post<ApiEnvelope<{ projectId: string; milestoneIds: string[] }>, CreateProjectRequest>(
        `${this.basePath}/`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  updateProject(projectId: string, request: UpdateProjectRequest): Observable<ApiOperationResult> {
    return this.apiClient.put<ApiOperationResult, UpdateProjectRequest>(
      `${this.basePath}/${projectId}`,
      request,
    );
  }

  createMilestone(projectId: string, request: CreateMilestoneRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, CreateMilestoneRequest>(
        `${this.basePath}/${projectId}/milestones`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  updateMilestone(
    projectId: string,
    milestoneId: string,
    request: UpdateMilestoneRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.put<ApiOperationResult, UpdateMilestoneRequest>(
      `${this.basePath}/${projectId}/milestones/${milestoneId}`,
      request,
    );
  }

  deleteMilestone(projectId: string, milestoneId: string): Observable<ApiOperationResult> {
    return this.apiClient.delete<ApiOperationResult>(
      `${this.basePath}/${projectId}/milestones/${milestoneId}`,
    );
  }

  completeMilestone(projectId: string, milestoneId: string): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult>(
      `${this.basePath}/${projectId}/milestones/${milestoneId}/complete`,
    );
  }

  createTask(projectId: string, request: CreateTaskRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, CreateTaskRequest>(
        `${this.basePath}/${projectId}/tasks`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  updateTask(
    projectId: string,
    taskId: string,
    request: UpdateTaskRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.put<ApiOperationResult, UpdateTaskRequest>(
      `${this.basePath}/${projectId}/tasks/${taskId}`,
      request,
    );
  }

  deleteTask(projectId: string, taskId: string): Observable<ApiOperationResult> {
    return this.apiClient.delete<ApiOperationResult>(
      `${this.basePath}/${projectId}/tasks/${taskId}`,
    );
  }

  changeTaskStatus(
    projectId: string,
    taskId: string,
    status: ProjectTaskStatus,
  ): Observable<ApiOperationResult> {
    return this.apiClient.patch<ApiOperationResult, { status: ProjectTaskStatus }>(
      `${this.basePath}/${projectId}/tasks/${taskId}/status`,
      { status },
    );
  }

  createProjectRisk(projectId: string, request: CreateProjectRiskRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, CreateProjectRiskRequest>(
        `${this.basePath}/${projectId}/risks`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  updateProjectRisk(
    projectId: string,
    riskId: string,
    request: UpdateProjectRiskRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.put<ApiOperationResult, UpdateProjectRiskRequest>(
      `${this.basePath}/${projectId}/risks/${riskId}`,
      request,
    );
  }

  deleteProjectRisk(projectId: string, riskId: string): Observable<ApiOperationResult> {
    return this.apiClient.delete<ApiOperationResult>(
      `${this.basePath}/${projectId}/risks/${riskId}`,
    );
  }
}
