import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ClientApiService, ClientDetail } from '@/app/core/api/services/client-api.service';
import { QuoteApiService, QuoteDetail } from '@/app/core/api/services/quote-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  QuoteDocumentComponent,
  QuoteDocumentSavePayload,
} from './quote-document.component';
import {
  formatQuoteDate,
  formatQuoteMoney,
  quoteStatusAccentClass,
  quoteStatusLabel,
} from './quote-display.util';

const EXTERNAL_QUOTE_ORIGIN = 3;

@Component({
  selector: 'app-quote-workflow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, QuoteDocumentComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <a routerLink="/finance/quotes" class="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Back to quotes
      </a>

      @if (loadError()) {
        <p class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ loadError() }}
        </p>
      } @else if (isLoading()) {
        <p class="mt-8 text-center text-sm text-muted-foreground">Loading quote...</p>
      } @else if (quote(); as detail) {
        <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ displayTitle(detail) }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">
              {{ pageSubtitle(detail) }}
            </p>
          </div>
          <ui-status-badge [status]="statusLabel(detail.status)" />
        </header>

        <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,340px)_1fr]">
          <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section
              class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10"
            >
              <div class="flex">
                <div
                  class="w-1 shrink-0 self-stretch"
                  [class]="quoteStatusAccentClass(detail.status)"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0 flex-1 p-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Quote summary
                  </h2>

                  <dl class="mt-3 space-y-3 text-sm">
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {{ isExternalQuote(detail) ? 'Recipient' : 'Client' }}
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">
                        {{ recipientLabel(detail) }}
                      </dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Reference
                      </dt>
                      <dd class="mt-0.5 font-mono text-foreground">{{ detail.quoteNumber }}</dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Currency
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ detail.currency }}</dd>
                    </div>
                    <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Valid until
                      </dt>
                      <dd class="mt-1 font-medium text-foreground">{{ formatDate(detail.dueDate) }}</dd>
                      <dd class="text-xs text-muted-foreground">
                        Created {{ formatDate(detail.createdAt) }}
                      </dd>
                    </div>
                    <div class="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Total quoted
                      </dt>
                      <dd class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {{ formatMoney(detail.total, detail.currency) }}
                      </dd>
                    </div>
                    @if (detail.rfqId && detail.clientId) {
                      <div>
                        <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Source RFQ
                        </dt>
                        <dd class="mt-0.5">
                          <a
                            class="text-sm font-medium text-primary hover:underline"
                            [routerLink]="['/finance/rfqs', detail.rfqId]"
                            [queryParams]="{ clientId: detail.clientId }"
                          >
                            View RFQ
                          </a>
                        </dd>
                      </div>
                    }
                  </dl>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Quoted items
              </h2>
              <ul class="mt-3 divide-y divide-border/60">
                @for (item of detail.lineItems; track item.description) {
                  <li class="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span class="font-medium text-foreground">{{ item.description }}</span>
                    <span class="shrink-0 tabular-nums text-muted-foreground">
                      × {{ item.quantity }}
                    </span>
                  </li>
                }
              </ul>
            </section>
          </aside>

          <div class="min-w-0">
            <app-quote-document
              [quote]="detail"
              [client]="client()"
              [readonly]="!isDraft(detail)"
              [isSaving]="isSaving()"
              (saveQuote)="saveQuote(detail, $event)"
              (sendQuote)="sendQuote(detail, $event)"
            />
          </div>
        </div>
      }
    </div>
  `,
})
export class QuoteWorkflowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastNotificationService);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly clientApi = inject(ClientApiService);

  protected readonly quoteId = computed(
    () => this.route.snapshot.paramMap.get('quoteId') ?? '',
  );

  protected readonly quote = signal<QuoteDetail | null>(null);
  protected readonly client = signal<ClientDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);

  protected readonly statusLabel = quoteStatusLabel;
  protected readonly quoteStatusAccentClass = quoteStatusAccentClass;
  protected readonly formatDate = formatQuoteDate;
  protected readonly formatMoney = formatQuoteMoney;

  private clientId: string | null = null;

  async ngOnInit(): Promise<void> {
    this.clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (!this.quoteId()) {
      this.loadError.set('Quote could not be loaded.');
      this.isLoading.set(false);
      return;
    }

    await this.loadQuote();
  }

  protected displayTitle(detail: QuoteDetail): string {
    const title = detail.rfqTitle?.trim();
    return title || detail.quoteNumber;
  }

  protected isExternalQuote(detail: QuoteDetail): boolean {
    return detail.origin === EXTERNAL_QUOTE_ORIGIN;
  }

  protected recipientLabel(detail: QuoteDetail): string {
    if (this.isExternalQuote(detail)) {
      return detail.recipientCompanyName?.trim() || 'External recipient';
    }

    return this.client()?.companyName ?? 'Unknown client';
  }

  protected pageSubtitle(detail: QuoteDetail): string {
    if (this.isExternalQuote(detail)) {
      if (detail.status === 1) {
        return 'Prepare the quotation and mark it as sent once delivered to the recipient.';
      }

      if (detail.status === 2) {
        return 'This quotation has been marked as sent to the off-platform recipient.';
      }

      return `Quotation status: ${quoteStatusLabel(detail.status).toLowerCase()}.`;
    }

    if (detail.status === 1) {
      return 'Review the formal quotation and send it to the client when ready.';
    }

    if (detail.status === 2) {
      return 'This quotation has been sent. Awaiting the client decision in the client portal.';
    }

    return `Quotation status: ${quoteStatusLabel(detail.status).toLowerCase()}.`;
  }

  protected isDraft(detail: QuoteDetail): boolean {
    return detail.status === 1;
  }

  protected async saveQuote(detail: QuoteDetail, payload: QuoteDocumentSavePayload): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.quoteApi.updateQuote(detail.id, this.buildUpdatePayload(detail, payload)));
      this.toast.success('Quote saved.');
      await this.loadQuote();
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to save quote.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async sendQuote(detail: QuoteDetail, payload: QuoteDocumentSavePayload): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.quoteApi.updateQuote(detail.id, this.buildUpdatePayload(detail, payload)));
      await firstValueFrom(this.quoteApi.sendQuote(detail.id, detail.clientId));
      this.toast.success(
        this.isExternalQuote(detail) ? 'Quote marked as sent.' : 'Quote sent to client.',
      );
      await this.loadQuote();
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to send quote.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private buildUpdatePayload(detail: QuoteDetail, payload: QuoteDocumentSavePayload) {
    return {
      clientId: detail.clientId,
      quoteNumber: payload.quoteNumber,
      currency: detail.currency,
      dueDate: payload.dueDate,
      lineItems: payload.lineItems,
      notes: payload.notes,
      recipientCompanyName: payload.recipientCompanyName,
      recipientContactName: payload.recipientContactName,
      recipientEmail: payload.recipientEmail,
      recipientPhone: payload.recipientPhone,
    };
  }

  private async loadQuote(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const detail = await firstValueFrom(
        this.quoteApi.getQuoteById(this.quoteId(), this.clientId),
      );
      this.quote.set(detail);

      if (detail.clientId) {
        const client = await firstValueFrom(this.clientApi.getClientById(detail.clientId));
        this.client.set(client);
      } else {
        this.client.set(null);
      }
    } catch (error) {
      this.loadError.set(readHttpErrorMessage(error, 'Failed to load quote.'));
      this.quote.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
