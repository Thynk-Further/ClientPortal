import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
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
import { InvoiceStore } from '@/app/core/stores/invoice.store';

interface InvoiceRow extends DataTableRow {
  readonly id: string;
  readonly invoiceNumber: string;
  readonly clientId: string;
  readonly status: string;
  readonly currencyCode: string;
  readonly totalAmount: number;
}

@Component({
  selector: 'app-invoice-list',
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
            <ui-card-title>Invoices</ui-card-title>
            <ui-card-description>
              Review billing lifecycle status and manage invoice operations.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">
                Total invoices loaded: {{ invoiceStore.totalCount() || invoiceRows().length }}
              </p>
              <a [routerLink]="['/finance/create']">
                <ui-button label="Create Invoice" />
              </a>
            </div>

            @if (invoiceStore.error() !== null) {
              <p class="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ invoiceStore.error() }}
              </p>
            }

            <ui-data-table
              [columns]="columns"
              [rows]="invoiceRows()"
              [loading]="invoiceStore.isLoading()"
              rowTrackByKey="id"
              emptyStateMessage="No invoices found."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />

            <div class="mt-4 rounded-lg border border-dashed p-3">
              <p class="text-xs text-muted-foreground">Open invoice detail:</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (invoice of invoiceRows(); track invoice.id) {
                  <a
                    class="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    [routerLink]="['/finance', invoice.id]"
                  >
                    {{ invoice.invoiceNumber }}
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
export class InvoiceListComponent {
  protected readonly invoiceStore = inject(InvoiceStore);

  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'invoiceNumber', header: 'Invoice #', sortable: true },
    { key: 'clientId', header: 'Client', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    {
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      cell: (row) => this.formatAmount(row as InvoiceRow),
    },
  ];

  protected readonly invoiceRows = computed<ReadonlyArray<InvoiceRow>>(() => {
    const rows = this.invoiceStore.invoices();
    if (rows.length > 0) {
      return rows as ReadonlyArray<InvoiceRow>;
    }

    return [
      {
        id: 'inv-001',
        invoiceNumber: 'INV-2026-041',
        clientId: 'client-01',
        status: 'Paid',
        currencyCode: 'USD',
        totalAmount: 2400,
      },
      {
        id: 'inv-002',
        invoiceNumber: 'INV-2026-042',
        clientId: 'client-03',
        status: 'Pending',
        currencyCode: 'USD',
        totalAmount: 3840,
      },
      {
        id: 'inv-003',
        invoiceNumber: 'INV-2026-043',
        clientId: 'client-02',
        status: 'Overdue',
        currencyCode: 'USD',
        totalAmount: 1525,
      },
    ];
  });

  constructor() {
    void this.invoiceStore.loadInvoices({ pageNumber: 1, pageSize: 20 });
  }

  private formatAmount(row: InvoiceRow): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: row.currencyCode || 'USD',
      maximumFractionDigits: 2,
    }).format(row.totalAmount ?? 0);
  }
}
