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
  ClientPortalApiService,
  ClientPortalInvoiceListItem,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

const INVOICE_STATUS_CLASSES: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  3: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  4: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  5: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  6: 'bg-destructive/10 text-destructive',
  7: 'bg-muted text-muted-foreground',
};

@Component({
  selector: 'app-client-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Invoices</h1>
        <p class="text-sm text-muted-foreground">
          View invoice status, amounts due, and pay outstanding balances online.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading invoices...</p>
      } @else if (invoices().length === 0) {
        <ui-card class="border-dashed">
          <ui-card-header>
            <ui-card-title>No invoices yet</ui-card-title>
            <ui-card-description>
              When invoices are issued for your account, they will appear here.
            </ui-card-description>
          </ui-card-header>
        </ui-card>
      } @else {
        <section class="space-y-3" aria-label="Invoice list">
          @for (invoice of invoices(); track invoice.id) {
            <ui-card class="transition-shadow hover:shadow-md">
              <ui-card-content class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-1">
                  <p class="font-medium text-foreground">
                    <a
                      [routerLink]="['/invoices', invoice.id]"
                      class="hover:text-primary hover:underline underline-offset-4"
                    >
                      {{ invoice.invoiceNumber }}
                    </a>
                  </p>
                  <p class="text-sm text-muted-foreground">
                    Due {{ formatDate(invoice.dueDate) }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(invoice.status)"
                  >
                    {{ statusLabel(invoice.status) }}
                  </span>
                  <div class="text-right">
                    <p class="text-sm font-semibold text-foreground">
                      {{ formatMoney(invoice.outstandingAmount, invoice.currency) }}
                    </p>
                    @if (invoice.outstandingAmount < invoice.total) {
                      <p class="text-xs text-muted-foreground">
                        of {{ formatMoney(invoice.total, invoice.currency) }}
                      </p>
                    }
                  </div>
                </div>
              </ui-card-content>
            </ui-card>
          }
        </section>
      }
    </div>
  `,
})
export class ClientInvoicesListComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoices = signal<ClientPortalInvoiceListItem[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadInvoices();
  }

  protected statusLabel(status: number): string {
    return INVOICE_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusClass(status: number): string {
    return INVOICE_STATUS_CLASSES[status] ?? INVOICE_STATUS_CLASSES[1];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  protected formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount);
  }

  private async loadInvoices(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getInvoices());
      this.invoices.set(result.invoices);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load invoices.'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
