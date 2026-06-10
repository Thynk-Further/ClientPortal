import { HttpErrorResponse } from '@angular/common/http';

import { ApiEnvelope } from '../api/models';

export function readApiErrorCode(errorBody: unknown): string | null {
  if (typeof errorBody !== 'object' || errorBody === null) {
    return null;
  }

  const firstError = (errorBody as ApiEnvelope<unknown>).errors?.[0]?.code;
  return typeof firstError === 'string' && firstError.trim() !== '' ? firstError : null;
}

export function isTenantUnresolvedError(error: HttpErrorResponse): boolean {
  return error.status === 400 && readApiErrorCode(error.error) === 'Tenant.Unresolved';
}
