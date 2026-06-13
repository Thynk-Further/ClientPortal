import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  PaymentSubmission,
  PurchaseOrderApiService,
} from '@/app/core/api/services/purchase-order-api.service';
import { ClientApiService, ClientDetail } from '@/app/core/api/services/client-api.service';
import { InvoiceApiService, InvoiceDetail } from '@/app/core/api/services/invoice-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { InvoiceStore } from '@/app/core/stores/invoice.store';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ButtonComponent } from '@/components/ui/button.component';
import { DatePickerComponent } from '@/components/ui/date-picker.component';
import { InputComponent } from '@/components/ui/input.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import { InvoiceDocumentComponent } from './invoice-document.component';
import {
  INVOICE_STATUS_DRAFT,
  formatInvoiceDate,
  invoiceStatusAccentClass,
  invoiceStatusLabel,
} from './invoice-display.util';
import { formatQuoteMoney } from './quote-display.util';

const DEFAULT_PAYMENT_METHOD = 'Bank transfer';

@Component({
  selector: 'app-invoice-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    DatePickerComponent,
    StatusBadgeComponent,
    InvoiceDocumentComponent,
  ],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <a
        routerLink="/finance"
        class="inline-flex items-center gap-1 text-sm text-primary hover:underline"
      >
        ← Back to invoices
      </a>

      @if (loadError()) {
        <p class="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ loadError() }}
        </p>
      } @else if (invoiceStore.isLoading() && invoice() === null) {
        <p class="mt-8 text-center text-sm text-muted-foreground">Loading invoice...</p>
      } @else if (invoice(); as inv) {
        <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
          <div class="min-w-0">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ inv.invoiceNumber }}
            </h1>
            <p class="mt-1 text-sm text-muted-foreground">{{ pageSubtitle(inv) }}</p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <ui-status-badge [status]="statusLabel(inv.status)" />
            <ui-button
              type="button"
              variant="outline"
              label="Download PDF"
              [disabled]="isDownloadingPdf()"
              (clicked)="downloadPdf(inv)"
            />
            @if (isDraft(inv)) {
              <ui-button
                type="button"
                label="Send to client"
                [disabled]="invoiceStore.isLoading()"
                (clicked)="onSendInvoice(inv)"
              />
            }
          </div>
        </header>

        <div class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,340px)_1fr]">
          <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section
              class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm dark:border-white/10"
            >
              <div class="flex">
                <div
                  class="w-1 shrink-0 self-stretch"
                  [class]="statusAccentClass(inv.status)"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0 flex-1 p-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Invoice summary
                  </h2>

                  <dl class="mt-3 space-y-3 text-sm">
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Client
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ clientLabel() }}</dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Invoice number
                      </dt>
                      <dd class="mt-0.5 font-mono text-foreground">{{ inv.invoiceNumber }}</dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Currency
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ inv.currency }}</dd>
                    </div>
                    <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Dates
                      </dt>
                      <dd class="mt-1 font-medium text-foreground">
                        Issued {{ formatDate(inv.createdAt) }}
                      </dd>
                      <dd class="mt-0.5 text-xs text-muted-foreground">
                        Due {{ formatDate(inv.dueDate) }}
                      </dd>
                      @if (inv.paidAt) {
                        <dd class="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                          Paid {{ formatDate(inv.paidAt) }}
                        </dd>
                      }
                    </div>
                    <div class="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Invoice total
                      </dt>
                      <dd class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                        {{ formatMoney(inv.total, inv.currency) }}
                      </dd>
                      @if (inv.amountPaid > 0) {
                        <dd class="mt-0.5 text-xs text-muted-foreground">
                          Paid {{ formatMoney(inv.amountPaid, inv.currency) }}
                        </dd>
                        <dd class="mt-0.5 text-xs font-medium text-foreground">
                          Outstanding {{ formatMoney(outstandingAmount(inv), inv.currency) }}
                        </dd>
                      }
                    </div>
                    <div class="space-y-2 border-t border-border/50 pt-3">
                      @if (inv.quotationId) {
                        <a
                          class="block text-sm font-medium text-primary hover:underline"
                          [routerLink]="['/finance/quotes', inv.quotationId]"
                          [queryParams]="{ clientId: inv.clientId }"
                        >
                          View source quotation
                        </a>
                      }
                      @if (inv.purchaseOrderId) {
                        <a
                          class="block text-sm font-medium text-primary hover:underline"
                          [routerLink]="['/finance/purchase-orders', inv.purchaseOrderId]"
                          [queryParams]="{ clientId: inv.clientId }"
                        >
                          View purchase order
                        </a>
                      }
                      <a
                        class="block text-sm font-medium text-primary hover:underline"
                        [routerLink]="['/clients', inv.clientId]"
                      >
                        View client profile
                      </a>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            @if (canRecordPayment(inv)) {
              <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
                <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Record payment
                </h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Capture a payment received against this invoice.
                </p>
                <form [formGroup]="paymentForm" class="mt-4 space-y-3" (ngSubmit)="onRecordPayment(inv)">
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-muted-foreground">Amount</label>
                    <ui-input type="number" formControlName="amount" placeholder="0.00" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-muted-foreground">Payment date</label>
                    <ui-date-picker formControlName="paymentDateUtc" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-muted-foreground">Method</label>
                    <ui-input formControlName="method" placeholder="Bank transfer" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-xs font-medium text-muted-foreground">Reference</label>
                    <ui-input formControlName="reference" placeholder="BANK-TRX-12345" />
                  </div>

                  @if (invoiceStore.error() !== null) {
                    <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                      {{ invoiceStore.error() }}
                    </p>
                  }

                  <ui-button
                    type="submit"
                    [disabled]="invoiceStore.isLoading() || paymentForm.invalid"
                    [label]="invoiceStore.isLoading() ? 'Recording...' : 'Record payment'"
                  />
                </form>
              </section>
            }

            <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm dark:border-white/10">
              <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                Payment proof submissions
              </h2>
              <p class="mt-1 text-xs text-muted-foreground">
                Review client-submitted payment proofs.
              </p>
              <div class="mt-3 space-y-2">
                @for (submission of paymentSubmissions(); track submission.id) {
                  <div class="rounded-lg border border-border/60 p-3 text-sm">
                    <p class="font-medium">
                      {{ formatMoney(submission.amount, submission.currency) }}
                      · {{ submission.method }}
                    </p>
                    <p class="text-xs text-muted-foreground">
                      Ref {{ submission.reference }} · {{ submissionStatusLabel(submission.status) }}
                    </p>
                    @if (submission.status === 1) {
                      <div class="mt-2 flex gap-2">
                        <ui-button
                          type="button"
                          label="Approve"
                          (clicked)="approveSubmission(submission.id)"
                        />
                        <ui-button
                          type="button"
                          variant="outline"
                          label="Reject"
                          (clicked)="rejectSubmission(submission.id)"
                        />
                      </div>
                    }
                  </div>
                } @empty {
                  <p class="text-sm text-muted-foreground">No payment submissions.</p>
                }
              </div>
            </section>
          </aside>

          <div class="min-w-0">
            <app-invoice-document [invoice]="inv" [client]="client()" />
          </div>
        </div>
      }
    </div>
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly invoiceStore = inject(InvoiceStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly purchaseOrderApi = inject(PurchaseOrderApiService);
  private readonly clientApi = inject(ClientApiService);
  private readonly invoiceApi = inject(InvoiceApiService);

  protected readonly client = signal<ClientDetail | null>(null);
  protected readonly loadError = signal<string | null>(null);
  protected readonly paymentSubmissions = signal<PaymentSubmission[]>([]);
  protected readonly isDownloadingPdf = signal(false);

  protected readonly statusLabel = invoiceStatusLabel;
  protected readonly statusAccentClass = invoiceStatusAccentClass;
  protected readonly formatDate = formatInvoiceDate;
  protected readonly formatMoney = formatQuoteMoney;

  protected readonly invoiceId = computed(
    () => this.route.snapshot.paramMap.get('invoiceId') ?? '',
  );

  protected readonly invoice = computed(
    () => this.invoiceStore.selectedInvoice(),
  );

  protected readonly clientLabel = computed(() => {
    const client = this.client();
    const invoice = this.invoice();
    if (client?.companyName) {
      return client.companyName;
    }

    if (invoice?.clientCompanyName) {
      return invoice.clientCompanyName;
    }

    return 'Client';
  });

  private clientId = '';

  protected readonly paymentForm = this.formBuilder.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    paymentDateUtc: [new Date().toISOString().slice(0, 10), [Validators.required]],
    method: [DEFAULT_PAYMENT_METHOD, [Validators.required]],
    reference: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    this.clientId = this.route.snapshot.queryParamMap.get('clientId') ?? '';
    await this.loadInvoice();
  }

  protected pageSubtitle(inv: InvoiceDetail): string {
    if (inv.status === INVOICE_STATUS_DRAFT) {
      return 'Review the invoice and send it to the client when ready.';
    }

    return `Invoice status: ${invoiceStatusLabel(inv.status).toLowerCase()}.`;
  }

  protected isDraft(inv: InvoiceDetail): boolean {
    return inv.status === INVOICE_STATUS_DRAFT;
  }

  protected outstandingAmount(inv: InvoiceDetail): number {
    return Math.max(0, inv.total - inv.amountPaid);
  }

  protected canRecordPayment(inv: InvoiceDetail): boolean {
    return inv.status !== 7 && this.outstandingAmount(inv) > 0;
  }

  protected submissionStatusLabel(status: number): string {
    switch (status) {
      case 1:
        return 'Pending review';
      case 2:
        return 'Approved';
      case 3:
        return 'Rejected';
      default:
        return 'Unknown';
    }
  }

  protected async downloadPdf(inv: InvoiceDetail): Promise<void> {
    this.isDownloadingPdf.set(true);
    try {
      const blob = await firstValueFrom(this.invoiceApi.getInvoicePdf(inv.id, inv.clientId));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${inv.invoiceNumber.replace(/\//g, '-')}.pdf`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to download invoice PDF.'));
    } finally {
      this.isDownloadingPdf.set(false);
    }
  }

  protected async onSendInvoice(inv: InvoiceDetail): Promise<void> {
    const clientId = this.clientId || inv.clientId;
    if (!clientId) {
      this.toast.error('Client context is required to send this invoice.');
      return;
    }

    const sent = await this.invoiceStore.sendInvoice(inv.id, clientId);
    if (!sent) {
      if (this.invoiceStore.error()) {
        this.toast.error(this.invoiceStore.error()!);
      }
      return;
    }

    this.toast.success('Invoice sent to client.');
    await this.loadInvoice();
  }

  protected async approveSubmission(submissionId: string): Promise<void> {
    await firstValueFrom(this.purchaseOrderApi.approvePaymentSubmission(submissionId));
    this.toast.success('Payment submission approved.');
    await this.loadPaymentSubmissions();
    await this.loadInvoice();
  }

  protected async rejectSubmission(submissionId: string): Promise<void> {
    await firstValueFrom(this.purchaseOrderApi.rejectPaymentSubmission(submissionId));
    this.toast.success('Payment submission rejected.');
    await this.loadPaymentSubmissions();
  }

  protected async onRecordPayment(inv: InvoiceDetail): Promise<void> {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const request = this.paymentForm.getRawValue();
    const paidAtUtc = request.paymentDateUtc.includes('T')
      ? request.paymentDateUtc
      : `${request.paymentDateUtc}T12:00:00.000Z`;

    await this.invoiceStore.recordPayment(inv.id, {
      clientId: inv.clientId,
      amount: request.amount,
      currency: inv.currency,
      method: request.method.trim(),
      reference: request.reference.trim(),
      paidAtUtc,
    });

    if (this.invoiceStore.error() !== null) {
      this.toast.error(this.invoiceStore.error()!);
      return;
    }

    this.toast.success('Payment recorded successfully.');
    await this.loadInvoice();
  }

  private async loadInvoice(): Promise<void> {
    this.loadError.set(null);

    const invoiceId = this.invoiceId();
    if (!invoiceId) {
      this.loadError.set('Invoice not found.');
      return;
    }

    await this.invoiceStore.loadInvoiceById(invoiceId, this.clientId || undefined);

    if (this.invoiceStore.error()) {
      this.loadError.set(this.invoiceStore.error());
      return;
    }

    const inv = this.invoice();
    if (!inv) {
      this.loadError.set('Invoice not found.');
      return;
    }

    this.clientId = this.clientId || inv.clientId;
    this.prefillPaymentForm(inv);

    try {
      const client = await firstValueFrom(this.clientApi.getClientById(inv.clientId));
      this.client.set(client);
    } catch {
      this.client.set(null);
    }

    await this.loadPaymentSubmissions();
  }

  private prefillPaymentForm(inv: InvoiceDetail): void {
    const outstanding = this.outstandingAmount(inv);
    this.paymentForm.patchValue({
      amount: outstanding > 0 ? outstanding : inv.total,
    });
  }

  private async loadPaymentSubmissions(): Promise<void> {
    const inv = this.invoice();
    const clientId = this.clientId || inv?.clientId;
    if (!inv || !clientId) {
      return;
    }

    try {
      const submissions = await firstValueFrom(
        this.purchaseOrderApi.getPaymentSubmissions(inv.id, clientId),
      );
      this.paymentSubmissions.set(submissions);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to load payment submissions.'));
    }
  }
}
