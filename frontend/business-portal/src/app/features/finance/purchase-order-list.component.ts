import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

import {
  ClientApiService,
  ClientSummary,
} from '@/app/core/api/services/client-api.service';
import {
  PurchaseOrderApiService,
  PurchaseOrderSummary,
} from '@/app/core/api/services/purchase-order-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';

import { purchaseOrderStatusLabel } from './purchase-order-display.util';
import { PurchaseOrderListItemComponent } from './purchase-order-list-item.component';
import { SearchableClientFilterComponent } from './searchable-client-filter.component';

type PurchaseOrderStatusTab = 'all' | 1 | 2 | 3 | 4 | 5;

interface PurchaseOrderStatusTabOption {
  readonly id: PurchaseOrderStatusTab;
  readonly label: string;
}

@Component({
  selector: 'app-purchase-order-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    PurchaseOrderListItemComponent,
    SearchableClientFilterComponent,
  ],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="pb-5">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Purchase orders</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Approve client-accepted quotations to generate draft invoices.
        </p>
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
              placeholder="Search purchase orders..."
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

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading purchase orders...</p>
      } @else if (filteredPurchaseOrders().length === 0) {
        <p class="text-sm text-muted-foreground">
          @if (hasActiveFilters()) {
            No purchase orders match your filters.
          } @else if (activeStatusTab() === 1) {
            No purchase orders pending approval. They appear here after a client accepts a quotation.
          } @else {
            No purchase orders found for this status.
          }
        </p>
      } @else {
        <ul class="space-y-3">
          @for (po of filteredPurchaseOrders(); track po.id) {
            <li>
              <app-purchase-order-list-item [po]="po" />
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class PurchaseOrderListComponent implements OnInit {
  private readonly poApi = inject(PurchaseOrderApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly clients = signal<ClientSummary[]>([]);
  protected readonly purchaseOrders = signal<PurchaseOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeStatusTab = signal<PurchaseOrderStatusTab>('all');
  protected readonly searchQuery = signal('');

  protected readonly filterForm = this.fb.group({
    search: [''],
    clientId: this.fb.control<string | null>(null),
  });

  protected readonly filteredPurchaseOrders = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const items = this.purchaseOrders();

    if (search === '') {
      return items;
    }

    return items.filter(
      (po) =>
        po.poNumber.toLowerCase().includes(search) ||
        (po.rfqTitle?.toLowerCase().includes(search) ?? false) ||
        (po.rfqNumber?.toLowerCase().includes(search) ?? false) ||
        po.clientCompanyName.toLowerCase().includes(search),
    );
  });

  protected readonly statusTabs: ReadonlyArray<PurchaseOrderStatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 1, label: purchaseOrderStatusLabel(1) },
    { id: 2, label: purchaseOrderStatusLabel(2) },
    { id: 3, label: purchaseOrderStatusLabel(3) },
    { id: 4, label: purchaseOrderStatusLabel(4) },
    { id: 5, label: purchaseOrderStatusLabel(5) },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadClients();
    await this.loadPurchaseOrders();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => this.searchQuery.set(value ?? ''));

    this.filterForm.controls.clientId.valueChanges.subscribe(() => {
      void this.loadPurchaseOrders();
    });
  }

  protected setStatusTab(tab: PurchaseOrderStatusTab): void {
    this.activeStatusTab.set(tab);
    void this.loadPurchaseOrders();
  }

  protected hasActiveFilters(): boolean {
    return this.searchQuery().trim() !== '' || this.filterForm.controls.clientId.value !== null;
  }

  private async loadClients(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.clientApi.getClients({ page: 1, pageSize: 200 }),
      );
      this.clients.set(result.items);
    } catch {
      this.clients.set([]);
    }
  }

  private async loadPurchaseOrders(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const statusTab = this.activeStatusTab();
      const status = statusTab === 'all' ? undefined : statusTab;
      const clientId = this.filterForm.controls.clientId.value ?? undefined;

      const result = await firstValueFrom(
        this.poApi.getPurchaseOrders(clientId ?? undefined, status, 1, 100),
      );
      this.purchaseOrders.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load purchase orders.'));
      this.purchaseOrders.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
