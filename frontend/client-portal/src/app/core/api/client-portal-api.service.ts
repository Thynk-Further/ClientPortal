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

export interface ClientPortalMeetingsResult {
  meetings: ClientPortalMeetingCard[];
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

export interface ClientPortalRequestListItem {
  id: string;
  projectId: string;
  projectName: string;
  title: string;
  description: string;
  status: number;
  priority: number;
  createdAtUtc: string;
  updatedAtUtc: string;
}

export interface ClientPortalRequestsResult {
  requests: ClientPortalRequestListItem[];
}

export interface SubmitClientPortalRequest {
  projectId: string;
  title: string;
  description: string;
  priority: number;
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

export interface ClientPortalInvoiceListItem {
  id: string;
  projectId: string;
  invoiceNumber: string;
  status: number;
  total: number;
  amountPaid: number;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
  createdAt: string;
}

export interface ClientPortalInvoicesResult {
  invoices: ClientPortalInvoiceListItem[];
}

export interface ClientPortalInvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface ClientPortalInvoiceDetail {
  id: string;
  projectId: string;
  invoiceNumber: string;
  status: number;
  lineItems: ClientPortalInvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  total: number;
  amountPaid: number;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
}

export interface ClientPortalInvoicePaymentSession {
  provider: string;
  transactionId: string;
  reference: string;
  status: string;
  amount: number;
  currency: string;
  redirectUrl: string | null;
}

export interface InitiateClientPortalInvoicePayment {
  callbackUrl: string;
  provider?: string | null;
}

export interface VerifyClientPortalInvoicePayment {
  provider: string;
  transactionId: string;
  reference: string;
}

export interface ClientPortalInvoicePaymentVerification {
  invoiceId: string;
  status: number;
  amountPaid: number;
  outstandingAmount: number;
}

export interface ClientPortalDocumentListItem {
  id: string;
  name: string;
  kind: string;
  status: number;
  updatedAtUtc: string;
  requiresSignature: boolean;
}

export interface ClientPortalDocumentsResult {
  documents: ClientPortalDocumentListItem[];
}

export interface ClientPortalDocumentDetail {
  id: string;
  name: string;
  kind: string;
  status: number;
  signedAtUtc: string | null;
  expiresAtUtc: string | null;
  parties: string[];
  createdAtUtc: string;
  updatedAtUtc: string;
  requiresSignature: boolean;
  canDownload: boolean;
}

export interface ClientPortalDocumentDownload {
  downloadUrl: string;
  expiresAtUtc: string;
}

export interface SignClientPortalContract {
  signerName: string;
}

export interface ClientPortalMessageThread {
  id: string;
  projectId: string | null;
  subject: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ClientPortalMessageThreadsResult {
  threads: ClientPortalMessageThread[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface ClientPortalMessagesSummary {
  unreadCount: number;
  totalThreads: number;
}

export interface ClientPortalMessage {
  id: string;
  threadId: string;
  senderId: string;
  senderRole: string;
  content: string;
  status: number;
  sentAt: string;
}

export interface ClientPortalThreadMessagesResult {
  messages: ClientPortalMessage[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SendClientPortalMessage {
  clientMessageId: string;
  content: string;
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

  getRequests(): Observable<ClientPortalRequestsResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalRequestsResult>>(`${this.basePath}/requests`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  submitRequest(request: SubmitClientPortalRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, SubmitClientPortalRequest>(
        `${this.basePath}/requests`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getInvoices(): Observable<ClientPortalInvoicesResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalInvoicesResult>>(`${this.basePath}/invoices`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getInvoice(invoiceId: string): Observable<ClientPortalInvoiceDetail> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalInvoiceDetail>>(`${this.basePath}/invoices/${invoiceId}`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  initiateInvoicePayment(
    invoiceId: string,
    request: InitiateClientPortalInvoicePayment,
  ): Observable<ClientPortalInvoicePaymentSession> {
    return this.apiClient
      .post<ApiEnvelope<ClientPortalInvoicePaymentSession>, InitiateClientPortalInvoicePayment>(
        `${this.basePath}/invoices/${invoiceId}/pay`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  verifyInvoicePayment(
    invoiceId: string,
    request: VerifyClientPortalInvoicePayment,
  ): Observable<ClientPortalInvoicePaymentVerification> {
    return this.apiClient
      .post<ApiEnvelope<ClientPortalInvoicePaymentVerification>, VerifyClientPortalInvoicePayment>(
        `${this.basePath}/invoices/${invoiceId}/payments/verify`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getDocuments(): Observable<ClientPortalDocumentsResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalDocumentsResult>>(`${this.basePath}/documents`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getDocument(documentId: string): Observable<ClientPortalDocumentDetail> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalDocumentDetail>>(`${this.basePath}/documents/${documentId}`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getDocumentDownloadUrl(documentId: string): Observable<ClientPortalDocumentDownload> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalDocumentDownload>>(
        `${this.basePath}/documents/${documentId}/download`,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  signContract(documentId: string, request: SignClientPortalContract): Observable<void> {
    return this.apiClient
      .post<ApiEnvelope<null>, SignClientPortalContract>(
        `${this.basePath}/documents/${documentId}/sign`,
        request,
      )
      .pipe(map(() => undefined));
  }

  getMessagesSummary(): Observable<ClientPortalMessagesSummary> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalMessagesSummary>>(`${this.basePath}/messages/summary`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getMessageThreads(page = 1, pageSize = 20): Observable<ClientPortalMessageThreadsResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalMessageThreadsResult>>(`${this.basePath}/messages/threads`, {
        page,
        pageSize,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getThreadMessages(
    threadId: string,
    page = 1,
    pageSize = 50,
  ): Observable<ClientPortalThreadMessagesResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalThreadMessagesResult>>(
        `${this.basePath}/messages/threads/${threadId}/messages`,
        { page, pageSize },
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  sendMessage(threadId: string, request: SendClientPortalMessage): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, SendClientPortalMessage>(
        `${this.basePath}/messages/threads/${threadId}/messages`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  markThreadRead(threadId: string): Observable<number> {
    return this.apiClient
      .put<ApiEnvelope<number>, Record<string, never>>(
        `${this.basePath}/messages/threads/${threadId}/read`,
        {},
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getMeetings(): Observable<ClientPortalMeetingsResult> {
    return this.apiClient
      .get<ApiEnvelope<ClientPortalMeetingsResult>>(`${this.basePath}/meetings`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
