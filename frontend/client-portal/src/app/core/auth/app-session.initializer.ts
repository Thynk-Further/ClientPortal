import { inject } from '@angular/core';

import { AuthStore } from '../stores/auth.store';
import { TenantContextService } from '../tenant/tenant-context.service';
import { AuthContextService } from './auth-context.service';

export function initializeAppSession(): void {
  const authContext = inject(AuthContextService);
  const tenantContext = inject(TenantContextService);
  const authStore = inject(AuthStore);

  const accessToken = authContext.getAccessToken();
  if (accessToken !== null) {
    tenantContext.syncTenantIdFromAccessToken(accessToken);
  }

  authStore.hydrateSession();
}
