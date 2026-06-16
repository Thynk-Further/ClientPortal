import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalInvoiceDetail,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
import { InputComponent } from '@/components/ui/input.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
import {
  clientInvoiceStatusAccentClass,
  clientInvoiceStatusLabel,
} from './invoice-display.util';

const PAYMENT_SESSION_STORAGE_PREFIX = 'cp_invoice_payment_';

interface StoredPaymentSession {
  readonly provider: string;
  readonly transactionId: string;
  readonly reference: string;
}

@Component({
  selector: 'app-client-invoice-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    InputComponent,
    StatusBadgeComponent,
  ],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <a
        routerLink="/invoices"
        class="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
      >
        ← Back to invoices
      </a>

      @if (errorMessage() !== null) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (successMessage() !== null) {
        <p
          class="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
          role="status"
        >
          {{ successMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading invoice...</p>
      } @else if (invoice(); as detail) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 space-y-2">
            <h1 class="font-mono text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ detail.invoiceNumber }}
            </h1>
            <p class="text-sm text-muted-foreground">
              Issued {{ formatDateTime(detail.createdAt) }} · Due {{ formatDate(detail.dueDate) }}
            </p>
            <ui-status-badge [status]="statusLabel(detail.status)" />
          </div>

          @if (canPay(detail)) {
            <ui-button
              type="button"
              class="bg-neutral-950 text-white hover:bg-neutral-800"
              [disabled]="isPaying()"
              [label]="isPaying() ? 'Starting payment...' : 'Pay online'"
              (clicked)="payOnline(detail.id)"
            />
          }
        </header>

        <div class="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(280px,340px)_1fr]">
          <aside class="space-y-4 xl:sticky xl:top-6 xl:self-start">
            <section class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
              <div class="flex">
                <div
                  class="w-1 shrink-0 self-stretch"
                  [class]="statusAccentClass(detail.status)"
                  aria-hidden="true"
                ></div>
                <div class="min-w-0 flex-1 p-4">
                  <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    Invoice summary
                  </h2>

                  <dl class="mt-3 space-y-3 text-sm">
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Invoice number
                      </dt>
                      <dd class="mt-0.5 font-mono font-medium text-foreground">{{ detail.invoiceNumber }}</dd>
                    </div>
                    <div>
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Currency
                      </dt>
                      <dd class="mt-0.5 font-medium text-foreground">{{ detail.currency }}</dd>
                    </div>
                    <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Dates
                      </dt>
                      <dd class="mt-1 font-medium text-foreground">
                        Issued {{ formatDate(detail.createdAt) }}
                      </dd>
                      <dd class="mt-0.5 text-xs text-muted-foreground">
                        Due {{ formatDate(detail.dueDate) }}
                      </dd>
                      @if (detail.paidAt) {
                        <dd class="mt-0.5 text-xs text-emerald-700 dark:text-emerald-400">
                          Paid {{ formatDate(detail.paidAt) }}
                        </dd>
                      }
                    </div>
                    <div
                      class="rounded-lg border px-3 py-2.5"
                      [class.border-emerald-200]="detail.outstandingAmount <= 0"
                      [class.bg-emerald-50/50]="detail.outstandingAmount <= 0"
                      [class.dark:border-emerald-500/20]="detail.outstandingAmount <= 0"
                      [class.dark:bg-emerald-500/5]="detail.outstandingAmount <= 0"
                      [class.border-amber-200]="detail.outstandingAmount > 0"
                      [class.bg-amber-50/50]="detail.outstandingAmount > 0"
                      [class.dark:border-amber-500/20]="detail.outstandingAmount > 0"
                      [class.dark:bg-amber-500/5]="detail.outstandingAmount > 0"
                    >
                      <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        Amount due
                      </dt>
                      <dd class="mt-1 text-lg font-semibold tabular-nums text-foreground">
                        {{ formatMoney(detail.outstandingAmount, detail.currency) }}
                      </dd>
                      <dd class="mt-0.5 text-xs text-muted-foreground">
                        Total {{ formatMoney(detail.total, detail.currency) }}
                        @if (detail.amountPaid > 0) {
                          · Paid {{ formatMoney(detail.amountPaid, detail.currency) }}
                        }
                      </dd>
                    </div>
                  </dl>
                </div>
              </div>
            </section>

            @if (canPay(detail)) {
              <section class="rounded-xl border border-border/70 bg-card p-4 shadow-sm">
                <h2 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Submit payment with proof
                </h2>
                <p class="mt-1 text-xs text-muted-foreground">
                  Upload proof of payment for your provider to review and confirm.
                </p>
                <form [formGroup]="paymentForm" class="mt-4 space-y-3" (ngSubmit)="submitPaymentWithProof(detail)">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="payment-amount">Amount</label>
                    <ui-input id="payment-amount" formControlName="amount" type="number" placeholder="0.00" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="payment-method">Payment method</label>
                    <ui-input id="payment-method" formControlName="method" placeholder="e.g. EFT" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="payment-reference">Reference</label>
                    <ui-input id="payment-reference" formControlName="reference" placeholder="Payment reference" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="payment-proof">Proof of payment</label>
                    <input
                      id="payment-proof"
                      type="file"
                      accept="image/*,application/pdf"
                      class="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-2 file:text-sm file:font-medium file:text-foreground"
                      (change)="onProofSelected($event)"
                    />
                  </div>
                  <ui-button
                    type="submit"
                    variant="outline"
                    class="w-full"
                    [disabled]="isSubmittingPayment()"
                    [label]="isSubmittingPayment() ? 'Submitting...' : 'Submit for review'"
                  />
                </form>
              </section>
            }
          </aside>

          <section class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm">
            <div class="border-b border-blue-600/20 bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
              <div class="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p class="text-lg font-semibold">Tax invoice</p>
                  <p class="text-sm text-white/80">{{ detail.invoiceNumber }}</p>
                </div>
                <p class="text-sm text-white/90">
                  {{ detail.currency }} · {{ statusLabel(detail.status) }}
                </p>
              </div>
            </div>

            <div class="space-y-6 p-6">
              <div class="grid gap-4 text-sm sm:grid-cols-2">
                <dl class="space-y-2">
                  <div class="grid grid-cols-[5.5rem_1fr] gap-2">
                    <dt class="font-medium text-muted-foreground">Issued</dt>
                    <dd>{{ formatDate(detail.createdAt) }}</dd>
                  </div>
                  <div class="grid grid-cols-[5.5rem_1fr] gap-2">
                    <dt class="font-medium text-muted-foreground">Due</dt>
                    <dd>{{ formatDate(detail.dueDate) }}</dd>
                  </div>
                </dl>
                <div class="rounded-lg border border-border/50 bg-muted/20 p-3">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Balance summary
                  </p>
                  <p class="mt-2 text-2xl font-semibold tabular-nums text-foreground">
                    {{ formatMoney(detail.outstandingAmount, detail.currency) }}
                  </p>
                  <p class="mt-1 text-xs text-muted-foreground">Outstanding balance</p>
                </div>
              </div>

              <div class="overflow-x-auto rounded-lg border border-border/70">
                <table class="w-full min-w-[36rem] border-collapse text-sm">
                  <thead>
                    <tr class="border-b border-border/70 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th class="px-3 py-2.5 font-semibold">#</th>
                      <th class="px-3 py-2.5 font-semibold">Description</th>
                      <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                      <th class="px-3 py-2.5 font-semibold text-right">Unit price</th>
                      <th class="px-3 py-2.5 font-semibold text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    @for (item of detail.lineItems; track item.description + item.amount; let index = $index) {
                      <tr class="border-b border-border/50 last:border-b-0">
                        <td class="px-3 py-3 text-muted-foreground">{{ index + 1 }}</td>
                        <td class="px-3 py-3 font-medium text-foreground">{{ item.description }}</td>
                        <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">{{ item.quantity }}</td>
                        <td class="px-3 py-3 text-right tabular-nums">
                          {{ formatMoney(item.unitPrice, detail.currency) }}
                        </td>
                        <td class="px-3 py-3 text-right font-medium tabular-nums">
                          {{ formatMoney(item.amount, detail.currency) }}
                        </td>
                      </tr>
                    } @empty {
                      <tr>
                        <td colspan="5" class="px-3 py-8 text-center text-muted-foreground">
                          No line items on this invoice.
                        </td>
                      </tr>
                    }
                  </tbody>
                  <tfoot>
                    <tr class="border-t border-border/70 bg-muted/20">
                      <td colspan="4" class="px-3 py-2.5 text-right text-sm text-muted-foreground">Subtotal</td>
                      <td class="px-3 py-2.5 text-right text-sm font-medium tabular-nums">
                        {{ formatMoney(detail.subtotal, detail.currency) }}
                      </td>
                    </tr>
                    <tr class="bg-muted/20">
                      <td colspan="4" class="px-3 py-2.5 text-right text-sm text-muted-foreground">Tax</td>
                      <td class="px-3 py-2.5 text-right text-sm font-medium tabular-nums">
                        {{ formatMoney(detail.taxAmount, detail.currency) }}
                      </td>
                    </tr>
                    <tr class="bg-muted/30">
                      <td colspan="4" class="px-3 py-3 text-right text-sm font-semibold">Invoice total</td>
                      <td class="px-3 py-3 text-right text-base font-bold tabular-nums">
                        {{ formatMoney(detail.total, detail.currency) }}
                      </td>
                    </tr>
                    @if (detail.amountPaid > 0) {
                      <tr class="bg-muted/20">
                        <td colspan="4" class="px-3 py-2.5 text-right text-sm text-muted-foreground">Amount paid</td>
                        <td class="px-3 py-2.5 text-right text-sm font-medium tabular-nums text-emerald-700 dark:text-emerald-400">
                          − {{ formatMoney(detail.amountPaid, detail.currency) }}
                        </td>
                      </tr>
                    }
                    <tr class="bg-amber-50/50 dark:bg-amber-500/5">
                      <td colspan="4" class="px-3 py-3 text-right text-sm font-semibold">Outstanding</td>
                      <td class="px-3 py-3 text-right text-base font-bold tabular-nums">
                        {{ formatMoney(detail.outstandingAmount, detail.currency) }}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              @if (detail.notes?.trim()) {
                <div class="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
                  <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes & terms</p>
                  <div class="mt-3 space-y-2 whitespace-pre-wrap text-foreground">
                    @for (line of noteLines(detail.notes); track line) {
                      <p>{{ line }}</p>
                    }
                  </div>
                </div>
              }
            </div>
          </section>
        </div>
      }
    </main>
  `,
})
export class ClientInvoiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientPortalApi = inject(ClientPortalApiService);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly isLoading = signal(true);
  protected readonly isPaying = signal(false);
  protected readonly isSubmittingPayment = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly invoice = signal<ClientPortalInvoiceDetail | null>(null);

  protected readonly paymentForm = this.formBuilder.nonNullable.group({
    amount: [0, [Validators.required, Validators.min(0.01)]],
    method: ['', Validators.required],
    reference: ['', Validators.required],
  });

  private invoiceId = '';
  private proofFile: File | null = null;

  async ngOnInit(): Promise<void> {
    this.invoiceId = this.route.snapshot.paramMap.get('invoiceId') ?? '';
    if (!this.invoiceId) {
      this.errorMessage.set('Invoice not found.');
      this.isLoading.set(false);
      return;
    }

    await this.loadInvoice();

    if (this.route.snapshot.queryParamMap.get('payment') === 'return') {
      await this.verifyReturnedPayment();
    }
  }

  protected statusLabel(status: number): string {
    return clientInvoiceStatusLabel(status);
  }

  protected statusAccentClass(status: number): string {
    return clientInvoiceStatusAccentClass(status);
  }

  protected noteLines(notes: string | null): string[] {
    if (notes === null || notes.trim() === '') {
      return [];
    }

    return notes
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  protected canPay(invoice: ClientPortalInvoiceDetail): boolean {
    return invoice.outstandingAmount > 0
      && invoice.status !== 5
      && invoice.status !== 7;
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected formatMoney(amount: number, currency: string): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency || 'ZAR',
    }).format(amount);
  }

  protected onProofSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.proofFile = input.files?.[0] ?? null;
  }

  protected async submitPaymentWithProof(detail: ClientPortalInvoiceDetail): Promise<void> {
    if (this.paymentForm.invalid || !this.proofFile) {
      this.errorMessage.set('Complete the payment form and attach proof of payment.');
      return;
    }

    this.isSubmittingPayment.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const upload = await firstValueFrom(
        this.clientPortalApi.getPaymentProofUploadUrl(this.invoiceId, {
          fileName: this.proofFile.name,
          contentType: this.proofFile.type || 'application/octet-stream',
        }),
      );

      await fetch(upload.uploadUrl, {
        method: 'PUT',
        body: this.proofFile,
        headers: { 'Content-Type': this.proofFile.type || 'application/octet-stream' },
      });

      const form = this.paymentForm.getRawValue();
      await firstValueFrom(
        this.clientPortalApi.submitInvoicePayment(this.invoiceId, {
          amount: form.amount,
          currency: detail.currency,
          method: form.method,
          reference: form.reference,
          proofDocumentId: upload.documentId,
        }),
      );

      this.successMessage.set('Payment submitted for review. You will be notified once confirmed.');
      await this.loadInvoice();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to submit payment.'));
    } finally {
      this.isSubmittingPayment.set(false);
    }
  }

  protected async payOnline(invoiceId: string): Promise<void> {
    this.isPaying.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const callbackUrl = `${window.location.origin}/invoices/${invoiceId}?payment=return`;
      const session = await firstValueFrom(
        this.clientPortalApi.initiateInvoicePayment(invoiceId, { callbackUrl }),
      );

      this.storePaymentSession(invoiceId, {
        provider: session.provider,
        transactionId: session.transactionId,
        reference: session.reference,
      });

      if (session.redirectUrl) {
        window.location.assign(session.redirectUrl);
        return;
      }

      this.successMessage.set(
        'Payment session started. Complete verification if you were not redirected automatically.',
      );
      await this.verifyPayment(invoiceId, session.provider, session.transactionId, session.reference);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to start online payment.'));
    } finally {
      this.isPaying.set(false);
    }
  }

  private async verifyReturnedPayment(): Promise<void> {
    const stored = this.readPaymentSession(this.invoiceId);
    const transactionId =
      this.route.snapshot.queryParamMap.get('id')
      ?? this.route.snapshot.queryParamMap.get('transactionId')
      ?? stored?.transactionId
      ?? '';

    if (!stored && !transactionId) {
      this.errorMessage.set('Payment return received but session details were not found.');
      return;
    }

    const provider = stored?.provider ?? 'peach';
    const reference = stored?.reference ?? '';

    if (!transactionId || !reference) {
      this.errorMessage.set('Payment return received but verification details are incomplete.');
      return;
    }

    await this.verifyPayment(this.invoiceId, provider, transactionId, reference);
    this.clearPaymentSession(this.invoiceId);
  }

  private async verifyPayment(
    invoiceId: string,
    provider: string,
    transactionId: string,
    reference: string,
  ): Promise<void> {
    this.isPaying.set(true);
    this.errorMessage.set(null);

    try {
      const verification = await firstValueFrom(
        this.clientPortalApi.verifyInvoicePayment(invoiceId, {
          provider,
          transactionId,
          reference,
        }),
      );

      if (verification.outstandingAmount <= 0) {
        this.successMessage.set('Payment successful. This invoice is now paid.');
      } else {
        this.successMessage.set('Payment recorded. A balance remains on this invoice.');
      }

      await this.loadInvoice();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Payment verification failed.'));
    } finally {
      this.isPaying.set(false);
    }
  }

  private async loadInvoice(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const detail = await firstValueFrom(this.clientPortalApi.getInvoice(this.invoiceId));
      this.invoice.set(detail);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load invoice.'));
      this.invoice.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }

  private storePaymentSession(invoiceId: string, session: StoredPaymentSession): void {
    sessionStorage.setItem(
      `${PAYMENT_SESSION_STORAGE_PREFIX}${invoiceId}`,
      JSON.stringify(session),
    );
  }

  private readPaymentSession(invoiceId: string): StoredPaymentSession | null {
    const raw = sessionStorage.getItem(`${PAYMENT_SESSION_STORAGE_PREFIX}${invoiceId}`);
    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw) as StoredPaymentSession;
    } catch {
      return null;
    }
  }

  private clearPaymentSession(invoiceId: string): void {
    sessionStorage.removeItem(`${PAYMENT_SESSION_STORAGE_PREFIX}${invoiceId}`);
  }
}
