import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';

import { AuthContextService } from '../auth/auth-context.service';

export const authGuard: CanActivateFn = () => {
  const authContext = inject(AuthContextService);
  const router = inject(Router);

  if (authContext.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth']);
};
