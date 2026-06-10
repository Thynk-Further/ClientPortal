import { inject } from '@angular/core';

import { TenantBrandingService } from '../branding/tenant-branding.service';
import { ThemeService } from '../theme/theme.service';
import { initializeAppSession } from './app-session.initializer';

export async function initializeClientPortalApp(): Promise<void> {
  const brandingService = inject(TenantBrandingService);
  const themeService = inject(ThemeService);

  themeService.initialize();
  initializeAppSession();
  await brandingService.initialize();
}
