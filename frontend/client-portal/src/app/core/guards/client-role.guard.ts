import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthContextService } from '../auth/auth-context.service';
import { isClientPortalUser } from '../constants/client-roles';
import { UserSessionService } from '../auth/user-session.service';

export const clientRoleGuard: CanActivateFn = () => {
  const authContext = inject(AuthContextService);
  const userSession = inject(UserSessionService);
  const router = inject(Router);

  const user = userSession.getUser();
  if (isClientPortalUser(authContext.getRoles(), user?.role)) {
    return true;
  }

  return router.createUrlTree(['/auth'], {
    queryParams: { error: 'client-only' },
  });
};
