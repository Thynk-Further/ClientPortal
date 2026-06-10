import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import {
  AuthApiService,
  LoginRequest,
  LoginResponse,
} from '../api/auth-api.service';
import { readHttpErrorMessage } from '../api/api-envelope.util';
import { AuthContextService } from '../auth/auth-context.service';
import { TokenStorageService } from '../auth/token-storage.service';
import { UserSessionService } from '../auth/user-session.service';
import { isClientPortalUser } from '../constants/client-roles';
import { TenantContextService } from '../tenant/tenant-context.service';

interface AuthState {
  isAuthenticated: boolean;
  accessToken: string | null;
  tenantId: string | null;
  roles: string[];
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  isAuthenticated: false,
  accessToken: null,
  tenantId: null,
  roles: [],
  isLoading: false,
  error: null,
};

const BUSINESS_PORTAL_ONLY_MESSAGE =
  'This account is for business portal users. Please sign in at the business portal instead.';

export const AuthStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods(
    (
      store,
      authApiService = inject(AuthApiService),
      authContext = inject(AuthContextService),
      tokenStorage = inject(TokenStorageService),
      tenantContext = inject(TenantContextService),
      userSession = inject(UserSessionService),
    ) => {
      const applyTokens = (response: LoginResponse): void => {
        tokenStorage.setAccessToken(response.accessToken);
        userSession.setUser(response.user);
        const refreshToken = (response as { refreshToken?: unknown }).refreshToken;
        if (typeof refreshToken === 'string' && refreshToken.trim() !== '') {
          tokenStorage.setRefreshToken(refreshToken);
        } else {
          tokenStorage.clearRefreshToken();
        }
        tenantContext.syncTenantIdFromAccessToken(response.accessToken);

        patchState(store, {
          isAuthenticated: authContext.isAuthenticated(),
          accessToken: response.accessToken,
          tenantId: tenantContext.getTenantId(),
          roles: authContext.getRoles(),
          error: null,
        });
      };

      const clearSession = (): void => {
        tokenStorage.clear();
        tenantContext.clearTenantId();
        userSession.clear();

        patchState(store, {
          isAuthenticated: false,
          accessToken: null,
          tenantId: null,
          roles: [],
          error: null,
        });
      };

      return {
        hydrateSession(): void {
          patchState(store, {
            isAuthenticated: authContext.isAuthenticated(),
            accessToken: authContext.getAccessToken(),
            tenantId: tenantContext.getTenantId(),
            roles: authContext.getRoles(),
            error: null,
          });
        },

        async login(request: LoginRequest): Promise<void> {
          patchState(store, { isLoading: true, error: null });
          try {
            const response = await firstValueFrom(authApiService.login(request));
            if (!isClientPortalUser([], response.user.role)) {
              clearSession();
              patchState(store, {
                isAuthenticated: false,
                accessToken: null,
                tenantId: null,
                roles: [],
                error: BUSINESS_PORTAL_ONLY_MESSAGE,
              });
              return;
            }

            applyTokens(response);
          } catch (error) {
            patchState(store, {
              isAuthenticated: false,
              accessToken: null,
              tenantId: null,
              roles: [],
              error: readErrorMessage(error),
            });
          } finally {
            patchState(store, { isLoading: false });
          }
        },

        async refreshSession(): Promise<void> {
          const refreshToken = tokenStorage.getRefreshToken();
          if (refreshToken === null) {
            patchState(store, { isAuthenticated: false, accessToken: null });
            return;
          }

          patchState(store, { isLoading: true, error: null });
          try {
            const response = await firstValueFrom(
              authApiService.refresh({ refreshToken }),
            );
            if (!isClientPortalUser([], response.user.role)) {
              clearSession();
              patchState(store, { error: BUSINESS_PORTAL_ONLY_MESSAGE });
              return;
            }

            applyTokens(response);
          } catch (error) {
            clearSession();
            patchState(store, { error: readErrorMessage(error) });
          } finally {
            patchState(store, { isLoading: false });
          }
        },

        async logout(): Promise<void> {
          const refreshToken = tokenStorage.getRefreshToken();
          patchState(store, { isLoading: true, error: null });
          try {
            await firstValueFrom(authApiService.logout(refreshToken ?? undefined));
          } catch {
            // Local session is cleared regardless; server revoke is best-effort.
          } finally {
            clearSession();
            patchState(store, { isLoading: false });
          }
        },
      };
    },
  ),
);

function readErrorMessage(error: unknown): string {
  return readHttpErrorMessage(error, 'Authentication operation failed.');
}
