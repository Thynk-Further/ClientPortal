import { Inject, Injectable } from '@angular/core';

import { AUTH_SESSION_CONFIG, AuthSessionConfig } from './auth-session.config';

@Injectable({ providedIn: 'root' })
export class TokenStorageService {
  constructor(
    @Inject(AUTH_SESSION_CONFIG) private readonly config: AuthSessionConfig,
  ) {}

  getAccessToken(): string | null {
    return localStorage.getItem(this.config.accessTokenStorageKey);
  }

  setAccessToken(accessToken: string): void {
    localStorage.setItem(this.config.accessTokenStorageKey, accessToken);
  }

  getRefreshToken(): string | null {
    return localStorage.getItem(this.config.refreshTokenStorageKey);
  }

  setRefreshToken(refreshToken: string): void {
    localStorage.setItem(this.config.refreshTokenStorageKey, refreshToken);
  }

  clearRefreshToken(): void {
    localStorage.removeItem(this.config.refreshTokenStorageKey);
  }

  clear(): void {
    localStorage.removeItem(this.config.accessTokenStorageKey);
    localStorage.removeItem(this.config.refreshTokenStorageKey);
  }
}
