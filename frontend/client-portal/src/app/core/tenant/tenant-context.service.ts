import { Inject, Injectable } from '@angular/core';

import { AuthContextService } from '../auth/auth-context.service';
import { TENANT_CONTEXT_CONFIG, TenantContextConfig } from './tenant-context.config';
import { resolveTenantSlugFromHost } from '../branding/tenant-host.util';

@Injectable({ providedIn: 'root' })
export class TenantContextService {
  constructor(
    private readonly authContext: AuthContextService,
    @Inject(TENANT_CONTEXT_CONFIG) private readonly config: TenantContextConfig,
  ) {}

  getTenantId(): string | null {
    const storedTenantId = localStorage.getItem(this.config.tenantStorageKey);
    if (storedTenantId !== null && storedTenantId.trim() !== '') {
      return storedTenantId;
    }

    return this.authContext.getTenantId();
  }

  getTenantSlug(): string | null {
    const storedSlug = localStorage.getItem(this.config.tenantSlugStorageKey);
    if (storedSlug !== null && storedSlug.trim() !== '') {
      return storedSlug;
    }

    if (typeof window !== 'undefined') {
      return resolveTenantSlugFromHost(window.location.hostname);
    }

    return null;
  }

  setTenantId(tenantId: string): void {
    localStorage.setItem(this.config.tenantStorageKey, tenantId);
  }

  setTenantSlug(tenantSlug: string): void {
    localStorage.setItem(this.config.tenantSlugStorageKey, tenantSlug.trim().toLowerCase());
  }

  syncTenantIdFromAccessToken(accessToken: string): void {
    const tenantId = this.parseTenantId(accessToken);
    if (tenantId === null) {
      this.clearTenantId();
      return;
    }

    this.setTenantId(tenantId);
  }

  clearTenantId(): void {
    localStorage.removeItem(this.config.tenantStorageKey);
  }

  clearTenantSlug(): void {
    localStorage.removeItem(this.config.tenantSlugStorageKey);
  }

  getHeaderName(): string {
    return this.config.tenantHeaderName;
  }

  getSlugHeaderName(): string {
    return this.config.tenantSlugHeaderName;
  }

  private parseTenantId(token: string): string | null {
    const payload = this.parseJwtPayload(token);
    if (payload === null) {
      return null;
    }

    const candidateKeys = ['tenantId', 'tenant_id', 'tid'];
    for (const key of candidateKeys) {
      const value = payload[key];
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
