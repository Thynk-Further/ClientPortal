import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Observable, catchError, finalize, map, of, shareReplay } from 'rxjs';

import { ApiEnvelope } from '../api/models';
import { AUTH_SESSION_CONFIG, AuthSessionConfig } from './auth-session.config';
import { TokenStorageService } from './token-storage.service';
import { TenantContextService } from '../tenant/tenant-context.service';

interface RefreshTokenRequest {
  refreshToken: string;
}

interface AuthTokenPayload {
  accessToken: string;
  expiresAt: string;
}

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private refreshInFlight$: Observable<string | null> | null = null;

  constructor(
    private readonly httpClient: HttpClient,
    private readonly tokenStorage: TokenStorageService,
    private readonly tenantContextService: TenantContextService,
    @Inject(AUTH_SESSION_CONFIG) private readonly config: AuthSessionConfig,
  ) {}

  refreshAccessToken(): Observable<string | null> {
    if (this.refreshInFlight$ !== null) {
      return this.refreshInFlight$;
    }

    const refreshToken = this.tokenStorage.getRefreshToken();
    const requestBody =
      refreshToken !== null && refreshToken.trim() !== ''
        ? ({ refreshToken } satisfies RefreshTokenRequest)
        : undefined;
    const refreshUrl = this.buildRefreshUrl();

    this.refreshInFlight$ = this.httpClient
      .post<ApiEnvelope<AuthTokenPayload>>(refreshUrl, requestBody, {
        withCredentials: true,
      })
      .pipe(
        map((response) => {
          if (!response.success || response.data === null) {
            return null;
          }

          this.tokenStorage.setAccessToken(response.data.accessToken);
          this.tenantContextService.syncTenantIdFromAccessToken(
            response.data.accessToken,
          );

          return response.data.accessToken;
        }),
        catchError(() => of(null)),
        finalize(() => {
          this.refreshInFlight$ = null;
        }),
        shareReplay(1),
      );

    return this.refreshInFlight$;
  }

  clearSession(): void {
    this.tokenStorage.clear();
    this.tenantContextService.clearTenantId();
  }

  isRefreshRequest(url: string): boolean {
    return this.isSameEndpoint(url, this.buildRefreshUrl());
  }

  private buildRefreshUrl(): string {
    const basePath = this.config.authApiBasePath.replace(/\/+$/, '');
    const endpointPath = this.config.refreshEndpointPath.replace(/^\/+/, '');
    return `${basePath}/${endpointPath}`;
  }

  private isSameEndpoint(requestUrl: string, expectedEndpointPath: string): boolean {
    if (requestUrl === expectedEndpointPath) {
      return true;
    }

    return requestUrl.endsWith(expectedEndpointPath);
  }
}
