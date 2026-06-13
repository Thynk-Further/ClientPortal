import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  FinanceAnalytics,
  FinanceApiService,
} from '@/app/core/api/services/finance-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';

import {
  agingBreakdownBars,
  cashflowBars,
  FinanceBreakdownBar,
  formatFinanceAmount,
  invoiceBreakdownBars,
  purchaseOrderBreakdownBars,
  quoteBreakdownBars,
  rfqBreakdownBars,
} from './finance-analytics-display.util';

@Component({
  selector: 'app-financial-summary',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="pb-5">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Financial Summary</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Portfolio-wide finance metrics across RFQs, quotes, purchase orders, and invoices.
        </p>
      </header>

      @if (loadError()) {
        <p class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ loadError() }}
        </p>
      }

      @if (isLoading()) {
        <p class="py-16 text-center text-sm text-muted-foreground">Loading financial summary...</p>
      } @else if (analytics(); as data) {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Key metrics">
          @for (stat of keyMetrics(data); track stat.label) {
            <article class="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
              <p class="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-foreground">
                {{ stat.value }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">{{ stat.hint }}</p>
            </article>
          }
        </section>

        <section class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Pipeline volume">
          @for (stat of pipelineMetrics(data); track stat.label) {
            <article class="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
              <p class="mt-2 text-2xl font-semibold tabular-nums text-foreground">{{ stat.value }}</p>
            </article>
          }
        </section>

        <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Collections trend</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Payments received over the last six months.</p>
            <div class="mt-5 space-y-3">
              @for (point of cashflowBars(data.cashflow); track point.label) {
                <div class="grid grid-cols-[5rem_1fr_5rem] items-center gap-3">
                  <span class="text-xs text-muted-foreground">{{ point.label }}</span>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-emerald-500 transition-all"
                      [style.width.%]="point.percent"
                    ></div>
                  </div>
                  <span class="text-right text-xs tabular-nums text-foreground">
                    {{ formatAmount(point.inflow) }}
                  </span>
                </div>
              } @empty {
                <p class="text-sm text-muted-foreground">No payment activity recorded yet.</p>
              }
            </div>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Outstanding aging</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Unpaid invoice balances by overdue bucket.</p>
            <div class="mt-5 space-y-3">
              @for (bucket of agingBreakdownBars(data.aging); track bucket.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-foreground">{{ bucket.label }}</span>
                    <span class="tabular-nums text-muted-foreground">{{ formatAmount(bucket.amount) }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full transition-all"
                      [class]="bucket.barClass"
                      [style.width.%]="bucket.percent"
                    ></div>
                  </div>
                </div>
              }
            </div>
          </article>
        </section>

        <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-foreground">Client RFQs</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">{{ data.pipeline.totalRfqs }} total requests.</p>
              </div>
              <a routerLink="/finance/rfqs" class="text-sm font-medium text-primary hover:underline">View all</a>
            </div>
            <div class="mt-5 space-y-3">
              @for (item of rfqBreakdownBars(data.rfqStatusBreakdown); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="shrink-0 text-muted-foreground">{{ item.count }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-foreground">Quotes</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Open pipeline value {{ formatAmount(data.pipeline.openQuotesValue) }}.
                </p>
              </div>
              <a routerLink="/finance/quotes" class="text-sm font-medium text-primary hover:underline">View all</a>
            </div>
            <div class="mt-5 space-y-3">
              @for (item of quoteBreakdownBars(data.quoteStatusBreakdown); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="shrink-0 text-muted-foreground">
                      {{ item.count }}
                      @if (item.totalValue !== null) {
                        <span class="ml-2 tabular-nums">· {{ formatAmount(item.totalValue) }}</span>
                      }
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-foreground">Purchase orders</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Open order value {{ formatAmount(data.pipeline.openPurchaseOrdersValue) }}.
                </p>
              </div>
              <a routerLink="/finance/purchase-orders" class="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>
            <div class="mt-5 space-y-3">
              @for (item of purchaseOrderBreakdownBars(data.purchaseOrderStatusBreakdown); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="shrink-0 tabular-nums text-muted-foreground">
                      {{ item.count }} · {{ formatAmount(item.totalValue ?? 0) }}
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="flex items-start justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold text-foreground">Invoices</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  {{ data.invoices.overdueCount }} overdue · {{ data.pendingPaymentSubmissions }} proofs pending.
                </p>
              </div>
              <a routerLink="/finance" class="text-sm font-medium text-primary hover:underline">View all</a>
            </div>
            <div class="mt-5 space-y-3">
              @for (item of invoiceBreakdownBars(data.invoiceStatusBreakdown); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-3 text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="shrink-0 tabular-nums text-muted-foreground">
                      {{ item.count }} · {{ formatAmount(item.totalValue ?? 0) }}
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>
        </section>
      }
    </div>
  `,
})
export class FinancialSummaryComponent implements OnInit {
  private readonly financeApi = inject(FinanceApiService);

  protected readonly analytics = signal<FinanceAnalytics | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly loadError = signal<string | null>(null);

  protected readonly formatAmount = formatFinanceAmount;
  protected readonly rfqBreakdownBars = rfqBreakdownBars;
  protected readonly quoteBreakdownBars = quoteBreakdownBars;
  protected readonly purchaseOrderBreakdownBars = purchaseOrderBreakdownBars;
  protected readonly invoiceBreakdownBars = invoiceBreakdownBars;
  protected readonly agingBreakdownBars = agingBreakdownBars;
  protected readonly cashflowBars = cashflowBars;

  async ngOnInit(): Promise<void> {
    await this.loadAnalytics();
  }

  protected keyMetrics(data: FinanceAnalytics): Array<{ label: string; value: string; hint: string }> {
    return [
      {
        label: 'Outstanding',
        value: formatFinanceAmount(data.invoices.totalOutstanding),
        hint: 'Unpaid invoice balance across the portfolio.',
      },
      {
        label: 'Collected this month',
        value: formatFinanceAmount(data.invoices.paidThisMonth),
        hint: 'Payments recorded in the current calendar month.',
      },
      {
        label: 'Total invoiced',
        value: formatFinanceAmount(data.invoices.totalInvoiced),
        hint: 'Lifetime invoice value excluding cancelled invoices.',
      },
      {
        label: 'Overdue invoices',
        value: String(data.invoices.overdueCount),
        hint: `${data.pendingPaymentSubmissions} client payment proof(s) awaiting review.`,
      },
    ];
  }

  protected pipelineMetrics(data: FinanceAnalytics): Array<{ label: string; value: string }> {
    return [
      { label: 'RFQs', value: String(data.pipeline.totalRfqs) },
      { label: 'Quotes', value: String(data.pipeline.totalQuotes) },
      { label: 'Purchase orders', value: String(data.pipeline.totalPurchaseOrders) },
      { label: 'Invoices', value: String(data.pipeline.totalInvoices) },
    ];
  }

  private async loadAnalytics(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const result = await firstValueFrom(this.financeApi.getAnalytics());
      this.analytics.set(result);
    } catch (error) {
      this.loadError.set(readHttpErrorMessage(error, 'Failed to load financial summary.'));
      this.analytics.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
