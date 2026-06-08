import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult, PagedResult } from '../models';

export interface InvoiceSummary {
  id: string;
  clientId: string;
  status: string;
  invoiceNumber: string;
  currencyCode: string;
  totalAmount: number;
  [key: string]: unknown;
}

export interface InvoiceDetail extends InvoiceSummary {
  issueDateUtc: string;
  dueDateUtc: string;
}

export interface InvoiceListQuery {
  status?: string;
  clientId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface GetInvoicesResult {
  invoices: PagedResult<InvoiceSummary>;
  agingSummary?: Record<string, unknown>;
}

export interface CreateInvoiceRequest {
  clientId: string;
  issueDateUtc: string;
  dueDateUtc: string;
  currencyCode: string;
  lineItems: Array<{ description: string; quantity: number; unitPrice: number }>;
}

export interface UpdateInvoiceRequest {
  dueDateUtc?: string;
  status?: string;
}

export interface RecordPaymentRequest {
  amount: number;
  paymentDateUtc: string;
  reference?: string;
}

@Injectable({ providedIn: 'root' })
export class InvoiceApiService {
  private readonly basePath = '/api/v1/invoices';

  constructor(private readonly apiClient: ApiClientService) {}

  getInvoices(query?: InvoiceListQuery): Observable<PagedResult<InvoiceSummary>> {
    return this.apiClient
      .get<ApiEnvelope<GetInvoicesResult>>(`${this.basePath}/`, query)
      .pipe(map((response) => unwrapApiEnvelopeData(response).invoices));
  }

  getInvoiceById(invoiceId: string): Observable<InvoiceDetail> {
    return this.apiClient.get<InvoiceDetail>(`${this.basePath}/${invoiceId}`);
  }

  createInvoice(request: CreateInvoiceRequest): Observable<InvoiceDetail> {
    return this.apiClient.post<InvoiceDetail, CreateInvoiceRequest>(
      `${this.basePath}/`,
      request,
    );
  }

  updateInvoice(
    invoiceId: string,
    request: UpdateInvoiceRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.put<ApiOperationResult, UpdateInvoiceRequest>(
      `${this.basePath}/${invoiceId}`,
      request,
    );
  }

  deleteInvoice(invoiceId: string): Observable<ApiOperationResult> {
    return this.apiClient.delete<ApiOperationResult>(`${this.basePath}/${invoiceId}`);
  }

  sendInvoice(invoiceId: string): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, Record<string, never>>(
      `${this.basePath}/${invoiceId}/send`,
      {},
    );
  }

  recordPayment(
    invoiceId: string,
    request: RecordPaymentRequest,
  ): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiOperationResult, RecordPaymentRequest>(
      `${this.basePath}/${invoiceId}/payments`,
      request,
    );
  }

  getInvoicePdf(invoiceId: string): Observable<Blob> {
    return this.apiClient.getBlob(`${this.basePath}/${invoiceId}/pdf`);
  }
}
