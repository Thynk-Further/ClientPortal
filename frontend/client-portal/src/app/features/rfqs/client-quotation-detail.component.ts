import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalQuotationDetail,
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
  selector: 'app-client-quotation-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, ButtonComponent, CardComponent, CardHeaderComponent, CardTitleComponent, CardContentComponent],
  template: `
    <div class="space-y-4">
      <a routerLink="/rfqs" class="text-sm text-primary hover:underline">← Back to RFQs</a>
      @if (quotation(); as quote) {
        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ quote.quoteNumber }}</ui-card-title>
          </ui-card-header>
          <ui-card-content class="space-y-3 text-sm">
            <p>Total: {{ quote.total }} {{ quote.currency }}</p>
            @if (quote.status === 2) {
              <div class="flex gap-2">
                <ui-button type="button" [disabled]="isSaving()" (click)="approve()">Approve</ui-button>
                <ui-button type="button" variant="outline" [disabled]="isSaving()" (click)="reject()">
                  Decline
                </ui-button>
              </div>
            }
          </ui-card-content>
        </ui-card>
      }
    </div>
  `,
})
export class ClientQuotationDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly api = inject(ClientPortalApiService);

  protected readonly quotation = signal<ClientPortalQuotationDetail | null>(null);
  protected readonly isSaving = signal(false);

  private quotationId = '';

  async ngOnInit(): Promise<void> {
    this.quotationId = this.route.snapshot.paramMap.get('quotationId') ?? '';
    if (!this.quotationId) {
      return;
    }

    const detail = await firstValueFrom(this.api.getQuotation(this.quotationId));
    this.quotation.set(detail);
  }

  protected async approve(): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.approveQuotation(this.quotationId));
      const detail = await firstValueFrom(this.api.getQuotation(this.quotationId));
      this.quotation.set(detail);
    } catch (error) {
      console.error(readHttpErrorMessage(error, 'Failed to approve quotation.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async reject(): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.api.rejectQuotation(this.quotationId));
      const detail = await firstValueFrom(this.api.getQuotation(this.quotationId));
      this.quotation.set(detail);
    } catch (error) {
      console.error(readHttpErrorMessage(error, 'Failed to decline quotation.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
