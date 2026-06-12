import { InjectionToken } from '@angular/core';

export interface AuthSessionConfig {
  authApiBasePath: string;
  refreshEndpointPath: string;
  accessTokenStorageKey: string;
  refreshTokenStorageKey: string;
}

export const AUTH_SESSION_CONFIG = new InjectionToken<AuthSessionConfig>(
  'AUTH_SESSION_CONFIG',
  {
    providedIn: 'root',
    factory: (): AuthSessionConfig => ({
      authApiBasePath: '/api/v1/auth',
      refreshEndpointPath: 'refresh',
      accessTokenStorageKey: 'cp_access_token',
      refreshTokenStorageKey: 'cp_refresh_token',
    }),
  },
);
