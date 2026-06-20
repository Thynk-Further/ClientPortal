import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult } from '../models';

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role: number;
    isActive: boolean;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface LogoutRequest {
  refreshToken?: string | null;
}

/** Matches API `RegisterBusinessRequest` (JSON camelCase). */
export interface RegisterBusinessRequest {
  companyName: string;
  companyDomain: string;
  ownerFullName: string;
  ownerEmail: string;
  ownerPassword: string;
}

/** API `RegisterBusinessResultDto` (JSON camelCase). */
export interface RegisterBusinessResult {
  tenantId: string;
  ownerUserId: string;
  tenantSlug: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  tenantSlug: string;
}

export interface AcceptStaffInvitationRequest {
  token: string;
  password: string;
  tenantSlug: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly basePath = '/api/v1/auth';

  constructor(private readonly apiClient: ApiClientService) {}

  login(request: LoginRequest): Observable<LoginResponse> {
    return this.apiClient
      .post<ApiEnvelope<LoginResponse>, LoginRequest>(
        `${this.basePath}/login`,
        request,
        undefined,
        { withCredentials: true },
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  refresh(request?: RefreshRequest): Observable<LoginResponse> {
    return this.apiClient
      .post<ApiEnvelope<LoginResponse>, RefreshRequest | undefined>(
        `${this.basePath}/refresh`,
        request,
        undefined,
        { withCredentials: true },
      )
      .pipe(map((response) => this.unwrapEnvelopeData(response)));
  }

  logout(refreshToken?: string): Observable<ApiOperationResult> {
    const normalizedRefreshToken =
      typeof refreshToken === 'string' && refreshToken.trim() !== ''
        ? refreshToken.trim()
        : null;

    return this.apiClient
      .post<ApiEnvelope<object | null>, LogoutRequest>(
        `${this.basePath}/logout`,
        { refreshToken: normalizedRefreshToken },
        undefined,
        { withCredentials: true },
      )
      .pipe(map((response) => this.toOperationResult(response)));
  }

  register(
    request: RegisterBusinessRequest,
  ): Observable<ApiEnvelope<RegisterBusinessResult>> {
    return this.apiClient.post<
      ApiEnvelope<RegisterBusinessResult>,
      RegisterBusinessRequest
    >(`${this.basePath}/register`, request);
  }

  forgotPassword(request: ForgotPasswordRequest): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, ForgotPasswordRequest>(
      `${this.basePath}/forgot-password`,
      request,
    );
  }

  resetPassword(request: ResetPasswordRequest): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, ResetPasswordRequest>(
      `${this.basePath}/reset-password`,
      request,
    );
  }

  acceptInvitation(
    request: AcceptInvitationRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, AcceptInvitationRequest>(
      `${this.basePath}/accept-invitation`,
      request,
    );
  }

  acceptStaffInvitation(
    request: AcceptStaffInvitationRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, AcceptStaffInvitationRequest>(
      `${this.basePath}/accept-staff-invitation`,
      request,
    );
  }

  private unwrapEnvelopeData<T>(response: ApiEnvelope<T>): T {
    if (response.success && response.data !== null) {
      return response.data;
    }

    const firstError = response.errors[0]?.message;
    throw new Error(firstError ?? 'Authentication request failed.');
  }

  private toOperationResult(response: ApiEnvelope<object | null>): ApiOperationResult {
    return {
      success: response.success,
      message: response.errors[0]?.message,
    };
  }
}
