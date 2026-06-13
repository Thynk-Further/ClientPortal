import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RfqApiService, RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

const RFQ_STATUS: Record<number, string> = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Quoted',
  4: 'Accepted',
  5: 'Rejected',
  6: 'Cancelled',
};

type RfqListFilter = 'submitted' | 'open' | 'all';

@Component({
  selector: 'app-rfq-list',
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
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Client RFQs</ui-card-title>
            <ui-card-description>
              Review requests for quotation submitted by clients and create priced responses.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="mb-4 inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
              @for (tab of filterTabs; track tab.id) {
                <button
                  type="button"
                  class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                  [class.bg-background]="activeFilter() === tab.id"
                  [class.text-foreground]="activeFilter() === tab.id"
                  [class.shadow-sm]="activeFilter() === tab.id"
                  [class.text-muted-foreground]="activeFilter() !== tab.id"
                  (click)="setFilter(tab.id)"
                >
                  {{ tab.label }}
                </button>
              }
            </div>

            @if (errorMessage()) {
              <p class="mb-3 text-sm text-destructive">{{ errorMessage() }}</p>
            }
            @if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading RFQs...</p>
            } @else if (rfqs().length === 0) {
              <p class="text-sm text-muted-foreground">
                @if (activeFilter() === 'submitted') {
                  No submitted RFQs yet. They appear here after a client submits a request from the client portal.
                } @else {
                  No RFQs match this filter.
                }
              </p>
            } @else {
              <div class="space-y-2">
                @for (rfq of rfqs(); track rfq.id) {
                  <a
                    class="flex items-center justify-between gap-4 rounded-lg border p-3 hover:bg-muted"
                    [routerLink]="['/finance/rfqs', rfq.id]"
                    [queryParams]="{ clientId: rfq.clientId }"
                  >
                    <div class="min-w-0">
                      <p class="font-medium">{{ rfq.rfqNumber }}</p>
                      <p class="truncate text-xs text-muted-foreground">
                        {{ rfq.clientCompanyName || 'Client' }} · {{ statusLabel(rfq.status) }}
                      </p>
                    </div>
                    <div class="shrink-0 text-right text-xs text-muted-foreground">
                      <p>{{ rfq.currency }}</p>
                      <p>{{ formatDate(rfq.updatedAt) }}</p>
                    </div>
                  </a>
                }
              </div>
            }
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class RfqListComponent implements OnInit {
  private readonly rfqApi = inject(RfqApiService);

  protected readonly rfqs = signal<RfqSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeFilter = signal<RfqListFilter>('submitted');

  protected readonly filterTabs: ReadonlyArray<{ id: RfqListFilter; label: string }> = [
    { id: 'submitted', label: 'Awaiting quote' },
    { id: 'open', label: 'In progress' },
    { id: 'all', label: 'All' },
  ];

  async ngOnInit(): Promise<void> {
    await this.loadRfqs();
  }

  protected async setFilter(filter: RfqListFilter): Promise<void> {
    this.activeFilter.set(filter);
    await this.loadRfqs();
  }

  protected statusLabel(status: number): string {
    return RFQ_STATUS[status] ?? 'Unknown';
  }

  protected formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  private async loadRfqs(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const filter = this.activeFilter();
      if (filter === 'open') {
        const [submitted, quoted] = await Promise.all([
          firstValueFrom(this.rfqApi.getRfqs(undefined, 2)),
          firstValueFrom(this.rfqApi.getRfqs(undefined, 3)),
        ]);
        const merged = [...submitted.items, ...quoted.items].sort(
          (left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt),
        );
        this.rfqs.set(merged);
        return;
      }

      const status = filter === 'submitted' ? 2 : undefined;
      const result = await firstValueFrom(this.rfqApi.getRfqs(undefined, status));
      this.rfqs.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load RFQs.'));
      this.rfqs.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }
}
