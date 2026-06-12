import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { QuoteApiService, QuoteSummary } from '@/app/core/api/services/quote-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import {
  DataTableColumn,
  DataTableComponent,
  DataTableRow,
} from '@/components/ui/data-table.component';

interface QuoteRow extends DataTableRow {
  readonly id: string;
  readonly quoteNumber: string;
  readonly clientId: string;
  readonly status: string;
  readonly totalAmount: string;
}

const QUOTE_STATUS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Accepted',
  4: 'Rejected',
  5: 'Expired',
};

@Component({
  selector: 'app-quote-list',
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
    DataTableComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Quotes</ui-card-title>
            <ui-card-description>
              Build quotes, send to clients, and track acceptance decisions.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <div class="mb-4 flex items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">
                @if (errorMessage()) {
                  {{ errorMessage() }}
                } @else {
                  {{ quotes().length }} quotes loaded
                }
              </p>
              <a [routerLink]="['/finance/quotes/create']">
                <ui-button label="Create Quote" />
              </a>
            </div>

            <ui-data-table
              [columns]="columns"
              [rows]="quotes()"
              rowTrackByKey="id"
              emptyStateMessage="No quotes available."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class QuoteListComponent implements OnInit {
  private readonly quoteApi = inject(QuoteApiService);

  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'quoteNumber', header: 'Quote #', sortable: true },
    { key: 'clientId', header: 'Client ID', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'totalAmount', header: 'Total', sortable: true },
  ];

  protected readonly quotes = signal<QuoteRow[]>([]);
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.quoteApi.getQuotes());
      this.quotes.set(
        result.items.map((quote: QuoteSummary) => ({
          id: quote.id,
          quoteNumber: quote.quoteNumber,
          clientId: quote.clientId,
          status: QUOTE_STATUS[quote.status] ?? 'Unknown',
          totalAmount: `${quote.total} ${quote.currency}`,
          link: `/finance/quotes/${quote.id}?clientId=${quote.clientId}`,
        })),
      );
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load quotes.'));
    }
  }
}
