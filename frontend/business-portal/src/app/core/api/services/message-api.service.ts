import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import {
  MessageAttachmentMetadata,
  MessageHistoryItem,
  MessageThreadListItem,
} from '../../messaging/messaging.models';
import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope } from '../models';

export interface PagedMessagesResult {
  items: MessageHistoryItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface PagedThreadsResult {
  items: MessageThreadListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface SendMessageRequest {
  senderRole: string;
  clientMessageId: string;
  content: string;
  replyToMessageId?: string | null;
  emojiReaction?: string | null;
  attachment?: MessageAttachmentMetadata | null;
}

export interface MessageAttachmentUploadUrlRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string;
}

export interface MessageAttachmentUploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
  expiresAtUtc: string;
}

export interface CreateMessageThreadRequest {
  clientId: string;
  projectId?: string | null;
  participantIds: string[];
  subject: string;
}

@Injectable({ providedIn: 'root' })
export class MessageApiService {
  private readonly basePath = '/api/v1/messages';

  constructor(private readonly apiClient: ApiClientService) {}

  getThreads(page = 1, pageSize = 20): Observable<PagedThreadsResult> {
    return this.apiClient
      .get<ApiEnvelope<PagedThreadsResult>>(`${this.basePath}/threads`, { page, pageSize })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  createThread(request: CreateMessageThreadRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, CreateMessageThreadRequest>(`${this.basePath}/threads`, {
        ...request,
        participantIds: request.participantIds ?? [],
        projectId: request.projectId ?? null,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getThreadMessages(
    threadId: string,
    page = 1,
    pageSize = 50,
    includeSoftDeleted = false,
  ): Observable<PagedMessagesResult> {
    return this.apiClient
      .get<ApiEnvelope<PagedMessagesResult>>(
        `${this.basePath}/threads/${threadId}/messages`,
        { page, pageSize, includeSoftDeleted },
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  sendMessage(threadId: string, request: SendMessageRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, SendMessageRequest>(
        `${this.basePath}/threads/${threadId}/messages`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getAttachmentUploadUrl(
    threadId: string,
    request: MessageAttachmentUploadUrlRequest,
  ): Observable<MessageAttachmentUploadUrlResult> {
    return this.apiClient
      .post<ApiEnvelope<MessageAttachmentUploadUrlResult>, MessageAttachmentUploadUrlRequest>(
        `${this.basePath}/threads/${threadId}/attachments/upload-url`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  markThreadRead(threadId: string): Observable<number> {
    return this.apiClient
      .put<ApiEnvelope<number>, Record<string, never>>(
        `${this.basePath}/threads/${threadId}/read`,
        {},
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
