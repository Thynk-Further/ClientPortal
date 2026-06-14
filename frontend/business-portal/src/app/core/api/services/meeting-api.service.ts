import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, PagedResult } from '../models';

export interface MeetingListItem {
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

export interface MeetingListQuery {
  page?: number;
  pageSize?: number;
  clientId?: string;
  scheduledFrom?: string;
  scheduledTo?: string;
  status?: number;
}

export interface CreateMeetingRequest {
  clientId: string;
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string;
  scheduledTimeZoneId: string;
  attendees?: string[];
}

export interface UpdateMeetingRequest {
  title: string;
  description: string;
  scheduledAt: string;
  durationMinutes: number;
  meetingUrl: string;
  attendees: string[];
}

@Injectable({ providedIn: 'root' })
export class MeetingApiService {
  private readonly basePath = '/api/v1/meetings';

  constructor(private readonly apiClient: ApiClientService) {}

  getMeetings(query?: MeetingListQuery): Observable<PagedResult<MeetingListItem>> {
    return this.apiClient
      .get<ApiEnvelope<PagedResult<MeetingListItem>>>(`${this.basePath}/`, query)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getMeetingById(meetingId: string): Observable<MeetingListItem> {
    return this.apiClient
      .get<ApiEnvelope<MeetingListItem>>(`${this.basePath}/${meetingId}`)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  scheduleMeeting(request: CreateMeetingRequest): Observable<string> {
    return this.apiClient
      .post<ApiEnvelope<string>, CreateMeetingRequest>(`${this.basePath}/`, request)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  updateMeeting(meetingId: string, request: UpdateMeetingRequest): Observable<void> {
    return this.apiClient
      .put<ApiEnvelope<null>, UpdateMeetingRequest>(`${this.basePath}/${meetingId}`, request)
      .pipe(map(() => undefined));
  }

  cancelMeeting(meetingId: string): Observable<void> {
    return this.apiClient
      .delete<ApiEnvelope<null>>(`${this.basePath}/${meetingId}`)
      .pipe(map(() => undefined));
  }
}
