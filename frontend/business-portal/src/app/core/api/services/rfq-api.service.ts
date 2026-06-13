import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope, PagedResult } from '../models';
import { CreateQuoteLineItemInput } from './quote-api.service';

export interface RfqLineItem {
  description: string;
  quantity: number;
}

export interface RfqSummary {
  id: string;
  clientId: string;
  clientCompanyName: string;
  projectId: string;
  rfqNumber: string;
  title: string;
  quotationDueAtUtc: string;
  status: number;
  currency: string;
  quotationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RfqDetail extends RfqSummary {
  lineItems: RfqLineItem[];
  notes: string | null;
}

export interface GetRfqsResult {
  rfqs: PagedResult<RfqSummary>;
}

@Injectable({ providedIn: 'root' })
export class RfqApiService {
  private readonly basePath = '/api/v1/rfqs';

  constructor(private readonly apiClient: ApiClientService) {}

  getRfqs(
    clientId?: string,
    status?: number,
    page = 1,
    pageSize = 20,
  ): Observable<PagedResult<RfqSummary>> {
    return this.apiClient
      .get<ApiEnvelope<GetRfqsResult>>(`${this.basePath}/`, {
        clientId,
        status,
        page,
        pageSize,
      })
      .pipe(map((response) => unwrapApiEnvelopeData(response).rfqs));
  }

  getRfqById(rfqId: string, clientId: string): Observable<RfqDetail> {
    return this.apiClient
      .get<ApiEnvelope<RfqDetail>>(`${this.basePath}/${rfqId}`, { clientId })
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }

  createQuotationFromRfq(
    rfqId: string,
    payload: {
      clientId: string;
      quoteNumber: string;
      dueDate: string;
      lineItems: CreateQuoteLineItemInput[];
      notes?: string;
    },
  ): Observable<unknown> {
    return this.apiClient
      .post<ApiEnvelope<unknown>, typeof payload>(`${this.basePath}/${rfqId}/quotations`, payload)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
