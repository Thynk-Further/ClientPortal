import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, ApiOperationResult, PagedResult } from '../models';

export interface QuoteLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  amount: number;
}

export interface QuoteSummary {
  id: string;
  clientId: string;
  projectId: string;
  quoteNumber: string;
  status: number;
  total: number;
  currency: string;
  dueDate: string;
  convertedInvoiceId: string | null;
  rfqId: string | null;
  origin: number;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetail extends QuoteSummary {
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  notes: string | null;
  purchaseOrderId: string | null;
}

export interface GetQuotesResult {
  quotes: PagedResult<QuoteSummary>;
}

export interface CreateQuoteLineItemInput {
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
}

@Injectable({ providedIn: 'root' })
export class QuoteApiService {
  private readonly basePath = '/api/v1/quotes';

  constructor(private readonly apiClient: ApiClientService) {}

  getQuotes(
    clientId?: string,
    status?: number,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<QuoteSummary>> {
    return this.apiClient
      .get<ApiEnvelope<GetQuotesResult>>(`${this.basePath}/`, {
        clientId,
        status,
        page,
        pageSize,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response).quotes));
  }

  getQuoteById(quoteId: string, clientId: string): Observable<QuoteDetail> {
    return this.apiClient
      .get<ApiEnvelope<QuoteDetail>>(`${this.basePath}/${quoteId}`, { clientId })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  sendQuote(quoteId: string, clientId: string): Observable<ApiOperationResult> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, { clientId: string }>(`${this.basePath}/${quoteId}/send`, {
        clientId,
      })
      .pipe(map(() => ({ success: true })));
  }
}
