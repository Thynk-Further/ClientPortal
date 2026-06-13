import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  ClientApiService,
  ClientSummary,
} from '@/app/core/api/services/client-api.service';
import {
  InvoiceApiService,
  InvoiceSummary,
} from '@/app/core/api/services/invoice-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { AppendToBodyDirective } from '@/components/ui/append-to-body.directive';

import {
  INVOICE_STATUS_DRAFT,
  formatInvoiceDate,
  invoiceStatusClass,
  invoiceStatusLabel,
} from './invoice-display.util';
import { formatQuoteMoney } from './quote-display.util';
import { SearchableClientFilterComponent } from './searchable-client-filter.component';

type InvoiceStatusTab = 'all' | 1 | 2 | 4 | 5 | 6 | 7;
type SortKey =
  | 'invoiceNumber'
  | 'client'
  | 'total'
  | 'outstanding'
  | 'status'
  | 'dueDate'
  | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface InvoiceStatusTabOption {
  readonly id: InvoiceStatusTab;
  readonly label: string;
}

interface TableColumn {
  readonly key: SortKey;
  readonly label: string;
  readonly sortable: boolean;
}

interface EnrichedInvoice extends InvoiceSummary {
  clientCompanyName: string;
}

interface RowActionMenu {
  readonly invoice: EnrichedInvoice;
  readonly top: number;
  readonly left: number;
}

@Component({
  selector: 'app-invoice-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppendToBodyDirective, SearchableClientFilterComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="flex items-center justify-between gap-4 pb-5">
        <div>
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Invoices</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Review billing status, track outstanding amounts, and manage invoice operations.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          (click)="goToCreateInvoice()"
        >
          + Create Invoice
        </button>
      </header>

      <div class="flex flex-wrap gap-1 pb-4">
        @for (tab of statusTabs; track tab.id) {
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-neutral-100]="activeStatusTab() === tab.id"
            [class.text-foreground]="activeStatusTab() === tab.id"
            [class.text-muted-foreground]="activeStatusTab() !== tab.id"
            [class.hover:text-foreground]="activeStatusTab() !== tab.id"
            (click)="setStatusTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <form class="mb-4" [formGroup]="filterForm" (ngSubmit)="$event.preventDefault()">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="relative min-w-0 flex-1 sm:max-w-md">
            <svg
              class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="m21 21-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
              />
            </svg>
            <input
              type="search"
              class="h-9 w-full rounded-lg border border-border/80 bg-background py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-neutral-400"
              placeholder="Search invoices..."
              formControlName="search"
            />
          </div>

          <app-searchable-client-filter
            formControlName="clientId"
            [clients]="clients()"
          />
        </div>
      </form>

      @if (errorMessage()) {
        <p class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      <div class="overflow-x-auto rounded-lg border border-border/70 bg-background">
        <table class="w-full min-w-[960px] text-sm">
          <thead>
            <tr class="border-b border-border/70 text-left text-muted-foreground">
              @for (column of tableColumns; track column.key) {
                <th class="px-3 py-3 font-medium">
                  @if (column.sortable) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      (click)="toggleSort(column.key)"
                    >
                      {{ column.label }}
                      <svg class="h-3.5 w-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.75"
                          [attr.d]="sortIconPath(column.key)"
                        />
                      </svg>
                    </button>
                  } @else {
                    <span>{{ column.label }}</span>
                  }
                </th>
              }
              <th class="w-10 px-3 py-3" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            @if (isLoading()) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="8">
                  Loading invoices...
                </td>
              </tr>
            } @else if (displayedInvoices().length === 0) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="8">
                  @if (hasActiveFilters()) {
                    No invoices match your filters.
                  } @else if (activeStatusTab() === 1) {
                    No draft invoices yet. Draft invoices are created when purchase orders are approved.
                  } @else {
                    No invoices found for this status.
                  }
                </td>
              </tr>
            } @else {
              @for (invoice of displayedInvoices(); track invoice.id) {
                <tr class="border-b border-border/50">
                  <td class="px-3 py-4">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-neutral-100 text-neutral-500"
                      >
                        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                          />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14 2v6h6" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M9 13h6M9 17h4" />
                        </svg>
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-foreground">{{ invoice.invoiceNumber }}</p>
                        @if (invoice.outstandingAmount > 0) {
                          <p class="mt-0.5 truncate text-xs text-amber-700 dark:text-amber-400">
                            {{ formatMoney(invoice.outstandingAmount, invoice.currency) }} outstanding
                          </p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4 text-foreground">{{ invoice.clientCompanyName }}</td>
                  <td class="px-3 py-4 font-medium tabular-nums text-foreground">
                    {{ formatMoney(invoice.total, invoice.currency) }}
                  </td>
                  <td class="px-3 py-4 tabular-nums text-muted-foreground">
                    {{ formatMoney(invoice.outstandingAmount, invoice.currency) }}
                  </td>
                  <td class="px-3 py-4">
                    <span [class]="statusClass(invoice.status)">
                      {{ statusLabel(invoice.status) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">{{ formatDate(invoice.dueDate) }}</td>
                  <td class="px-3 py-4 text-muted-foreground">{{ formatDate(invoice.createdAt) }}</td>
                  <td class="px-3 py-4">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
                      [attr.aria-label]="'Actions for ' + invoice.invoiceNumber"
                      [attr.aria-expanded]="rowMenu()?.invoice?.id === invoice.id"
                      (click)="toggleRowMenu(invoice, $event)"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div
          class="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted-foreground">{{ resultsSummary() }}</p>

          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows</span>
              <select
                class="h-9 rounded-lg border border-border/80 bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-neutral-400"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
              >
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </label>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="inline-flex h-9 items-center rounded-lg border border-border/80 px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                [class.text-muted-foreground]="!canGoPrevious()"
                [class.text-foreground]="canGoPrevious()"
                [class.hover:bg-neutral-50]="canGoPrevious()"
                [disabled]="!canGoPrevious()"
                (click)="goToPreviousPage()"
              >
                Previous
              </button>

              @for (pageNumber of visiblePageNumbers(); track pageNumber) {
                <button
                  type="button"
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors"
                  [class.border-neutral-950]="pageNumber === page()"
                  [class.bg-neutral-950]="pageNumber === page()"
                  [class.text-white]="pageNumber === page()"
                  [class.border-border/80]="pageNumber !== page()"
                  [class.text-foreground]="pageNumber !== page()"
                  [class.hover:bg-neutral-50]="pageNumber !== page()"
                  (click)="goToPage(pageNumber)"
                >
                  {{ pageNumber }}
                </button>
              }

              <button
                type="button"
                class="inline-flex h-9 items-center rounded-lg border border-border/80 px-3 text-sm font-medium text-foreground transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground"
                [disabled]="!canGoNext()"
                (click)="goToNextPage()"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      @if (rowMenu(); as menu) {
        <div
          uiAppendToBody
          class="fixed z-[200] min-w-[10.5rem] rounded-lg border border-border/80 bg-background py-1 shadow-lg"
          [style.top.px]="menu.top"
          [style.left.px]="menu.left"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50"
            (click)="openInvoice(menu.invoice)"
          >
            <svg class="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M15 3h6v6M10 14 21 3l7-7M21 3h-6v6"
              />
            </svg>
            Open
          </button>
          @if (canSendInvoice(menu.invoice)) {
            <button
              type="button"
              class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50 disabled:opacity-50"
              [disabled]="isSending()"
              (click)="sendInvoice(menu.invoice)"
            >
              <svg class="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M22 2 11 13M22 2l-7 20-4-9-9-4z"
                />
              </svg>
              Send to client
            </button>
          }
        </div>
      }
    </div>
  `,
  host: {
    '(document:click)': 'closeMenus()',
    '(window:scroll)': 'closeRowMenu()',
    '(window:resize)': 'closeRowMenu()',
  },
})
export class InvoiceListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly invoiceApi = inject(InvoiceApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly toast = inject(ToastNotificationService);

  protected readonly isSending = signal(false);

  protected readonly filterForm = this.formBuilder.group({
    search: [''],
    clientId: this.formBuilder.control<string | null>(null),
  });

  protected readonly clients = signal<ClientSummary[]>([]);
  protected readonly activeStatusTab = signal<InvoiceStatusTab>('all');
  protected readonly sortKey = signal<SortKey>('createdAt');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly rowMenu = signal<RowActionMenu | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoices = signal<EnrichedInvoice[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 50] as const;

  private clientNameById = new Map<string, string>();

  protected readonly statusTabs: ReadonlyArray<InvoiceStatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 1, label: invoiceStatusLabel(1) },
    { id: 2, label: invoiceStatusLabel(2) },
    { id: 4, label: invoiceStatusLabel(4) },
    { id: 5, label: invoiceStatusLabel(5) },
    { id: 6, label: invoiceStatusLabel(6) },
    { id: 7, label: invoiceStatusLabel(7) },
  ];

  protected readonly tableColumns: ReadonlyArray<TableColumn> = [
    { key: 'invoiceNumber', label: 'Invoice', sortable: true },
    { key: 'client', label: 'Client', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'outstanding', label: 'Outstanding', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'dueDate', label: 'Due date', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ];

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredInvoices().length / this.pageSize())),
  );

  protected readonly visiblePageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected readonly filteredInvoices = computed(() => {
    const search = this.filterForm.controls.search.value?.trim().toLowerCase() ?? '';
    const items = [...this.invoices()];
    const sortKey = this.sortKey();
    const sortDirection = this.sortDirection();

    let filtered = items;
    if (search !== '') {
      filtered = items.filter(
        (invoice) =>
          invoice.invoiceNumber.toLowerCase().includes(search) ||
          invoice.clientCompanyName.toLowerCase().includes(search),
      );
    }

    filtered.sort((left, right) => compareInvoices(left, right, sortKey, sortDirection));
    return filtered;
  });

  protected readonly displayedInvoices = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredInvoices().slice(start, start + this.pageSize());
  });

  protected readonly resultsSummary = computed(() => {
    const total = this.filteredInvoices().length;
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `Showing ${start}-${end} of ${total} results`;
  });

  async ngOnInit(): Promise<void> {
    await this.loadClients();
    await this.loadInvoices();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
      });

    this.filterForm.controls.clientId.valueChanges.subscribe(() => {
      this.page.set(1);
      void this.loadInvoices();
    });
  }

  protected setStatusTab(tab: InvoiceStatusTab): void {
    this.activeStatusTab.set(tab);
    this.page.set(1);
    void this.loadInvoices();
  }

  protected hasActiveFilters(): boolean {
    return (
      (this.filterForm.controls.search.value?.trim() ?? '') !== ''
      || this.filterForm.controls.clientId.value !== null
    );
  }

  protected canGoPrevious(): boolean {
    return this.page() > 1;
  }

  protected canGoNext(): boolean {
    return this.page() < this.totalPages() && this.filteredInvoices().length > 0;
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.page.update((current) => current - 1);
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.page.update((current) => current + 1);
  }

  protected goToPage(pageNumber: number): void {
    if (pageNumber === this.page() || pageNumber < 1 || pageNumber > this.totalPages()) {
      return;
    }

    this.page.set(pageNumber);
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextPageSize = Number.parseInt(select.value, 10);
    if (Number.isNaN(nextPageSize) || nextPageSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(nextPageSize);
    this.page.set(1);
  }

  protected closeMenus(): void {
    this.rowMenu.set(null);
  }

  protected closeRowMenu(): void {
    this.rowMenu.set(null);
  }

  protected toggleRowMenu(invoice: EnrichedInvoice, event: MouseEvent): void {
    event.stopPropagation();

    if (this.rowMenu()?.invoice?.id === invoice.id) {
      this.rowMenu.set(null);
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 168;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    this.rowMenu.set({
      invoice,
      top: rect.bottom + 4,
      left,
    });
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set(key === 'createdAt' ? 'desc' : 'asc');
  }

  protected sortIconPath(key: SortKey): string {
    if (this.sortKey() !== key) {
      return 'M8 9l4-4 4 4M8 15l4 4 4-4';
    }

    return this.sortDirection() === 'asc'
      ? 'M8 9l4-4 4 4'
      : 'M8 15l4 4 4-4';
  }

  protected goToCreateInvoice(): void {
    void this.router.navigate(['/finance/create']);
  }

  protected openInvoice(invoice: EnrichedInvoice): void {
    this.rowMenu.set(null);
    void this.router.navigate(['/finance', invoice.id], {
      queryParams: { clientId: invoice.clientId },
    });
  }

  protected canSendInvoice(invoice: EnrichedInvoice): boolean {
    return invoice.status === INVOICE_STATUS_DRAFT;
  }

  protected async sendInvoice(invoice: EnrichedInvoice): Promise<void> {
    this.rowMenu.set(null);
    this.isSending.set(true);

    try {
      await firstValueFrom(this.invoiceApi.sendInvoice(invoice.id, invoice.clientId));
      this.toast.success('Invoice sent to client.');
      await this.loadInvoices();
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to send invoice.'));
    } finally {
      this.isSending.set(false);
    }
  }

  protected statusLabel(status: number): string {
    return invoiceStatusLabel(status);
  }

  protected statusClass(status: number): string {
    return invoiceStatusClass(status);
  }

  protected formatDate(value: string): string {
    return formatInvoiceDate(value);
  }

  protected formatMoney(total: number, currency: string): string {
    return formatQuoteMoney(total, currency);
  }

  private async loadClients(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.clientApi.getClients({ page: 1, pageSize: 200 }),
      );
      this.clients.set(result.items);
      this.clientNameById = new Map(
        result.items.map((client) => [client.id, client.companyName]),
      );
    } catch {
      this.clients.set([]);
      this.clientNameById = new Map();
    }
  }

  private async loadInvoices(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const statusTab = this.activeStatusTab();
      const status = statusTab === 'all' ? undefined : statusTab;
      const clientId = this.filterForm.controls.clientId.value ?? undefined;

      const result = await firstValueFrom(
        this.invoiceApi.getInvoices({
          clientId: clientId ?? undefined,
          status,
          page: 1,
          pageSize: 200,
        }),
      );

      this.invoices.set(
        result.items.map((invoice) => ({
          ...invoice,
          clientCompanyName: this.clientNameById.get(invoice.clientId) ?? 'Unknown client',
        })),
      );
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load invoices.'));
      this.invoices.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}

function compareInvoices(
  left: EnrichedInvoice,
  right: EnrichedInvoice,
  key: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  switch (key) {
    case 'invoiceNumber':
      return multiplier * left.invoiceNumber.localeCompare(right.invoiceNumber);
    case 'client':
      return multiplier * left.clientCompanyName.localeCompare(right.clientCompanyName);
    case 'total':
      return multiplier * (left.total - right.total);
    case 'outstanding':
      return multiplier * (left.outstandingAmount - right.outstandingAmount);
    case 'status':
      return multiplier * (left.status - right.status);
    case 'dueDate':
      return multiplier * (Date.parse(left.dueDate) - Date.parse(right.dueDate));
    case 'createdAt':
      return multiplier * (Date.parse(left.createdAt) - Date.parse(right.createdAt));
    default:
      return 0;
  }
}
