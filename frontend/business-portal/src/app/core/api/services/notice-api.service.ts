import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { MessageAttachmentMetadata } from '../../messaging/messaging.models';
import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope } from '../models';

export interface NoticeListItem {
  id: string;
  title: string;
  content: string;
  publishedAt: string;
  expiresAt: string | null;
  isActive: boolean;
  targetClientIds: string[] | null;
  attachments: MessageAttachmentMetadata[] | null;
}

export interface PagedNoticesResult {
  items: NoticeListItem[];
  totalCount: number;
  page: number;
  pageSize: number;
}

export interface NoticeListQuery {
  page?: number;
  pageSize?: number;
  clientId?: string;
  activeOnly?: boolean;
}

export interface PublishNoticeRequest {
  title: string;
  content: string;
  expiresAt?: string | null;
  targetClientIds?: string[] | null;
  attachments?: MessageAttachmentMetadata[] | null;
}

export interface NoticeAttachmentUploadUrlRequest {
  fileName: string;
  contentType: string;
  sizeBytes: number;
  url?: string;
}

export interface NoticeAttachmentUploadUrlResult {
  uploadUrl: string;
  fileUrl: string;
  expiresAtUtc: string;
}

@Injectable({ providedIn: 'root' })
export class NoticeApiService {
  private readonly basePath = '/api/v1/notices';

  constructor(private readonly apiClient: ApiClientService) {}

  getNotices(query?: NoticeListQuery): Observable<PagedNoticesResult> {
    return this.apiClient
      .get<ApiEnvelope<PagedNoticesResult>>(`${this.basePath}/`, {
        page: query?.page ?? 1,
        pageSize: query?.pageSize ?? 50,
        clientId: query?.clientId,
        activeOnly: query?.activeOnly ?? false,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  publishNotice(request: PublishNoticeRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, PublishNoticeRequest>(`${this.basePath}/`, {
        title: request.title,
        content: request.content,
        expiresAt: request.expiresAt ?? null,
        targetClientIds: request.targetClientIds ?? null,
        attachments: request.attachments ?? null,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  archiveNotice(noticeId: string): Observable<void> {
    return this.apiClient
      .delete<ApiEnvelope<null>>(`${this.basePath}/${noticeId}`)
      .pipe(map(() => undefined));
  }

  getAttachmentUploadUrl(
    request: NoticeAttachmentUploadUrlRequest,
  ): Observable<NoticeAttachmentUploadUrlResult> {
    return this.apiClient
      .post<ApiEnvelope<NoticeAttachmentUploadUrlResult>, NoticeAttachmentUploadUrlRequest>(
        `${this.basePath}/attachments/upload-url`,
        request,
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
