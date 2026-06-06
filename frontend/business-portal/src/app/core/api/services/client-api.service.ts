import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult, PagedResult } from '../models';

export interface ClientSummary {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  status: string;
  invitedAt: string;
  onboardedAt?: string | null;
  [key: string]: unknown;
}

export interface ClientDetail extends ClientSummary {
  phone: string;
  notes?: string | null;
}

export interface ClientListQuery {
  search?: string;
  status?: string;
  page?: number;
  pageSize?: number;
}

export interface InviteClientRequest {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  notes?: string;
}

export interface InviteClientResult {
  clientId: string;
  userId: string;
}

export interface UpdateClientRequest {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  notes?: string;
  status?: string;
}

export interface OnboardingStepStatus {
  key: string;
  isCompleted: boolean;
}

export interface OnboardingStatus {
  clientId: string;
  totalSteps: number;
  completedSteps: number;
  isCompleted: boolean;
  steps: OnboardingStepStatus[];
}

@Injectable({ providedIn: 'root' })
export class ClientApiService {
  private readonly basePath = '/api/v1/clients';
  private readonly clientPortalPath = '/api/v1/client-portal';

  constructor(private readonly apiClient: ApiClientService) {}

  getClients(query?: ClientListQuery): Observable<PagedResult<ClientSummary>> {
    return this.apiClient
      .get<ApiEnvelope<PagedResult<ClientSummary>>>(`${this.basePath}/`, query)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  getClientById(clientId: string): Observable<ClientDetail> {
    return this.apiClient
      .get<ApiEnvelope<ClientDetail>>(`${this.basePath}/${clientId}`)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  inviteClient(request: InviteClientRequest): Observable<InviteClientResult> {
    return this.apiClient
      .post<ApiEnvelope<InviteClientResult>, InviteClientRequest>(
        `${this.basePath}/invite`,
        request,
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  updateClient(
    clientId: string,
    request: UpdateClientRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient
      .put<ApiEnvelope<object | null>, UpdateClientRequest>(
        `${this.basePath}/${clientId}`,
        request,
      )
      .pipe(map((response) => this.toOperationResult(response)));
  }

  deactivateClient(clientId: string): Observable<ApiOperationResult> {
    return this.apiClient
      .post<ApiEnvelope<object | null>, Record<string, never>>(
        `${this.basePath}/${clientId}/deactivate`,
        {},
      )
      .pipe(map((response) => this.toOperationResult(response)));
  }

  resendClientInvitation(clientId: string): Observable<ApiOperationResult> {
    return this.apiClient
      .post<ApiEnvelope<object | null>, Record<string, never>>(
        `${this.basePath}/${clientId}/resend-invite`,
        {},
      )
      .pipe(map((response) => this.toOperationResult(response)));
  }

  getOnboardingStatus(): Observable<OnboardingStatus> {
    return this.apiClient
      .get<ApiEnvelope<OnboardingStatus>>(`${this.clientPortalPath}/onboarding-status`)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  completeOnboardingStep(stepKey: string): Observable<ApiOperationResult> {
    return this.apiClient
      .post<ApiEnvelope<object | null>, Record<string, never>>(
        `${this.clientPortalPath}/onboarding-steps/${encodeURIComponent(stepKey)}/complete`,
        {},
      )
      .pipe(map((response) => this.toOperationResult(response)));
  }

  private unwrapEnvelopeData<T>(response: ApiEnvelope<T>): T {
    if (response.success && response.data !== null) {
      return response.data;
    }

    const firstError = response.errors[0]?.message;
    throw new Error(firstError ?? 'Client request failed.');
  }

  private toOperationResult(response: ApiEnvelope<object | null>): ApiOperationResult {
    return {
      success: response.success,
      message: response.errors[0]?.message,
    };
  }
}
