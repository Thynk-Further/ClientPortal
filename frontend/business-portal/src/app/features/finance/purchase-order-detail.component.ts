import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PurchaseOrderApiService,
  PurchaseOrderDetail,
} from '@/app/core/api/services/purchase-order-api.service';
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
  selector: 'app-purchase-order-detail',
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
        <a routerLink="/finance/purchase-orders" class="text-sm text-primary hover:underline">
          ← Back to purchase orders
        </a>

        @if (purchaseOrder(); as po) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>{{ po.poNumber }}</ui-card-title>
              <ui-card-description>Total {{ po.total }} {{ po.currency }}</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (po.generatedInvoiceId) {
                <a
                  class="text-sm text-primary hover:underline"
                  [routerLink]="['/finance', po.generatedInvoiceId]"
                >
                  View generated invoice
                </a>
              } @else if (po.status === 1) {
                <form [formGroup]="approveForm" class="space-y-3" (ngSubmit)="approve()">
                  <ui-input formControlName="invoiceNumber" placeholder="Invoice number" />
                  <ui-input formControlName="dueDate" type="date" />
                  <div class="flex gap-2">
                    <ui-button type="submit" [disabled]="isSaving()">Approve & generate invoice</ui-button>
                    <ui-button type="button" variant="outline" [disabled]="isSaving()" (click)="reject()">
                      Reject
                    </ui-button>
                  </div>
                </form>
              }
            </ui-card-content>
          </ui-card>
        }
      </section>
    </main>
  `,
})
export class PurchaseOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly poApi = inject(PurchaseOrderApiService);
  private readonly toast = inject(ToastNotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly purchaseOrder = signal<PurchaseOrderDetail | null>(null);
  protected readonly isSaving = signal(false);

  protected readonly approveForm = this.fb.group({
    invoiceNumber: ['', Validators.required],
    dueDate: ['', Validators.required],
  });

  private poId = '';
  private clientId = '';

  async ngOnInit(): Promise<void> {
    this.poId = this.route.snapshot.paramMap.get('poId') ?? '';
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';
    if (!this.poId || !this.clientId) {
      return;
    }

    const detail = await firstValueFrom(this.poApi.getPurchaseOrderById(this.poId, this.clientId));
    this.purchaseOrder.set(detail);
  }

  protected async approve(): Promise<void> {
    if (this.approveForm.invalid) {
      return;
    }

    this.isSaving.set(true);
    try {
      await firstValueFrom(
        this.poApi.approvePurchaseOrder(this.poId, {
          clientId: this.clientId,
          invoiceNumber: this.approveForm.value.invoiceNumber ?? '',
          dueDate: this.approveForm.value.dueDate ?? '',
        }),
      );
      this.toast.success('Purchase order approved. Draft invoice created.');
      const detail = await firstValueFrom(this.poApi.getPurchaseOrderById(this.poId, this.clientId));
      this.purchaseOrder.set(detail);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to approve purchase order.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  protected async reject(): Promise<void> {
    this.isSaving.set(true);
    try {
      await firstValueFrom(this.poApi.rejectPurchaseOrder(this.poId, this.clientId));
      this.toast.success('Purchase order rejected.');
      const detail = await firstValueFrom(this.poApi.getPurchaseOrderById(this.poId, this.clientId));
      this.purchaseOrder.set(detail);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to reject purchase order.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
