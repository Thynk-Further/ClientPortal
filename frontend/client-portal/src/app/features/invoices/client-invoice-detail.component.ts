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
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

const INVOICE_STATUS_CLASSES: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  3: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  4: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  5: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  6: 'bg-destructive/10 text-destructive',
  7: 'bg-muted text-muted-foreground',
};

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
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <div>
        <a
          routerLink="/invoices"
          class="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Back to invoices
        </a>
      </div>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (successMessage() !== null) {
        <p
          class="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {{ successMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading invoice...</p>
      } @else if (invoice(); as detail) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-2">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ detail.invoiceNumber }}
            </h1>
            <p class="text-sm text-muted-foreground">
              Issued {{ formatDateTime(detail.createdAt) }} · Due {{ formatDate(detail.dueDate) }}
            </p>
            <span
              class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="statusClass(detail.status)"
            >
              {{ statusLabel(detail.status) }}
            </span>
          </div>

          @if (canPay(detail)) {
            <ui-button
              type="button"
              [disabled]="isPaying()"
              (click)="payOnline(detail.id)"
            >
              {{ isPaying() ? 'Starting payment...' : 'Pay online' }}
            </ui-button>
          }
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Line items</ui-card-title>
            <ui-card-description>Summary of charges on this invoice.</ui-card-description>
          </ui-card-header>
          <ui-card-content class="overflow-x-auto p-0">
            <table class="w-full min-w-[32rem] text-sm">
              <thead class="border-b border-border/70 bg-muted/40 text-left text-muted-foreground">
                <tr>
                  <th class="px-4 py-2 font-medium">Description</th>
                  <th class="px-4 py-2 font-medium text-right">Qty</th>
                  <th class="px-4 py-2 font-medium text-right">Unit price</th>
                  <th class="px-4 py-2 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody>
                @for (item of detail.lineItems; track item.description + item.amount) {
                  <tr class="border-b border-border/50">
                    <td class="px-4 py-2 text-foreground">{{ item.description }}</td>
                    <td class="px-4 py-2 text-right text-muted-foreground">{{ item.quantity }}</td>
                    <td class="px-4 py-2 text-right text-muted-foreground">
                      {{ formatMoney(item.unitPrice, detail.currency) }}
                    </td>
                    <td class="px-4 py-2 text-right font-medium text-foreground">
                      {{ formatMoney(item.amount, detail.currency) }}
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-content class="space-y-2 p-4 text-sm">
            <div class="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{{ formatMoney(detail.subtotal, detail.currency) }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span>{{ formatMoney(detail.taxAmount, detail.currency) }}</span>
            </div>
            <div class="flex justify-between font-medium text-foreground">
              <span>Total</span>
              <span>{{ formatMoney(detail.total, detail.currency) }}</span>
            </div>
            <div class="flex justify-between text-muted-foreground">
              <span>Paid</span>
              <span>{{ formatMoney(detail.amountPaid, detail.currency) }}</span>
            </div>
            <div class="flex justify-between border-t border-border/70 pt-2 text-base font-semibold text-foreground">
              <span>Outstanding</span>
              <span>{{ formatMoney(detail.outstandingAmount, detail.currency) }}</span>
            </div>
          </ui-card-content>
        </ui-card>

        @if (detail.notes?.trim()) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>Notes</ui-card-title>
            </ui-card-header>
            <ui-card-content>
              <p class="text-sm text-muted-foreground whitespace-pre-wrap">{{ detail.notes }}</p>
            </ui-card-content>
          </ui-card>
        }

        @if (canPay(detail)) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>Submit payment with proof</ui-card-title>
              <ui-card-description>
                Upload proof of payment. Your provider will review and confirm before the invoice status updates.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="paymentForm" class="space-y-3" (ngSubmit)="submitPaymentWithProof(detail)">
                <ui-input formControlName="amount" type="number" placeholder="Amount" />
                <ui-input formControlName="method" placeholder="Payment method (e.g. EFT)" />
                <ui-input formControlName="reference" placeholder="Payment reference" />
                <input type="file" accept="image/*,application/pdf" (change)="onProofSelected($event)" />
                <ui-button type="submit" [disabled]="isSubmittingPayment()">
                  {{ isSubmittingPayment() ? 'Submitting...' : 'Submit for review' }}
                </ui-button>
              </form>
            </ui-card-content>
          </ui-card>
        }
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
    return INVOICE_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusClass(status: number): string {
    return INVOICE_STATUS_CLASSES[status] ?? INVOICE_STATUS_CLASSES[1];
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
