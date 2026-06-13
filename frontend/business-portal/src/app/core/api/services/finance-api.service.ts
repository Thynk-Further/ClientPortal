import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

import { unwrapApiEnvelopeData } from '../api-envelope.util';
import { ApiClientService } from '../api-client.service';
import { ApiEnvelope } from '../models';

export interface FinanceStatusBreakdown {
  status: number;
  count: number;
  totalValue: number;
}

export interface FinancePipelineSummary {
  totalRfqs: number;
  totalQuotes: number;
  totalPurchaseOrders: number;
  totalInvoices: number;
  openQuotesValue: number;
  openPurchaseOrdersValue: number;
  invoicedValue: number;
  collectedValue: number;
  outstandingValue: number;
}

export interface FinanceInvoiceMetrics {
  totalOutstanding: number;
  paidThisMonth: number;
  overdueCount: number;
  totalInvoiced: number;
  totalCollected: number;
}

export interface InvoiceAgingSummary {
  current: number;
  days1To30: number;
  days31To60: number;
  days61To90: number;
  days91Plus: number;
  totalOutstanding: number;
  overdueCount: number;
}

export interface CashflowPoint {
  period: string;
  inflow: number;
  outflow: number;
  netCashflow: number;
}

export interface FinanceAnalytics {
  pipeline: FinancePipelineSummary;
  invoices: FinanceInvoiceMetrics;
  aging: InvoiceAgingSummary;
  rfqStatusBreakdown: FinanceStatusBreakdown[];
  quoteStatusBreakdown: FinanceStatusBreakdown[];
  purchaseOrderStatusBreakdown: FinanceStatusBreakdown[];
  invoiceStatusBreakdown: FinanceStatusBreakdown[];
  cashflow: CashflowPoint[];
  pendingPaymentSubmissions: number;
}

@Injectable({ providedIn: 'root' })
export class FinanceApiService {
  private readonly basePath = '/api/v1/finance';

  constructor(private readonly apiClient: ApiClientService) {}

  getAnalytics(clientId?: string): Observable<FinanceAnalytics> {
    const query = clientId ? { clientId } : undefined;
    return this.apiClient
      .get<ApiEnvelope<FinanceAnalytics>>(`${this.basePath}/analytics`, query)
      .pipe(map((response) => unwrapApiEnvelopeData(response)));
  }
}
