import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PurchaseOrderApiService,
  PurchaseOrderSummary,
} from '@/app/core/api/services/purchase-order-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

const PO_STATUS: Record<number, string> = {
  1: 'Pending approval',
  2: 'Approved',
  3: 'Invoiced',
  4: 'Rejected',
  5: 'Cancelled',
};

@Component({
  selector: 'app-purchase-order-list',
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
            <ui-card-title>Purchase orders</ui-card-title>
            <ui-card-description>Approve client-accepted quotations to generate draft invoices.</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (errorMessage()) {
              <p class="text-sm text-destructive">{{ errorMessage() }}</p>
            } @else if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading purchase orders...</p>
            } @else {
              <div class="space-y-2">
                @for (po of purchaseOrders(); track po.id) {
                  <a
                    class="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                    [routerLink]="['/finance/purchase-orders', po.id]"
                    [queryParams]="{ clientId: po.clientId }"
                  >
                    <div>
                      <p class="font-medium">{{ po.poNumber }}</p>
                      <p class="text-xs text-muted-foreground">{{ statusLabel(po.status) }}</p>
                    </div>
                    <span class="text-sm font-medium">{{ po.total }} {{ po.currency }}</span>
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
export class PurchaseOrderListComponent implements OnInit {
  private readonly poApi = inject(PurchaseOrderApiService);

  protected readonly purchaseOrders = signal<PurchaseOrderSummary[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.poApi.getPurchaseOrders(undefined, 1));
      this.purchaseOrders.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load purchase orders.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected statusLabel(status: number): string {
    return PO_STATUS[status] ?? 'Unknown';
  }
}
