import { InjectionToken } from '@angular/core';

export interface TenantContextConfig {
  tenantHeaderName: string;
  tenantSlugHeaderName: string;
  tenantStorageKey: string;
  tenantSlugStorageKey: string;
}

export const TENANT_CONTEXT_CONFIG = new InjectionToken<TenantContextConfig>(
  'TENANT_CONTEXT_CONFIG',
  {
    providedIn: 'root',
    factory: (): TenantContextConfig => ({
      tenantHeaderName: 'X-Tenant-Id',
      tenantSlugHeaderName: 'X-Tenant-Slug',
      tenantStorageKey: 'cp_tenant_id',
      tenantSlugStorageKey: 'cp_tenant_slug',
    }),
  },
);
