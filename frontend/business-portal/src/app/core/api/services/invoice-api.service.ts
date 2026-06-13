import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult, PagedResult } from '../models';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface InvoiceSummary {
  id: string;
  clientId: string;
  projectId: string;
  invoiceNumber: string;
  status: number;
  total: number;
  amountPaid: number;
  outstandingAmount: number;
  currency: string;
  dueDate: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceDetail extends InvoiceSummary {
  clientCompanyName: string;
  lineItems: InvoiceLineItem[];
  subtotal: number;
  taxAmount: number;
  notes: string | null;
  paidAt: string | null;
  purchaseOrderId: string | null;
  quotationId: string | null;
}

export interface InvoiceListQuery {
  status?: number;
  clientId?: string;
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
  clientId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  paidAtUtc: string;
  notes?: string | null;
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

  getInvoiceById(invoiceId: string, clientId: string): Observable<InvoiceDetail> {
    return this.apiClient
      .get<ApiEnvelope<InvoiceDetail>>(`${this.basePath}/${invoiceId}`, { clientId })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  createInvoice(request: CreateInvoiceRequest): Observable<InvoiceDetail> {
    return this.apiClient
      .post<ApiEnvelope<InvoiceDetail>, CreateInvoiceRequest>(`${this.basePath}/`, request)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
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

  deleteInvoice(invoiceId: string, clientId: string): Observable<ApiOperationResult> {
    return this.apiClient.delete<ApiOperationResult>(`${this.basePath}/${invoiceId}`, {
      clientId,
    });
  }

  sendInvoice(invoiceId: string, clientId: string): Observable<ApiOperationResult> {
    return this.apiClient.post<ApiEnvelope<unknown>, { clientId: string }>(
      `${this.basePath}/${invoiceId}/send`,
      { clientId },
    ).pipe(map(() => ({ success: true })));
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

  getInvoicePdf(invoiceId: string, clientId: string): Observable<Blob> {
    return this.apiClient.getBlob(`${this.basePath}/${invoiceId}/pdf`, { clientId });
  }
}
