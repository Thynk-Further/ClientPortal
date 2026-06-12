import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ApiClientService } from '../api/api-client.service';
import { unwrapApiEnvelopeData } from '../api/api-envelope.util';
import { ApiEnvelope } from '../api/models';
import { TenantContextService } from '../tenant/tenant-context.service';
import {
  applyTenantCssVariables,
  buildCustomDomainUrl,
  shouldRedirectToCustomDomain,
} from './tenant-branding.util';
import { isLocalDevelopmentHost, resolveTenantSlugFromHost } from './tenant-host.util';

export interface TenantBranding {
  tenantId: string;
  tenantName: string;
  slug: string;
  logoUrl: string | null;
  brandColour: string;
  customDomain: string;
  customDomainEnabled: boolean;
  cssVariables: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class TenantBrandingService {
  private readonly apiClient = inject(ApiClientService);
  private readonly tenantContext = inject(TenantContextService);

  private readonly brandingState = signal<TenantBranding | null>(null);

  readonly branding = this.brandingState.asReadonly();

  async initialize(): Promise<void> {
    if (typeof window === 'undefined') {
      return;
    }

    const slugFromHost = resolveTenantSlugFromHost(window.location.hostname);
    if (slugFromHost !== null) {
      this.tenantContext.setTenantSlug(slugFromHost);
    }

    try {
      const branding = await firstValueFrom(
        this.apiClient.get<ApiEnvelope<TenantBranding>>('/api/v1/public/tenant/branding'),
      ).then((response) => unwrapApiEnvelopeData(response));

      this.tenantContext.setTenantId(branding.tenantId);
      this.tenantContext.setTenantSlug(branding.slug);
      applyTenantCssVariables(branding.cssVariables);
      this.brandingState.set(branding);
      this.applyCustomDomainRedirect(branding);
    } catch {
      this.brandingState.set(null);
    }
  }

  private applyCustomDomainRedirect(branding: TenantBranding): void {
    if (isLocalDevelopmentHost(window.location.hostname)) {
      return;
    }

    if (
      !shouldRedirectToCustomDomain(
        branding.customDomain,
        branding.customDomainEnabled,
        window.location.hostname,
      )
    ) {
      return;
    }

    window.location.replace(buildCustomDomainUrl(branding.customDomain));
  }
}
