import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { ApiClientService } from './api-client.service';
import { ApiEnvelope } from './models';

export interface AcceptInvitationRequest {
  token: string;
  password: string;
  tenantSlug: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private readonly basePath = '/api/v1/auth';

  constructor(private readonly apiClient: ApiClientService) {}

  acceptInvitation(request: AcceptInvitationRequest): Observable<void> {
    return this.apiClient
      .post<ApiEnvelope<object | null>, AcceptInvitationRequest>(
        `${this.basePath}/accept-invitation`,
        request,
      )
      .pipe(map((response) => this.unwrapEnvelope(response)));
  }

  private unwrapEnvelope(response: ApiEnvelope<object | null>): void {
    if (response.success) {
      return;
    }

    const firstError = response.errors[0]?.message;
    throw new Error(firstError ?? 'Request failed.');
  }
}
