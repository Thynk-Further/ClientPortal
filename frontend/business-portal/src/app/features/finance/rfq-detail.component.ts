import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RfqApiService, RfqDetail, RfqLineItem } from '@/app/core/api/services/rfq-api.service';
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
import { DatePickerComponent } from '@/components/ui/date-picker.component';
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
    DatePickerComponent,
    InputComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <a routerLink="/finance/rfqs" class="text-sm text-primary hover:underline">← Back to RFQs</a>

        @if (loadError()) {
          <p class="text-sm text-destructive">{{ loadError() }}</p>
        } @else if (rfq(); as detail) {
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
                  <ui-date-picker formControlName="dueDate" />
                  @for (item of lineItems.controls; track $index) {
                    <div class="grid grid-cols-2 gap-2">
                      <ui-input type="number" [formControl]="item.controls.unitPrice" placeholder="Unit price" />
                      <ui-input type="number" [formControl]="item.controls.taxRate" placeholder="Tax rate (0-1)" />
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
  protected readonly loadError = signal<string | null>(null);
  protected readonly isSaving = signal(false);

  protected readonly quoteForm = this.fb.nonNullable.group({
    quoteNumber: ['', Validators.required],
    dueDate: ['', Validators.required],
    lineItems: this.fb.array<ReturnType<RfqDetailComponent['createLineItemGroup']>>([]),
  });

  protected readonly lineItems = this.quoteForm.controls.lineItems;

  private rfqId = '';
  private clientId = '';

  async ngOnInit(): Promise<void> {
    this.rfqId = this.route.snapshot.paramMap.get('rfqId') ?? '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';
    if (!this.rfqId || !this.clientId) {
      this.loadError.set('RFQ details could not be loaded. Open the RFQ from the Client RFQs list.');
      return;
    }

    try {
      const detail = await firstValueFrom(this.rfqApi.getRfqById(this.rfqId, this.clientId));
      this.rfq.set(detail);
      this.resetLineItems(detail.lineItems);
    } catch (error) {
      this.loadError.set(readHttpErrorMessage(error, 'Failed to load RFQ.'));
    }
  }

  protected async createQuotation(): Promise<void> {
    const detail = this.rfq();
    if (!detail || this.quoteForm.invalid) {
      this.quoteForm.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const formValue = this.quoteForm.getRawValue();
      await firstValueFrom(
        this.rfqApi.createQuotationFromRfq(this.rfqId, {
          clientId: this.clientId,
          quoteNumber: formValue.quoteNumber,
          dueDate: formValue.dueDate,
          lineItems: detail.lineItems.map((item, index) => {
            const priced = formValue.lineItems[index];
            return {
              description: item.description,
              quantity: item.quantity,
              unitPrice: Number(priced?.unitPrice ?? 0),
              taxRate: Number(priced?.taxRate ?? 0),
            };
          }),
        }),
      );
      this.toast.success('Quotation created. Send it from the Quotes workflow.');
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to create quotation.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private resetLineItems(items: RfqLineItem[]): void {
    this.lineItems.clear();
    for (const item of items) {
      this.lineItems.push(this.createLineItemGroup(item));
    }
  }

  private createLineItemGroup(item: RfqLineItem) {
    return this.fb.nonNullable.group({
      description: [item.description],
      quantity: [item.quantity],
      unitPrice: [0, Validators.required],
      taxRate: [0],
    });
  }
}
