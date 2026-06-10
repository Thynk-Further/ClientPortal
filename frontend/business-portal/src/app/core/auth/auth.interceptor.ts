import { HttpErrorResponse, HttpEvent, HttpHandlerFn, HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, switchMap, throwError } from 'rxjs';

import { isTenantUnresolvedError } from '../http/http-error.util';
import { AuthSessionService } from './auth-session.service';
import { TokenStorageService } from './token-storage.service';

export const authInterceptor: HttpInterceptorFn = (
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const tokenStorage = inject(TokenStorageService);
  const authSessionService = inject(AuthSessionService);
  const router = inject(Router);

  const accessToken = tokenStorage.getAccessToken();
  const isRefreshRequest = authSessionService.isRefreshRequest(request.url);
  const isAuthRequest = isAuthenticationRequest(request.url);
  const requestWithToken =
    accessToken !== null && !isRefreshRequest && !isAuthRequest
      ? withBearerToken(request, accessToken)
      : request;

  return next(requestWithToken).pipe(
    catchError((error: unknown) => {
      const httpError = error as HttpErrorResponse;
      if (isRefreshRequest || isAuthRequest) {
        return throwError(() => error);
      }

      if (httpError.status === 401 || isTenantUnresolvedError(httpError)) {
        return refreshSessionAndRetry(
          authSessionService,
          router,
          request,
          next,
          httpError,
        );
      }

      return throwError(() => error);
    }),
  );
};

function refreshSessionAndRetry(
  authSessionService: AuthSessionService,
  router: Router,
  request: HttpRequest<unknown>,
  next: HttpHandlerFn,
  originalError: HttpErrorResponse,
): Observable<HttpEvent<unknown>> {
  return authSessionService.refreshAccessToken().pipe(
    switchMap((refreshedAccessToken) => {
      if (refreshedAccessToken === null) {
        authSessionService.clearSession();
        void router.navigate(['/auth']);
        return throwError(() => originalError);
      }

      return next(withBearerToken(request, refreshedAccessToken));
    }),
    catchError((refreshError) => {
      authSessionService.clearSession();
      void router.navigate(['/auth']);
      return throwError(() => refreshError);
    }),
  );
}

function isAuthenticationRequest(url: string): boolean {
  return url.includes('/api/v1/auth/login') ||
    url.includes('/api/v1/auth/register') ||
    url.includes('/api/v1/auth/forgot-password') ||
    url.includes('/api/v1/auth/reset-password');
}

function withBearerToken(
  request: HttpRequest<unknown>,
  accessToken: string,
): HttpRequest<unknown> {
  return request.clone({
    setHeaders: { Authorization: `Bearer ${accessToken}` },
  });
}
