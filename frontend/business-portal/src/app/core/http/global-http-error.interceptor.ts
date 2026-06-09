import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

import { readHttpErrorMessage } from '../api/api-envelope.util';
import { isTenantUnresolvedError } from './http-error.util';
import { ToastNotificationService } from '../notifications/toast-notification.service';

export const globalHttpErrorInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const toastNotificationService = inject(ToastNotificationService);

  return next(request).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse) {
        const message = resolveErrorMessage(error);
        if (isTenantUnresolvedError(error)) {
          console.warn('Tenant context could not be resolved; session refresh or sign-in is required.');
        }
        // Keep low-level detail available for debugging and telemetry.
        console.error('HTTP request failed', {
          url: request.url,
          method: request.method,
          status: error.status,
          error,
        });
        const suppressToast =
          request.method === 'POST' &&
          (request.url.includes('/api/v1/auth/login') ||
            request.url.includes('/api/v1/auth/register') ||
            request.url.includes('/api/v1/auth/logout'));

        if (!suppressToast) {
          toastNotificationService.show(message, 'error');
        }
      }

      return throwError(() => error);
    }),
  );
};

function resolveErrorMessage(error: HttpErrorResponse): string {
  if (isTenantUnresolvedError(error)) {
    return 'Your session is missing tenant context. Please sign in again.';
  }

  return readHttpErrorMessage(error, 'Something went wrong. Please try again.');
}
