import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RfqApiService, RfqDetail } from '@/app/core/api/services/rfq-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';

@Component({
  selector: 'app-rfq-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <a routerLink="/finance/rfqs" class="text-sm text-primary hover:underline">← Back to RFQs</a>

        @if (rfq(); as detail) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>{{ detail.rfqNumber }}</ui-card-title>
              <ui-card-description>Client RFQ line items</ui-card-description>
            </ui-card-header>
            <ui-card-content class="space-y-2 text-sm">
              @for (item of detail.lineItems; track item.description) {
                <div class="flex justify-between border-b py-2">
                  <span>{{ item.description }}</span>
                  <span class="text-muted-foreground">Qty {{ item.quantity }}</span>
                </div>
              }
            </ui-card-content>
          </ui-card>

          @if (detail.status === 2) {
            <ui-card>
              <ui-card-header>
                <ui-card-title>Create quotation</ui-card-title>
                <ui-card-description>Price each line item and send quotation to client.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                <form [formGroup]="quoteForm" class="space-y-3" (ngSubmit)="createQuotation()">
                  <ui-input formControlName="quoteNumber" placeholder="Quote number" />
                  <ui-input formControlName="dueDate" type="date" />
                  @for (ctrl of lineItemControls; track $index) {
                    <div class="grid grid-cols-2 gap-2">
                      <ui-input [formControl]="ctrl.controls.unitPrice" type="number" placeholder="Unit price" />
                      <ui-input [formControl]="ctrl.controls.taxRate" type="number" placeholder="Tax rate (0-1)" />
                    </div>
                  }
                  <ui-button type="submit" [disabled]="isSaving()">Create quotation</ui-button>
                </form>
              </ui-card-content>
            </ui-card>
          }
        }
      </section>
    </main>
  `,
})
export class RfqDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly rfqApi = inject(RfqApiService);
  private readonly toast = inject(ToastNotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly rfq = signal<RfqDetail | null>(null);
  protected readonly isSaving = signal(false);
  protected lineItemControls: Array<ReturnType<FormBuilder['group']>> = [];

  protected readonly quoteForm = this.fb.group({
    quoteNumber: ['', Validators.required],
    dueDate: ['', Validators.required],
    lineItems: this.fb.array([]),
  });

  private rfqId = '';
  private clientId = '';

  async ngOnInit(): Promise<void> {
    this.rfqId = this.route.snapshot.paramMap.get('rfqId') ?? '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';
    if (!this.rfqId || !this.clientId) {
      return;
    }

    const detail = await firstValueFrom(this.rfqApi.getRfqById(this.rfqId, this.clientId));
    this.rfq.set(detail);
    this.lineItemControls = detail.lineItems.map((item) =>
      this.fb.group({
        description: [item.description],
        quantity: [item.quantity],
        unitPrice: [0, Validators.required],
        taxRate: [0],
      }),
    );
  }

  protected async createQuotation(): Promise<void> {
    const detail = this.rfq();
    if (!detail || this.quoteForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.rfqApi.createQuotationFromRfq(this.rfqId, {
          clientId: this.clientId,
          quoteNumber: this.quoteForm.value.quoteNumber ?? '',
          dueDate: this.quoteForm.value.dueDate ?? '',
          lineItems: this.lineItemControls.map((ctrl) => ({
            description: ctrl.value.description ?? '',
            quantity: Number(ctrl.value.quantity ?? 0),
            unitPrice: Number(ctrl.value.unitPrice ?? 0),
            taxRate: Number(ctrl.value.taxRate ?? 0),
          })),
        }),
      );
      this.toast.success('Quotation created. Send it from the Quotes workflow.');
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to create quotation.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
