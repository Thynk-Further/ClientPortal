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
import { DatePickerComponent } from '@/components/ui/date-picker.component';
import { InputComponent } from '@/components/ui/input.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  formatPurchaseOrderDate,
  purchaseOrderStatusAccentClass,
  purchaseOrderStatusLabel,
} from './purchase-order-display.util';
import { formatQuoteMoney } from './quote-display.util';

@Component({
  selector: 'app-purchase-order-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    DatePickerComponent,
    InputComponent,
    StatusBadgeComponent,
  ],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <a
        routerLink="/finance/purchase-orders"
        class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Back to purchase orders
      </a>

      @if (loadError()) {
        <p class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ loadError() }}
        </p>
      } @else if (isLoading()) {
        <p class="mt-8 text-center text-sm text-muted-foreground">Loading purchase order...</p>
      } @else if (purchaseOrder(); as po) {
        <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ displayTitle(po) }}
            </h1>
            <p class="mt-1 font-mono text-sm text-muted-foreground">{{ po.poNumber }}</p>
            <p class="mt-1 text-sm text-muted-foreground">{{ pageSubtitle(po) }}</p>
          </div>
          <ui-status-badge [status]="statusLabel(po.status)" />
        </header>

        <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,340px)_1fr]">
          <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section
              class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10"
            >
              <div class="flex">
                <div
                  class="w-1 shrink-0 self-stretch"
                  [class]="statusAccentClass(po.status)"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0 flex-1 p-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Order summary
                  </h2>

                  <dl class="mt-3 space-y-3 text-sm">
                    @if (po.clientCompanyName) {
                      <div>
                        <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          Client
                        </dt>
                        <dd class="mt-0.5 font-medium text-foreground">{{ po.clientCompanyName }}</dd>
                      </div>
                    }
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        PO reference
                      </dt>
                      <dd class="mt-0.5 font-mono text-foreground">{{ po.poNumber }}</dd>
                    </div>
                    @if (po.rfqNumber) {
                      <div>
                        <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                          RFQ no.
                        </dt>
                        <dd class="mt-0.5 font-mono text-foreground">{{ po.rfqNumber }}</dd>
                      </div>
                    }
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Currency
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ po.currency }}</dd>
                    </div>
                    <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Created
                      </dt>
                      <dd class="mt-1 font-medium text-foreground">{{ formatDate(po.createdAt) }}</dd>
                      @if (po.approvedAt) {
                        <dd class="mt-0.5 text-xs text-muted-foreground">
                          Approved {{ formatDate(po.approvedAt) }}
                        </dd>
                      }
                    </div>
                    <div class="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Order total
                      </dt>
                      <dd class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {{ formatMoney(po.total, po.currency) }}
                      </dd>
                    </div>
                    <div class="space-y-2 border-t border-border/50 pt-3">
                      @if (po.rfqId) {
                        <a
                          class="block text-sm font-medium text-primary hover:underline"
                          [routerLink]="['/finance/rfqs', po.rfqId]"
                          [queryParams]="{ clientId: po.clientId }"
                        >
                          View source RFQ
                        </a>
                      }
                      @if (po.quotationId) {
                        <a
                          class="block text-sm font-medium text-primary hover:underline"
                          [routerLink]="['/finance/quotes', po.quotationId]"
                          [queryParams]="{ clientId: po.clientId }"
                        >
                          View accepted quotation
                        </a>
                      }
                      @if (po.generatedInvoiceId) {
                        <a
                          class="block text-sm font-medium text-primary hover:underline"
                          [routerLink]="['/finance', po.generatedInvoiceId]"
                          [queryParams]="{ clientId: po.clientId }"
                        >
                          View generated invoice
                        </a>
                      }
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Ordered items
              </h2>
              <ul class="mt-3 divide-y divide-border/60">
                @for (item of po.lineItems; track item.description) {
                  <li class="flex items-start justify-between gap-3 py-2.5 text-sm first:pt-0 last:pb-0">
                    <span class="font-medium text-foreground">{{ item.description }}</span>
                    <span class="shrink-0 tabular-nums text-muted-foreground">× {{ item.quantity }}</span>
                  </li>
                }
              </ul>
              @if (po.notes) {
                <p class="mt-3 rounded-lg bg-muted/30 p-3 text-xs text-muted-foreground">{{ po.notes }}</p>
              }
            </section>
          </aside>

          <div class="min-w-0">
            <section
              class="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm dark:border-white/10 dark:bg-card"
            >
              <div class="border-b border-border/70 bg-muted/20 px-6 py-4">
                <h2 class="text-sm font-semibold text-foreground">
                  @if (po.status === 1) {
                    Invoice generation
                  } @else if (po.generatedInvoiceId) {
                    Invoice created
                  } @else {
                    Order details
                  }
                </h2>
                <p class="mt-1 text-sm text-muted-foreground">
                  @if (po.status === 1) {
                    Review the accepted order and create a draft invoice for the client.
                  } @else if (po.status === 2) {
                    This purchase order has been approved. Invoice generation is in progress.
                  } @else if (po.status === 3) {
                    A draft invoice was generated from this purchase order.
                  } @else if (po.status === 4) {
                    This purchase order was rejected and will not be invoiced.
                  } @else {
                    This purchase order is no longer active.
                  }
                </p>
              </div>

              <div class="space-y-6 p-6">
                <div class="overflow-x-auto rounded-lg border border-border/70">
                  <table class="w-full min-w-[640px] border-collapse text-sm">
                    <thead>
                      <tr class="border-b border-border/70 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th class="px-3 py-2.5 font-semibold">Item</th>
                        <th class="px-3 py-2.5 font-semibold">Description</th>
                        <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                        <th class="px-3 py-2.5 font-semibold text-right">
                          Unit price {{ po.currency }}
                        </th>
                        <th class="px-3 py-2.5 font-semibold text-right">
                          Amount {{ po.currency }}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (item of po.lineItems; track item.description; let index = $index) {
                        <tr class="border-b border-border/50 last:border-b-0">
                          <td class="px-3 py-3 text-muted-foreground">{{ index + 1 }}</td>
                          <td class="px-3 py-3 font-medium text-foreground">{{ item.description }}</td>
                          <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">
                            {{ item.quantity }}
                          </td>
                          <td class="px-3 py-3 text-right tabular-nums">
                            {{ formatMoney(item.unitPrice, po.currency) }}
                          </td>
                          <td class="px-3 py-3 text-right font-medium tabular-nums">
                            {{ formatMoney(item.amount, po.currency) }}
                          </td>
                        </tr>
                      }
                    </tbody>
                    <tfoot>
                      <tr class="border-t border-border/70 bg-muted/20">
                        <td colspan="4" class="px-3 py-2.5 text-right text-sm text-muted-foreground">
                          Subtotal
                        </td>
                        <td class="px-3 py-2.5 text-right text-sm tabular-nums font-medium">
                          {{ formatMoney(po.subtotal, po.currency) }}
                        </td>
                      </tr>
                      @if (po.taxAmount > 0) {
                        <tr class="bg-muted/20">
                          <td colspan="4" class="px-3 py-2.5 text-right text-sm text-muted-foreground">
                            Tax
                          </td>
                          <td class="px-3 py-2.5 text-right text-sm tabular-nums font-medium">
                            {{ formatMoney(po.taxAmount, po.currency) }}
                          </td>
                        </tr>
                      }
                      <tr class="bg-muted/30">
                        <td colspan="4" class="px-3 py-3 text-right text-sm font-semibold">Grand total</td>
                        <td class="px-3 py-3 text-right text-base font-bold tabular-nums text-foreground">
                          {{ formatMoney(po.total, po.currency) }}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                @if (po.status === 1) {
                  <form
                    class="rounded-lg border border-blue-200/80 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/5"
                    [formGroup]="approveForm"
                    (ngSubmit)="approve()"
                  >
                    <h3 class="text-sm font-semibold text-foreground">Create draft invoice</h3>
                    <p class="mt-1 text-xs text-muted-foreground">
                      Approving will generate a draft invoice the client can view in the portal.
                    </p>
                    <div class="mt-4 grid gap-4 sm:grid-cols-2">
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-muted-foreground">Invoice number</label>
                        <ui-input formControlName="invoiceNumber" placeholder="e.g. INV-2026-001" />
                      </div>
                      <div class="space-y-1.5">
                        <label class="text-xs font-medium text-muted-foreground">Payment due date</label>
                        <ui-date-picker formControlName="dueDate" />
                      </div>
                    </div>
                    <div class="mt-4 flex flex-wrap gap-2">
                      <ui-button
                        type="submit"
                        label="Approve & generate invoice"
                        [disabled]="isSaving() || approveForm.invalid"
                      />
                      <ui-button
                        type="button"
                        variant="outline"
                        label="Reject order"
                        [disabled]="isSaving()"
                        (clicked)="reject()"
                      />
                    </div>
                  </form>
                } @else if (po.generatedInvoiceId) {
                  <div class="rounded-lg border border-emerald-200/80 bg-emerald-50/50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                    <p class="text-sm font-medium text-foreground">Draft invoice ready</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      Review and send the invoice from the Invoices section when ready.
                    </p>
                    <a
                      class="mt-3 inline-flex text-sm font-medium text-primary hover:underline"
                      [routerLink]="['/finance', po.generatedInvoiceId]"
                      [queryParams]="{ clientId: po.clientId }"
                    >
                      Open invoice →
                    </a>
                  </div>
                } @else if (po.status === 4) {
                  <div class="rounded-lg border border-red-200/80 bg-red-50/50 p-4 dark:border-red-500/20 dark:bg-red-500/5">
                    <p class="text-sm font-medium text-foreground">Purchase order rejected</p>
                    <p class="mt-1 text-sm text-muted-foreground">
                      No invoice will be created for this order.
                    </p>
                  </div>
                }
              </div>
            </section>
          </div>
        </div>
      }
    </div>
  `,
})
export class PurchaseOrderDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly poApi = inject(PurchaseOrderApiService);
  private readonly toast = inject(ToastNotificationService);
  private readonly fb = inject(FormBuilder);

  protected readonly purchaseOrder = signal<PurchaseOrderDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly isSaving = signal(false);

  protected readonly statusLabel = purchaseOrderStatusLabel;
  protected readonly statusAccentClass = purchaseOrderStatusAccentClass;
  protected readonly formatDate = formatPurchaseOrderDate;
  protected readonly formatMoney = formatQuoteMoney;

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
      this.loadError.set('Purchase order could not be loaded. Open it from the Purchase orders list.');
      this.isLoading.set(false);
      return;
    }

    await this.loadPurchaseOrder();
  }

  protected displayTitle(po: PurchaseOrderDetail): string {
    const title = po.rfqTitle?.trim();
    return title === '' || title === undefined ? po.poNumber : title;
  }

  protected pageSubtitle(po: PurchaseOrderDetail): string {
    if (po.status === 1) {
      return 'The client accepted the quotation. Approve to generate a draft invoice.';
    }

    if (po.status === 3) {
      return 'Invoice generated from this accepted purchase order.';
    }

    if (po.status === 4) {
      return 'This purchase order was rejected.';
    }

    return `Purchase order status: ${purchaseOrderStatusLabel(po.status).toLowerCase()}.`;
  }

  protected async approve(): Promise<void> {
    if (this.approveForm.invalid) {
      this.approveForm.markAllAsTouched();
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
      await this.loadPurchaseOrder();
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
      await this.loadPurchaseOrder();
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to reject purchase order.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private async loadPurchaseOrder(): Promise<void> {
    this.isLoading.set(true);
    this.loadError.set(null);

    try {
      const detail = await firstValueFrom(this.poApi.getPurchaseOrderById(this.poId, this.clientId));
      this.purchaseOrder.set(detail);

      if (detail.status === 1) {
        this.approveForm.patchValue({
          invoiceNumber: suggestInvoiceNumber(detail.poNumber),
          dueDate: defaultDueDateIso(),
        });
      }
    } catch (error) {
      this.loadError.set(readHttpErrorMessage(error, 'Failed to load purchase order.'));
      this.purchaseOrder.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}

function suggestInvoiceNumber(poNumber: string): string {
  const normalized = poNumber.trim();
  if (normalized.startsWith('PO-')) {
    return `INV-${normalized.slice(3)}`;
  }

  return `INV-${normalized}`;
}

function defaultDueDateIso(): string {
  const due = new Date();
  due.setDate(due.getDate() + 30);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${due.getFullYear()}-${pad(due.getMonth() + 1)}-${pad(due.getDate())}`;
}
