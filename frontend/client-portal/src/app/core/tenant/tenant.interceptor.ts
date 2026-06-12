import {
  HttpEvent,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable } from 'rxjs';

import { TenantContextService } from './tenant-context.service';

export const tenantInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tenantContext = inject(TenantContextService);
  const tenantId = tenantContext.getTenantId();
  const tenantSlug = tenantContext.getTenantSlug();
  const tenantHeaderName = tenantContext.getHeaderName();
  const tenantSlugHeaderName = tenantContext.getSlugHeaderName();

  const headers: Record<string, string> = {};

  if (
    tenantId !== null &&
    tenantId.trim() !== '' &&
    !request.headers.has(tenantHeaderName)
  ) {
    headers[tenantHeaderName] = tenantId;
  }

  if (
    tenantSlug !== null &&
    tenantSlug.trim() !== '' &&
    !request.headers.has(tenantSlugHeaderName)
  ) {
    headers[tenantSlugHeaderName] = tenantSlug;
  }

  if (Object.keys(headers).length === 0) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: headers,
    }),
  );
};
