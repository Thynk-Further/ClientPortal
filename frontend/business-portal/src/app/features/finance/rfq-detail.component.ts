import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ClientApiService, ClientDetail } from '@/app/core/api/services/client-api.service';
import { RfqApiService, RfqDetail } from '@/app/core/api/services/rfq-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
import {
  QuotationDocumentSubmitPayload,
  RfqQuotationDocumentComponent,
} from './rfq-quotation-document.component';
import {
  formatRfqDateTime,
  formatRfqDueDate,
  formatRfqDueTime,
  rfqDueUrgency,
  rfqDueUrgencyLabel,
  rfqStatusAccentClass,
  rfqStatusLabel,
} from './rfq-display.util';

@Component({
  selector: 'app-rfq-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, RfqQuotationDocumentComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <a routerLink="/finance/rfqs" class="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Back to RFQs
      </a>

      @if (loadError()) {
        <p class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ loadError() }}
        </p>
      } @else if (rfq(); as detail) {
        <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ displayTitle(detail) }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">
              Review the client request and prepare a formal quotation.
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
                  [class]="rfqStatusAccentClass(detail.status)"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0 flex-1 p-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Request summary
                  </h2>

                  <dl class="mt-3 space-y-3 text-sm">
                    @if (detail.clientCompanyName) {
                      <div>
                        <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Client
                        </dt>
                        <dd class="mt-0.5 font-medium text-foreground">{{ detail.clientCompanyName }}</dd>
                      </div>
                    }
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        RFQ no.
                      </dt>
                      <dd class="mt-0.5 font-mono text-foreground">{{ detail.rfqNumber }}</dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Currency
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ detail.currency }}</dd>
                    </div>
                    <div
                      class="rounded-lg border px-3 py-2.5"
                      [class]="duePanelClass(detail.quotationDueAtUtc)"
                    >
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Client expects quotation by
                      </dt>
                      <dd class="mt-1 font-medium text-foreground">
                        {{ formatRfqDueDate(detail.quotationDueAtUtc) }}
                      </dd>
                      <dd class="text-xs text-muted-foreground">
                        {{ formatRfqDueTime(detail.quotationDueAtUtc) }}
                        @if (dueUrgencyText(detail.quotationDueAtUtc); as urgency) {
                          · {{ urgency }}
                        }
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Requested items
              </h2>
              <ul class="mt-3 divide-y divide-border/60">
                @for (item of detail.lineItems; track item.description) {
                  <li class="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span class="font-medium text-foreground">{{ item.description }}</span>
                    <span class="shrink-0 tabular-nums text-muted-foreground">× {{ item.quantity }}</span>
                  </li>
                }
              </ul>
              @if (detail.notes) {
                <p class="mt-3 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">
                  {{ detail.notes }}
                </p>
              }
            </section>
          </aside>

          <div class="min-w-0">
            @if (detail.status === 2) {
              <app-rfq-quotation-document
                [rfq]="detail"
                [client]="client()"
                [isSaving]="isSaving()"
                (submitQuotation)="createQuotation($event)"
              />
            } @else if (detail.quotationId) {
              <section class="rounded-xl border border-border/70 bg-card p-6 text-sm shadow-sm dark:border-white/10">
                <p class="font-medium text-foreground">Quotation already created for this RFQ.</p>
                <p class="mt-1 text-muted-foreground">
                  Status: {{ statusLabel(detail.status) }}. Continue from the quotes workflow to send or revise.
                </p>
              </section>
            } @else {
              <section class="rounded-xl border border-border/70 bg-card p-6 text-sm shadow-sm dark:border-white/10">
                <p class="text-muted-foreground">
                  A quotation can only be created while the RFQ is pending review.
                </p>
              </section>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class RfqDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rfqApi = inject(RfqApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly toast = inject(ToastNotificationService);

  protected readonly rfq = signal<RfqDetail | null>(null);
  protected readonly client = signal<ClientDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSaving = signal(false);

  protected readonly statusLabel = rfqStatusLabel;
  protected readonly rfqStatusAccentClass = rfqStatusAccentClass;
  protected readonly formatRfqDueDate = formatRfqDueDate;
  protected readonly formatRfqDueTime = formatRfqDueTime;
  protected readonly formatDateTime = formatRfqDateTime;

  private rfqId = '';
  private clientId = '';

  async ngOnInit(): Promise<void> {
    this.rfqId = this.route.snapshot.paramMap.get('rfqId') ?? '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';
    if (!this.rfqId || !this.clientId) {
      this.loadError.set('RFQ details could not be loaded. Open the RFQ from the Client RFQs list.');
      return;
    }

    try {
      const [detail, client] = await Promise.all([
        firstValueFrom(this.rfqApi.getRfqById(this.rfqId, this.clientId)),
        firstValueFrom(this.clientApi.getClientById(this.clientId)),
      ]);
      this.rfq.set(detail);
      this.client.set(client);
    } catch (error) {
      this.loadError.set(readHttpErrorMessage(error, 'Failed to load RFQ.'));
    }
  }

  protected displayTitle(detail: RfqDetail): string {
    const title = detail.title?.trim();
    return title === '' || title === undefined ? 'Untitled' : title;
  }

  protected dueUrgencyText(value: string): string | null {
    return rfqDueUrgencyLabel(value);
  }

  protected duePanelClass(value: string): string {
    switch (rfqDueUrgency(value)) {
      case 'overdue':
        return 'border-red-200/80 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10';
      case 'soon':
        return 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10';
      default:
        return 'border-border/50 bg-muted/20';
    }
  }

  protected async createQuotation(payload: QuotationDocumentSubmitPayload): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.rfqApi.createQuotationFromRfq(this.rfqId, {
          clientId: this.clientId,
          quoteNumber: payload.quoteNumber,
          dueDate: payload.dueDate,
          lineItems: payload.lineItems,
          notes: payload.notes,
        }),
      );
      this.toast.success('Quotation created. Send it from the Quotes workflow.');
      const detail = await firstValueFrom(this.rfqApi.getRfqById(this.rfqId, this.clientId));
      this.rfq.set(detail);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to create quotation.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
