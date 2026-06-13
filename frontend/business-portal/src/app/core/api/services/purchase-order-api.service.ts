import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, PagedResult } from '../models';

export interface PurchaseOrderSummary {
  id: string;
  clientId: string;
  clientCompanyName: string;
  projectId: string;
  poNumber: string;
  quotationId: string;
  rfqId: string;
  rfqNumber: string | null;
  rfqTitle: string | null;
  status: number;
  total: number;
  currency: string;
  generatedInvoiceId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PurchaseOrderDetail extends PurchaseOrderSummary {
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    amount: number;
  }>;
  subtotal: number;
  taxAmount: number;
  approvedAt: string | null;
  notes: string | null;
}

export interface GetPurchaseOrdersResult {
  purchaseOrders: PagedResult<PurchaseOrderSummary>;
}

export interface PaymentSubmission {
  id: string;
  invoiceId: string;
  clientId: string;
  amount: number;
  currency: string;
  method: string;
  reference: string;
  proofDocumentId: string;
  status: number;
  submittedByUserId: string;
  reviewedByUserId: string | null;
  reviewNotes: string | null;
  reviewedAt: string | null;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class PurchaseOrderApiService {
  private readonly poPath = '/api/v1/purchase-orders';
  private readonly invoicePath = '/api/v1/invoices';

  constructor(private readonly apiClient: ApiClientService) {}

  getPurchaseOrders(
    clientId?: string,
    status?: number,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<PurchaseOrderSummary>> {
    return this.apiClient
      .get<ApiEnvelope<GetPurchaseOrdersResult>>(`${this.poPath}/`, {
        clientId,
        status,
        page,
        pageSize,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response).purchaseOrders));
  }

  getPurchaseOrderById(poId: string, clientId: string): Observable<PurchaseOrderDetail> {
    return this.apiClient
      .get<ApiEnvelope<PurchaseOrderDetail>>(`${this.poPath}/${poId}`, { clientId })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  approvePurchaseOrder(
    poId: string,
    payload: { clientId: string; invoiceNumber: string; dueDate: string },
  ): Observable<unknown> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, typeof payload>(`${this.poPath}/${poId}/approve`, payload)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  rejectPurchaseOrder(poId: string, clientId: string): Observable<unknown> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, { clientId: string }>(`${this.poPath}/${poId}/reject`, {
        clientId,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  getPaymentSubmissions(invoiceId: string, clientId: string): Observable<PaymentSubmission[]> {
    return this.apiClient
      .get<ApiEnvelope<PaymentSubmission[]>>(
        `${this.invoicePath}/${invoiceId}/payment-submissions`,
        { clientId },
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  approvePaymentSubmission(submissionId: string): Observable<unknown> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, Record<string, never>>(
        `${this.invoicePath}/payment-submissions/${submissionId}/approve`,
        {},
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  rejectPaymentSubmission(submissionId: string, reviewNotes?: string): Observable<unknown> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, { reviewNotes?: string }>(
        `${this.invoicePath}/payment-submissions/${submissionId}/reject`,
        { reviewNotes },
      )
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
