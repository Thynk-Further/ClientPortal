import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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
  readonly clientName: string;
  readonly status: 'Draft' | 'Sent' | 'Accepted' | 'Rejected';
  readonly totalAmount: string;
}

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
                Quote workflow readiness for business portal sales operations.
              </p>
              <a [routerLink]="['/finance/quotes/create']">
                <ui-button label="Create Quote" />
              </a>
            </div>

            <ui-data-table
              [columns]="columns"
              [rows]="quotes"
              rowTrackByKey="id"
              emptyStateMessage="No quotes available."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />

            <div class="mt-4 rounded-lg border border-dashed p-3">
              <p class="text-xs text-muted-foreground">Open quote workflow:</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (quote of quotes; track quote.id) {
                  <a
                    class="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    [routerLink]="['/finance/quotes', quote.id]"
                  >
                    {{ quote.quoteNumber }}
                  </a>
                }
              </div>
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class QuoteListComponent {
  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'quoteNumber', header: 'Quote #', sortable: true },
    { key: 'clientName', header: 'Client', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'totalAmount', header: 'Total', sortable: true },
  ];

  protected readonly quotes: ReadonlyArray<QuoteRow> = [
    {
      id: 'quote-001',
      quoteNumber: 'Q-2026-011',
      clientName: 'Contoso Architects',
      status: 'Draft',
      totalAmount: '$6,420.00',
    },
    {
      id: 'quote-002',
      quoteNumber: 'Q-2026-012',
      clientName: 'Northwind Retail',
      status: 'Sent',
      totalAmount: '$3,950.00',
    },
    {
      id: 'quote-003',
      quoteNumber: 'Q-2026-013',
      clientName: 'Fabrikam Manufacturing',
      status: 'Accepted',
      totalAmount: '$12,100.00',
    },
  ];
}
