import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from '../api-client.service';
import { ApiEnvelope } from '../models';

export interface TenantSettings {
  tenantName: string;
  brandColour: string;
  logoUrl: string | null;
  tax: TenantTaxSettings;
  notifications: TenantNotificationChannels;
}

export interface TenantTaxSettings {
  label: string;
  taxPercentage: number;
  registrationNumber: string;
  notes: string;
  countryCode: string;
  pricingMode: string;
}

export interface TenantNotificationChannels {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  smsEnabled: boolean;
  weeklyDigestEnabled: boolean;
}

export interface TenantBrandingUpdateRequest {
  brandColour: string;
  logoUrl: string | null;
}

export interface TenantBrandingUpdateResult {
  brandColour: string;
  logoUrl: string | null;
}

export interface TenantLogoUploadUrlResult {
  uploadUrl: string;
  logoUrl: string;
  expiresAtUtc: string;
}

export interface TeamMember {
  id: string;
  fullName: string;
  email: string;
  role: string;
  isActive: boolean;
}

export interface InviteTeamMemberRequest {
  fullName: string;
  email: string;
  role: string;
}

export interface InviteTeamMemberResult {
  userId: string;
}

@Injectable({ providedIn: 'root' })
export class TenantSettingsApiService {
  private readonly basePath = '/api/v1/settings';

  constructor(private readonly apiClient: ApiClientService) {}

  getSettings(): Observable<TenantSettings> {
    return this.apiClient
      .get<ApiEnvelope<TenantSettings>>(this.basePath)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  updateBranding(request: TenantBrandingUpdateRequest): Observable<TenantBrandingUpdateResult> {
    return this.apiClient
      .put<ApiEnvelope<TenantBrandingUpdateResult>, TenantBrandingUpdateRequest>(
        `${this.basePath}/branding`,
        request,
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  getLogoUploadUrl(fileName: string, contentType: string): Observable<TenantLogoUploadUrlResult> {
    return this.apiClient
      .post<ApiEnvelope<TenantLogoUploadUrlResult>, { fileName: string; contentType: string }>(
        `${this.basePath}/branding/logo/upload-url`,
        { fileName, contentType },
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  updateTax(request: TenantTaxSettings): Observable<TenantTaxSettings> {
    return this.apiClient
      .put<ApiEnvelope<TenantTaxSettings>, TenantTaxSettings>(`${this.basePath}/tax`, request)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  updateNotifications(
    request: TenantNotificationChannels,
  ): Observable<TenantNotificationChannels> {
    return this.apiClient
      .put<ApiEnvelope<TenantNotificationChannels>, TenantNotificationChannels>(
        `${this.basePath}/notifications`,
        request,
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  listTeamMembers(): Observable<ReadonlyArray<TeamMember>> {
    return this.apiClient
      .get<ApiEnvelope<ReadonlyArray<TeamMember>>>(`${this.basePath}/team`)
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  inviteTeamMember(request: InviteTeamMemberRequest): Observable<InviteTeamMemberResult> {
    return this.apiClient
      .post<ApiEnvelope<InviteTeamMemberResult>, InviteTeamMemberRequest>(
        `${this.basePath}/team/invite`,
        request,
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  updateTeamMemberRole(userId: string, role: string): Observable<TeamMember> {
    return this.apiClient
      .put<ApiEnvelope<TeamMember>, { role: string }>(`${this.basePath}/team/${userId}/role`, {
        role,
      })
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  deactivateTeamMember(userId: string): Observable<void> {
    return this.apiClient
      .delete<ApiEnvelope<null>>(`${this.basePath}/team/${userId}`)
      .pipe(map(() => undefined));
  }

  private unwrapEnvelopeData<T>(response: ApiEnvelope<T>): T {
    if (response.success && response.data !== null) {
      return response.data;
    }

    const firstError = response.errors[0]?.message;
    throw new Error(firstError ?? 'Settings request failed.');
  }
}
