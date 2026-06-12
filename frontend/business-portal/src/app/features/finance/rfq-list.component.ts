import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RfqApiService, RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
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

@Component({
  selector: 'app-rfq-list',
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
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Client RFQs</ui-card-title>
            <ui-card-description>
              Review incoming requests for quotation and create priced responses.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (errorMessage()) {
              <p class="mb-3 text-sm text-destructive">{{ errorMessage() }}</p>
            }
            @if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading RFQs...</p>
            } @else if (rfqs().length === 0) {
              <p class="text-sm text-muted-foreground">No RFQs found.</p>
            } @else {
              <div class="space-y-2">
                @for (rfq of rfqs(); track rfq.id) {
                  <a
                    class="flex items-center justify-between rounded-lg border p-3 hover:bg-muted"
                    [routerLink]="['/finance/rfqs', rfq.id]"
                    [queryParams]="{ clientId: rfq.clientId }"
                  >
                    <div>
                      <p class="font-medium">{{ rfq.rfqNumber }}</p>
                      <p class="text-xs text-muted-foreground">{{ statusLabel(rfq.status) }}</p>
                    </div>
                    <span class="text-xs text-muted-foreground">{{ rfq.currency }}</span>
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

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.rfqApi.getRfqs(undefined, 2));
      this.rfqs.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load RFQs.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected statusLabel(status: number): string {
    return RFQ_STATUS[status] ?? 'Unknown';
  }
}
