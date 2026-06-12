import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalRfqDetail,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

@Component({
  selector: 'app-client-rfq-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/rfqs" class="text-sm text-primary hover:underline">← Back</a>
      @if (rfq(); as detail) {
        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ detail.rfqNumber }}</ui-card-title>
          </ui-card-header>
          <ui-card-content class="space-y-2 text-sm">
            @for (item of detail.lineItems; track item.description) {
              <div class="flex justify-between border-b py-2">
                <span>{{ item.description }}</span>
                <span>Qty {{ item.quantity }}</span>
              </div>
            }
            @if (detail.status === 1) {
              <ui-button type="button" [disabled]="isSubmitting()" (click)="submit()">
                Submit RFQ
              </ui-button>
            }
            @if (detail.quotationId) {
              <a
                class="text-primary hover:underline"
                [routerLink]="['/rfqs/quotations', detail.quotationId]"
              >
                View quotation
              </a>
            }
          </ui-card-content>
        </ui-card>
      }
    </div>
  `,
})
export class ClientRfqDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClientPortalApiService);

  protected readonly rfq = signal<ClientPortalRfqDetail | null>(null);
  protected readonly isSubmitting = signal(false);

  private rfqId = '';

  async ngOnInit(): Promise<void> {
    this.rfqId = this.route.snapshot.paramMap.get('rfqId') ?? '';
    if (!this.rfqId) {
      return;
    }

    const detail = await firstValueFrom(this.api.getRfq(this.rfqId));
    this.rfq.set(detail);
  }

  protected async submit(): Promise<void> {
    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.api.submitRfq(this.rfqId));
      const detail = await firstValueFrom(this.api.getRfq(this.rfqId));
      this.rfq.set(detail);
    } catch (error) {
      console.error(readHttpErrorMessage(error, 'Failed to submit RFQ.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}
