import {
  ApplicationConfig,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideRouter } from '@angular/router';

import { initializeClientPortalApp } from './core/auth/app-bootstrap.initializer';
import { authInterceptor } from './core/auth/auth.interceptor';
import { tenantInterceptor } from './core/tenant/tenant.interceptor';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideAppInitializer(initializeClientPortalApp),
    provideBrowserGlobalErrorListeners(),
    provideHttpClient(
      withInterceptors([authInterceptor, tenantInterceptor]),
    ),
    provideRouter(routes),
  ],
};
