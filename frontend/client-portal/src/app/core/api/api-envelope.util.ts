import { HttpErrorResponse } from '@angular/common/http';

import { ApiEnvelope } from './models';

export function unwrapApiEnvelopeData<T>(response: ApiEnvelope<T>): T {
  if (response.success && response.data !== null) {
    return response.data;
  }

  const firstError = response.errors[0]?.message;
  throw new Error(firstError ?? 'Request failed.');
}

export function readHttpErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    const envelopeMessage = readEnvelopeErrorMessage(error.error);
    if (envelopeMessage !== null) {
      return envelopeMessage;
    }

    return readHttpStatusMessage(error.status) ?? fallback;
  }

  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return fallback;
}

function readHttpStatusMessage(status: number): string | null {
  switch (status) {
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
      return null;
  }
}

function readEnvelopeErrorMessage(errorBody: unknown): string | null {
  if (typeof errorBody !== 'object' || errorBody === null) {
    return null;
  }

  const envelope = errorBody as ApiEnvelope<unknown>;
  const firstError = envelope.errors?.[0]?.message;
  if (typeof firstError === 'string' && firstError.trim() !== '') {
    return firstError;
  }

  return null;
}
