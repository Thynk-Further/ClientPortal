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
  clientId: string | null;
  projectId: string | null;
  quoteNumber: string;
  status: number;
  total: number;
  currency: string;
  dueDate: string;
  convertedInvoiceId: string | null;
  rfqId: string | null;
  rfqTitle: string | null;
  origin: number;
  recipientCompanyName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface QuoteDetail extends QuoteSummary {
  lineItems: QuoteLineItem[];
  subtotal: number;
  taxAmount: number;
  notes: string | null;
  purchaseOrderId: string | null;
  recipientContactName: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
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

  getQuoteById(quoteId: string, clientId?: string | null): Observable<QuoteDetail> {
    return this.apiClient
      .get<ApiEnvelope<QuoteDetail>>(`${this.basePath}/${quoteId}`, {
        clientId: clientId ?? undefined,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  sendQuote(quoteId: string, clientId?: string | null): Observable<ApiOperationResult> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, { clientId?: string | null }>(`${this.basePath}/${quoteId}/send`, {
        clientId: clientId ?? null,
      })
      .pipe(map(() => ({ success: true })));
  }

  updateQuote(quoteId: string, payload: UpdateQuoteInput): Observable<void> {
    return this.apiClient
      .put<ApiEnvelope<unknown>, UpdateQuoteInput>(`${this.basePath}/${quoteId}`, payload)
      .pipe(map(() => undefined));
  }

  createQuote(payload: CreateQuoteInput): Observable<QuoteDetail> {
    return this.apiClient
      .post<ApiEnvelope<QuoteDetail>, CreateQuoteInput>(`${this.basePath}/`, payload)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  createExternalQuote(payload: CreateExternalQuoteInput): Observable<QuoteDetail> {
    return this.apiClient
      .post<ApiEnvelope<QuoteDetail>, CreateExternalQuoteInput>(`${this.basePath}/external`, payload)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}

export interface CreateQuoteInput {
  clientId: string;
  projectId: string;
  quoteNumber: string;
  currency: string;
  dueDate: string;
  lineItems: CreateQuoteLineItemInput[];
  notes?: string | null;
}

export interface CreateExternalQuoteInput {
  quoteNumber: string;
  currency: string;
  dueDate: string;
  recipientCompanyName: string;
  recipientContactName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  lineItems: CreateQuoteLineItemInput[];
  notes?: string | null;
}

export interface UpdateQuoteInput {
  clientId?: string | null;
  quoteNumber: string;
  currency: string;
  dueDate: string;
  lineItems: CreateQuoteLineItemInput[];
  notes?: string | null;
  recipientCompanyName?: string | null;
  recipientContactName?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
}
