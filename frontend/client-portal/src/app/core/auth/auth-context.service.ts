import { Injectable } from '@angular/core';

import { TokenStorageService } from './token-storage.service';

@Injectable({ providedIn: 'root' })
export class AuthContextService {
  constructor(private readonly tokenStorage: TokenStorageService) {}

  getAccessToken(): string | null {
    return this.tokenStorage.getAccessToken();
  }

  isAuthenticated(): boolean {
    const payload = this.getAccessTokenPayload();
    if (payload === null) {
      return false;
    }

    const exp = payload['exp'];
    if (typeof exp !== 'number') {
      return true;
    }

    const nowInSeconds = Math.floor(Date.now() / 1000);
    return exp > nowInSeconds;
  }

  getTenantId(): string | null {
    const payload = this.getAccessTokenPayload();
    if (payload === null) {
      return null;
    }

    return this.readFirstString(payload, ['tenantId', 'tenant_id', 'tid']);
  }

  getRoles(): string[] {
    const payload = this.getAccessTokenPayload();
    if (payload === null) {
      return [];
    }

    const rolesCandidateKeys = [
      'role',
      'roles',
      'http://schemas.microsoft.com/ws/2008/06/identity/claims/role',
    ];

    for (const key of rolesCandidateKeys) {
      const value = payload[key];
      if (Array.isArray(value)) {
        return value.filter((entry): entry is string => typeof entry === 'string');
      }

      if (typeof value === 'string' && value.trim() !== '') {
        return [value];
      }
    }

    return [];
  }

  private getAccessTokenPayload(): Record<string, unknown> | null {
    const accessToken = this.getAccessToken();
    if (accessToken === null) {
      return null;
    }

    return this.parseJwtPayload(accessToken);
  }

  private readFirstString(
    source: Record<string, unknown>,
    keys: string[],
  ): string | null {
    for (const key of keys) {
      const value = source[key];
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
    }

    return null;
  }

  private parseJwtPayload(token: string): Record<string, unknown> | null {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }

    try {
      const payloadSegment = parts[1];
      const base64 = payloadSegment.replace(/-/g, '+').replace(/_/g, '/');
      const padding = '='.repeat((4 - (base64.length % 4)) % 4);
      const decoded = atob(`${base64}${padding}`);
      return JSON.parse(decoded) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}
