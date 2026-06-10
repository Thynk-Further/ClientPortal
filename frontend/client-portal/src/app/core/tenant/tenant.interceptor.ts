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
  const tenantHeaderName = tenantContext.getHeaderName();

  if (
    tenantId === null ||
    tenantId.trim() === '' ||
    request.headers.has(tenantHeaderName)
  ) {
    return next(request);
  }

  return next(
    request.clone({
      setHeaders: {
        [tenantHeaderName]: tenantId,
      },
    }),
  );
};
