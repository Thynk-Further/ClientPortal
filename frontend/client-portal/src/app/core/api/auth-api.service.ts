import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { ApiEnvelope, ApiOperationResult } from './models';

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

export interface AcceptInvitationRequest {
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

  acceptInvitation(request: AcceptInvitationRequest): Observable<void> {
    return this.apiClient
      .post<ApiEnvelope<object | null>, AcceptInvitationRequest>(
        `${this.basePath}/accept-invitation`,
        request,
      )
      .pipe(
        map((response) => {
          if (response.success) {
            return;
          }

          const firstError = response.errors[0]?.message;
          throw new Error(firstError ?? 'Unable to accept invitation.');
        }),
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
