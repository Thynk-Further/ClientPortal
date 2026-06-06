import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, catchError, throwError } from 'rxjs';

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
        // Keep low-level detail available for debugging and telemetry.
        console.error('HTTP request failed', {
          url: request.url,
          method: request.method,
          status: error.status,
          error,
        });
        const suppressToast =
          request.method === 'POST' &&
          (request.url.includes('/api/v1/auth/register') ||
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
  if (typeof error.error === 'string' && error.error.trim() !== '') {
    return error.error;
  }

  if (typeof error.error === 'object' && error.error !== null) {
    const message = (error.error as { message?: string }).message;
    if (typeof message === 'string' && message.trim() !== '') {
      return message;
    }
  }

  switch (error.status) {
    case 0:
      return 'Network error. Check your connection and try again.';
    case 400:
      return 'The request is invalid. Please review your input.';
    case 401:
      return 'Your session has expired. Please sign in again.';
    case 403:
      return 'You do not have permission to perform this action.';
    case 404:
      return 'The requested resource was not found.';
    case 409:
      return 'This operation conflicted with existing data.';
    case 422:
      return 'Validation failed. Please correct the highlighted fields.';
    case 500:
      return 'An internal server error occurred. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
