import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { ClientPortalApiService } from '../api/client-portal-api.service';

@Injectable({ providedIn: 'root' })
export class ClientPortalMessagesSummaryService {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  private readonly unreadCountState = signal(0);

  readonly unreadCount = this.unreadCountState.asReadonly();

  async refresh(): Promise<void> {
    try {
      const summary = await firstValueFrom(this.clientPortalApi.getMessagesSummary());
      this.unreadCountState.set(summary.unreadCount);
    } catch {
      this.unreadCountState.set(0);
    }
  }
}
