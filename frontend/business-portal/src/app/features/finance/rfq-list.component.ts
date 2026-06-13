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
import { RfqApiService, RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';

import { rfqStatusLabel } from './rfq-display.util';
import { RfqListItemComponent } from './rfq-list-item.component';
import { SearchableClientFilterComponent } from './searchable-client-filter.component';

type RfqStatusTab = 'all' | 1 | 2 | 3 | 4 | 5 | 6;

interface RfqStatusTabOption {
  readonly id: RfqStatusTab;
  readonly label: string;
}

@Component({
  selector: 'app-rfq-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RfqListItemComponent,
    SearchableClientFilterComponent,
  ],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="pb-5">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Client RFQs</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Review requests for quotation submitted by clients and create priced responses.
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
              placeholder="Search RFQs..."
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
        <p class="text-sm text-muted-foreground">Loading RFQs...</p>
      } @else if (filteredRfqs().length === 0) {
        <p class="text-sm text-muted-foreground">
          @if (hasActiveFilters()) {
            No RFQs match your filters.
          } @else if (activeStatusTab() === 2) {
            No pending RFQs yet. They appear here after a client submits a request from the client portal.
          } @else {
            No RFQs found for this status.
          }
        </p>
      } @else {
        <ul class="space-y-3">
          @for (rfq of filteredRfqs(); track rfq.id) {
            <li>
              <app-rfq-list-item [rfq]="rfq" />
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RfqListComponent implements OnInit {
  private readonly rfqApi = inject(RfqApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly clients = signal<ClientSummary[]>([]);
  protected readonly rfqs = signal<RfqSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeStatusTab = signal<RfqStatusTab>('all');

  protected readonly searchQuery = signal('');

  protected readonly filterForm = this.fb.group({
    search: [''],
    clientId: this.fb.control<string | null>(null),
  });

  protected readonly filteredRfqs = computed(() => {
    const search = this.searchQuery().trim().toLowerCase();
    const items = this.rfqs();

    if (search === '') {
      return items;
    }

    return items.filter(
      (rfq) =>
        rfq.rfqNumber.toLowerCase().includes(search) ||
        rfq.title.toLowerCase().includes(search) ||
        rfq.clientCompanyName.toLowerCase().includes(search),
    );
  });

  protected readonly statusTabs: ReadonlyArray<RfqStatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 2, label: rfqStatusLabel(2) },
    { id: 3, label: rfqStatusLabel(3) },
    { id: 4, label: rfqStatusLabel(4) },
    { id: 5, label: rfqStatusLabel(5) },
    { id: 6, label: rfqStatusLabel(6) },
    { id: 1, label: rfqStatusLabel(1) },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadClients();
    await this.loadRfqs();

    this.filterForm.controls.search.valueChanges
      .pipe(debounceTime(200), distinctUntilChanged())
      .subscribe((value) => this.searchQuery.set(value ?? ''));

    this.filterForm.controls.clientId.valueChanges.subscribe(() => {
      void this.loadRfqs();
    });
  }

  protected setStatusTab(tab: RfqStatusTab): void {
    this.activeStatusTab.set(tab);
    void this.loadRfqs();
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

  private async loadRfqs(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const statusTab = this.activeStatusTab();
      const status = statusTab === 'all' ? undefined : statusTab;
      const clientId = this.filterForm.controls.clientId.value ?? undefined;

      const result = await firstValueFrom(
        this.rfqApi.getRfqs(clientId ?? undefined, status, 1, 100),
      );
      this.rfqs.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load RFQs.'));
      this.rfqs.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
