import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from './api-envelope.util';
import { ApiClientService } from './api-client.service';
import { ApiEnvelope } from './models';

export interface ClientPortalProjectCard {
  id: string;
  name: string;
  status: number;
  endDate: string;
}

export interface ClientPortalInvoiceCard {
  id: string;
  invoiceNumber: string;
  status: number;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
}

export interface ClientPortalOutstandingInvoices {
  openCount: number;
  overdueCount: number;
  totalOutstanding: number;
  currency: string;
  recentOpenInvoices: ClientPortalInvoiceCard[];
}

export interface ClientPortalDocumentCard {
  id: string;
  name: string;
  type: string;
  status: string;
  updatedAtUtc: string;
}

export interface ClientPortalMeetingCard {
  id: string;
  clientId: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string;
  status: number;
  attendees: string[];
}

export interface ClientPortalMessagesSummary {
  unreadCount: number;
  totalThreads: number;
}

export interface ClientPortalDashboard {
  greetingName: string;
  activeProjects: ClientPortalProjectCard[];
  outstandingInvoices: ClientPortalOutstandingInvoices;
  recentDocuments: ClientPortalDocumentCard[];
  upcomingMeetings: ClientPortalMeetingCard[];
  messages: ClientPortalMessagesSummary;
}

export interface ClientPortalMilestoneProgress {
  totalCount: number;
  completedCount: number;
  progressPercent: number;
}

export interface ClientPortalProjectActivity {
  occurredAtUtc: string;
  type: string;
  description: string;
}

export interface ClientPortalProjectListItem {
  id: string;
  name: string;
  status: number;
  startDate: string;
  endDate: string;
  milestoneProgress: ClientPortalMilestoneProgress;
  recentActivity: ClientPortalProjectActivity[];
}

export interface ClientPortalProjectsResult {
  projects: ClientPortalProjectListItem[];
}

export interface ClientPortalMilestone {
  id: string;
  name: string;
  dueDate: string;
  status: number;
  completedAtUtc: string | null;
}

export interface ClientPortalTask {
  id: string;
  milestoneId: string;
  title: string;
  status: number;
  priority: number;
  dueDate: string;
}

export interface ClientPortalMessageThread {
  id: string;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ClientPortalProjectRequest {
  id: string;
  title: string;
  description: string;
  status: number;
  priority: number;
  createdAtUtc: string;
}

export interface ClientPortalProjectDetail {
  id: string;
  name: string;
  description: string;
  status: number;
  startDate: string;
  endDate: string;
  milestoneProgress: ClientPortalMilestoneProgress;
  milestones: ClientPortalMilestone[];
  tasks: ClientPortalTask[];
  documents: ClientPortalDocumentCard[];
  messageThreads: ClientPortalMessageThread[];
  requests: ClientPortalProjectRequest[];
}

@Injectable({ providedIn: 'root' })
export class ClientPortalApiService {
  private readonly basePath = '/api/v1/client-portal';

  constructor(private readonly apiClient: ApiClientService) {}

  getDashboard(): Observable<ClientPortalDashboard> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalDashboard>>(`${this.basePath}/dashboard`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getProjects(): Observable<ClientPortalProjectsResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalProjectsResult>>(`${this.basePath}/projects`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getProject(projectId: string): Observable<ClientPortalProjectDetail> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalProjectDetail>>(`${this.basePath}/projects/${projectId}`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
