import { inject } from '@angular/core';

import { TenantBrandingService } from '../branding/tenant-branding.service';
import { initializeAppSession } from './app-session.initializer';

export async function initializeClientPortalApp(): Promise<void> {
  const brandingService = inject(TenantBrandingService);

  initializeAppSession();
  await brandingService.initialize();
}
