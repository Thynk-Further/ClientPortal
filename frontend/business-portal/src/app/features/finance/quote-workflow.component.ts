import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { QuoteApiService, QuoteDetail } from '@/app/core/api/services/quote-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

const QUOTE_STATUS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Accepted',
  4: 'Rejected',
  5: 'Expired',
};

@Component({
  selector: 'app-quote-workflow',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Quote Workflow</h1>
              <p class="text-sm text-muted-foreground">
                Send and process decision for
                <span class="font-medium">{{ quote()?.quoteNumber ?? quoteId() }}</span>.
              </p>
            </div>
            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/finance/quotes']"
            >
              Back to quotes
            </a>
          </div>
        </header>

        @if (quote(); as detail) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>Quote Status</ui-card-title>
              <ui-card-description>Current state of the client quote acceptance workflow.</ui-card-description>
            </ui-card-header>

            <ui-card-content>
              <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                <article class="rounded-lg border p-3">
                  <p class="text-xs text-muted-foreground">Client</p>
                  <p class="text-base font-semibold">{{ detail.clientId }}</p>
                </article>
                <article class="rounded-lg border p-3">
                  <p class="text-xs text-muted-foreground">Total</p>
                  <p class="text-base font-semibold">{{ detail.total }} {{ detail.currency }}</p>
                </article>
                <article class="rounded-lg border p-3">
                  <p class="text-xs text-muted-foreground">Status</p>
                  <p class="text-base font-semibold">{{ statusLabel(detail.status) }}</p>
                </article>
              </div>

              <div class="mt-4 flex flex-wrap items-center gap-2">
                <ui-button
                  label="Send to Client"
                  [disabled]="detail.status !== 1 || isSaving()"
                  (clicked)="onSend(detail)"
                />
              </div>

              <p class="mt-4 text-sm text-muted-foreground">
                RFQ response quotations are approved by clients in the client portal.
              </p>
            </ui-card-content>
          </ui-card>
        }
      </section>
    </main>
  `,
})
export class QuoteWorkflowComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastNotificationService);
  private readonly quoteApi = inject(QuoteApiService);

  protected readonly quoteId = computed(
    () => this.route.snapshot.paramMap.get('quoteId') ?? 'unknown-quote',
  );

  protected readonly quote = signal<QuoteDetail | null>(null);
  protected readonly isSaving = signal(false);

  async ngOnInit(): Promise<void> {
    const clientId = this.route.snapshot.queryParamMap.get('clientId');
    if (!clientId) {
      return;
    }

    const detail = await firstValueFrom(this.quoteApi.getQuoteById(this.quoteId(), clientId));
    this.quote.set(detail);
  }

  protected statusLabel(status: number): string {
    return QUOTE_STATUS[status] ?? 'Unknown';
  }

  protected async onSend(detail: QuoteDetail): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.quoteApi.sendQuote(detail.id, detail.clientId));
      this.toast.success('Quote sent to client.');
      const refreshed = await firstValueFrom(
        this.quoteApi.getQuoteById(detail.id, detail.clientId),
      );
      this.quote.set(refreshed);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to send quote.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
