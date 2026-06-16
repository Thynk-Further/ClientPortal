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
import { EmptyStateComponent } from '@/components/ui/empty-state.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

@Component({
  selector: 'app-client-invoices-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="pb-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Invoices</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          View invoice status, amounts due, and pay outstanding balances online.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading invoices...</p>
      } @else if (invoices().length === 0) {
        <ui-empty-state
          title="No invoices yet"
          message="When invoices are issued for your account, they will appear here."
        />
      } @else {
        <section class="space-y-3" aria-label="Invoice list">
          @for (invoice of invoices(); track invoice.id) {
            <a
              [routerLink]="['/invoices', invoice.id]"
              class="group flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div
                class="w-1 shrink-0"
                [class.bg-emerald-500]="invoice.status === 5"
                [class.bg-amber-500]="invoice.status === 4 || invoice.status === 6"
                [class.bg-blue-500]="invoice.status === 2 || invoice.status === 3"
                [class.bg-muted-foreground]="invoice.status === 1 || invoice.status === 7"
              ></div>
              <div class="flex flex-1 flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-2">
                  <div class="flex flex-wrap items-center gap-2">
                    <p class="font-medium text-foreground group-hover:text-primary">
                      {{ invoice.invoiceNumber }}
                    </p>
                    <ui-status-badge [status]="statusLabel(invoice.status)" />
                  </div>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Due {{ formatDate(invoice.dueDate) }}
                  </p>
                </div>

                <div class="text-left sm:text-right">
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
            </a>
          }
        </section>
      }
    </main>
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
