import { inject } from '@angular/core';
import { patchState, signalStore, withMethods, withState } from '@ngrx/signals';
import { firstValueFrom } from 'rxjs';

import {
  CreateInvoiceRequest,
  InvoiceApiService,
  InvoiceDetail,
  InvoiceListQuery,
  InvoiceSummary,
  RecordPaymentRequest,
} from '../api/services/invoice-api.service';

interface InvoiceState {
  invoices: InvoiceSummary[];
  selectedInvoice: InvoiceDetail | null;
  totalCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: InvoiceState = {
  invoices: [],
  selectedInvoice: null,
  totalCount: 0,
  isLoading: false,
  error: null,
};

export const InvoiceStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withMethods((store, invoiceApiService = inject(InvoiceApiService)) => ({
    async loadInvoices(query?: InvoiceListQuery): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const result = await firstValueFrom(invoiceApiService.getInvoices(query));
        patchState(store, {
          invoices: result.items,
          totalCount: result.totalCount,
        });
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async loadInvoiceById(invoiceId: string, clientId?: string): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        const resolvedClientId = clientId ?? '';
        const result = await firstValueFrom(
          invoiceApiService.getInvoiceById(invoiceId, resolvedClientId),
        );
        patchState(store, { selectedInvoice: result });
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async createInvoice(request: CreateInvoiceRequest): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(invoiceApiService.createInvoice(request));
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async recordPayment(
      invoiceId: string,
      request: RecordPaymentRequest,
    ): Promise<void> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(invoiceApiService.recordPayment(invoiceId, request));
      } catch (error) {
        patchState(store, { error: readErrorMessage(error) });
      } finally {
        patchState(store, { isLoading: false });
      }
    },

    async sendInvoice(invoiceId: string, clientId: string): Promise<boolean> {
      patchState(store, { isLoading: true, error: null });
      try {
        await firstValueFrom(invoiceApiService.sendInvoice(invoiceId, clientId));
        return true;
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

  return 'Invoice operation failed.';
}
