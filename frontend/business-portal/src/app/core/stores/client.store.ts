import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import {
  ClientApiService,
  ClientDetail,
  ClientListQuery,
  ClientSummary,
  InviteClientRequest,
  UpdateClientRequest,
} from '../api/services/client-api.service';

interface ClientState {
  clients: ClientSummary[];
  selectedClient: ClientDetail | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: ClientState = {
  clients: [],
  selectedClient: null,
  totalCount: 0,
  isLoading: false,
  error: null,
};

export const ClientStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, clientApiService = inject(ClientApiService)) => ({
    async loadClients(query?: ClientListQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(clientApiService.getClients(query));
        patchState(store, {
          clients: result.items,
          totalCount: result.totalCount,
        });
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async loadClientById(clientId: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(clientApiService.getClientById(clientId));
        patchState(store, { selectedClient: result });
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async inviteClient(request: InviteClientRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(clientApiService.inviteClient(request));
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async updateClient(
      clientId: string,
      request: UpdateClientRequest,
    ): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(clientApiService.updateClient(clientId, request));
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async resendClientInvitation(clientId: string): Promise<boolean> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(
          clientApiService.resendClientInvitation(clientId),
        );
        return result.success;
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
        return false;
      } finally {
        patchState(store, { isLoading: false });
      }
    },
  })),
);

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return 'Client operation failed.';
}
