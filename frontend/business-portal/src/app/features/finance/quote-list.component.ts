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

import { ClientApiService } from '@/app/core/api/services/client-api.service';
import { QuoteApiService, QuoteSummary } from '@/app/core/api/services/quote-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { AppendToBodyDirective } from '@/components/ui/append-to-body.directive';

import {
  formatQuoteDate,
  formatQuoteMoney,
  quoteStatusClass,
  quoteStatusLabel,
} from './quote-display.util';

type QuoteStatusTab = 'all' | 1 | 2 | 3 | 4 | 5;
type SortKey = 'quoteNumber' | 'client' | 'total' | 'status' | 'dueDate' | 'createdAt';
type SortDirection = 'asc' | 'desc';

interface QuoteStatusTabOption {
  readonly id: QuoteStatusTab;
  readonly label: string;
}

interface TableColumn {
  readonly key: SortKey;
  readonly label: string;
  readonly sortable: boolean;
}

interface EnrichedQuote extends QuoteSummary {
  clientCompanyName: string;
}

interface RowActionMenu {
  readonly quote: EnrichedQuote;
  readonly top: number;
  readonly left: number;
}

@Component({
  selector: 'app-quote-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppendToBodyDirective],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="flex items-center justify-between gap-4 pb-5">
        <div>
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Quotes</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Build quotes, send to clients, and track acceptance decisions.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          (click)="goToCreateQuote()"
        >
          + Create Quote
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
        <div class="relative min-w-0 max-w-md">
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
            placeholder="Search quotes..."
            formControlName="search"
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
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="7">
                  Loading quotes...
                </td>
              </tr>
            } @else if (displayedQuotes().length === 0) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="7">
                  No quotes matched your search or filter criteria.
                </td>
              </tr>
            } @else {
              @for (quote of displayedQuotes(); track quote.id) {
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
                        </svg>
                      </span>
                      <div class="min-w-0">
                        @if (quote.rfqTitle) {
                          <p class="truncate font-medium text-foreground">{{ quote.rfqTitle }}</p>
                          <p class="mt-0.5 truncate text-xs text-muted-foreground">{{ quote.quoteNumber }}</p>
                        } @else {
                          <p class="truncate font-medium text-foreground">{{ quote.quoteNumber }}</p>
                        }
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4 text-foreground">{{ quote.clientCompanyName }}</td>
                  <td class="px-3 py-4 font-medium tabular-nums text-foreground">
                    {{ formatMoney(quote.total, quote.currency) }}
                  </td>
                  <td class="px-3 py-4">
                    <span [class]="statusClass(quote.status)">
                      {{ statusLabel(quote.status) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">{{ formatDate(quote.dueDate) }}</td>
                  <td class="px-3 py-4 text-muted-foreground">{{ formatDate(quote.createdAt) }}</td>
                  <td class="px-3 py-4">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
                      [attr.aria-label]="'Actions for ' + quote.quoteNumber"
                      [attr.aria-expanded]="rowMenu()?.quote?.id === quote.id"
                      (click)="toggleRowMenu(quote, $event)"
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
            (click)="openQuote(menu.quote)"
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
export class QuoteListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly quoteApi = inject(QuoteApiService);
  private readonly clientApi = inject(ClientApiService);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: '',
  });

  protected readonly activeStatusTab = signal<QuoteStatusTab>('all');
  protected readonly sortKey = signal<SortKey>('createdAt');
  protected readonly sortDirection = signal<SortDirection>('desc');
  protected readonly rowMenu = signal<RowActionMenu | null>(null);
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly quotes = signal<EnrichedQuote[]>([]);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 50] as const;

  private clientNameById = new Map<string, string>();

  protected readonly statusTabs: ReadonlyArray<QuoteStatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 1, label: 'Draft' },
    { id: 2, label: 'Sent' },
    { id: 3, label: 'Accepted' },
    { id: 4, label: 'Rejected' },
    { id: 5, label: 'Expired' },
  ];

  protected readonly tableColumns: ReadonlyArray<TableColumn> = [
    { key: 'quoteNumber', label: 'Quote', sortable: true },
    { key: 'client', label: 'Client', sortable: true },
    { key: 'total', label: 'Total', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'dueDate', label: 'Valid until', sortable: true },
    { key: 'createdAt', label: 'Created', sortable: true },
  ];

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredQuotes().length / this.pageSize())),
  );

  protected readonly visiblePageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected readonly filteredQuotes = computed(() => {
    const search = this.filterForm.controls.search.value.trim().toLowerCase();
    const items = [...this.quotes()];
    const sortKey = this.sortKey();
    const sortDirection = this.sortDirection();

    let filtered = items;
    if (search !== '') {
      filtered = items.filter(
        (quote) =>
          quote.quoteNumber.toLowerCase().includes(search) ||
          quote.clientCompanyName.toLowerCase().includes(search) ||
          (quote.rfqTitle?.toLowerCase().includes(search) ?? false),
      );
    }

    filtered.sort((left, right) => compareQuotes(left, right, sortKey, sortDirection));
    return filtered;
  });

  protected readonly displayedQuotes = computed(() => {
    const start = (this.page() - 1) * this.pageSize();
    return this.filteredQuotes().slice(start, start + this.pageSize());
  });

  protected readonly resultsSummary = computed(() => {
    const total = this.filteredQuotes().length;
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `Showing ${start}-${end} of ${total} results`;
  });

  async ngOnInit(): Promise<void> {
    await this.loadClientNames();
    await this.loadQuotes();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(250), distinctUntilChanged())
      .subscribe(() => {
        this.page.set(1);
      });
  }

  protected setStatusTab(tab: QuoteStatusTab): void {
    this.activeStatusTab.set(tab);
    this.page.set(1);
    void this.loadQuotes();
  }

  protected canGoPrevious(): boolean {
    return this.page() > 1;
  }

  protected canGoNext(): boolean {
    return this.page() < this.totalPages() && this.filteredQuotes().length > 0;
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

  protected toggleRowMenu(quote: EnrichedQuote, event: MouseEvent): void {
    event.stopPropagation();

    if (this.rowMenu()?.quote?.id === quote.id) {
      this.rowMenu.set(null);
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 168;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    this.rowMenu.set({
      quote,
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

  protected goToCreateQuote(): void {
    void this.router.navigate(['/finance/quotes/create']);
  }

  protected openQuote(quote: EnrichedQuote): void {
    this.rowMenu.set(null);
    void this.router.navigate(
      ['/finance/quotes', quote.id],
      quote.clientId ? { queryParams: { clientId: quote.clientId } } : undefined,
    );
  }

  protected statusLabel(status: number): string {
    return quoteStatusLabel(status);
  }

  protected statusClass(status: number): string {
    return quoteStatusClass(status);
  }

  protected formatDate(value: string): string {
    return formatQuoteDate(value);
  }

  protected formatMoney(total: number, currency: string): string {
    return formatQuoteMoney(total, currency);
  }

  private async loadClientNames(): Promise<void> {
    try {
      const result = await firstValueFrom(this.clientApi.getClients({ page: 1, pageSize: 200 }));
      this.clientNameById = new Map(
        result.items.map((client) => [client.id, client.companyName]),
      );
    } catch {
      this.clientNameById = new Map();
    }
  }

  private async loadQuotes(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const statusTab = this.activeStatusTab();
      const status = statusTab === 'all' ? undefined : statusTab;
      const result = await firstValueFrom(this.quoteApi.getQuotes(undefined, status, 1, 100));

      this.quotes.set(
        result.items.map((quote) => ({
          ...quote,
          clientCompanyName:
            quote.recipientCompanyName?.trim()
            ?? (quote.clientId ? this.clientNameById.get(quote.clientId) : undefined)
            ?? 'Unknown client',
        })),
      );
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load quotes.'));
      this.quotes.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}

function compareQuotes(
  left: EnrichedQuote,
  right: EnrichedQuote,
  key: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  switch (key) {
    case 'quoteNumber':
      return multiplier * left.quoteNumber.localeCompare(right.quoteNumber);
    case 'client':
      return multiplier * left.clientCompanyName.localeCompare(right.clientCompanyName);
    case 'total':
      return multiplier * (left.total - right.total);
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
