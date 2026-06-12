import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';

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
import { firstValueFrom } from 'rxjs';

import {
  PaymentSubmission,
  PurchaseOrderApiService,
} from '@/app/core/api/services/purchase-order-api.service';
import { InvoiceStore } from '@/app/core/stores/invoice.store';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

@Component({
  selector: 'app-invoice-detail',
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
    DatePickerComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Invoice Detail</h1>
              <p class="text-sm text-muted-foreground">
                Detail and payment operations for
                <span class="font-medium">{{ invoiceId() }}</span>.
              </p>
            </div>
            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/finance']"
            >
              Back to invoices
            </a>
          </div>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Invoice Summary</ui-card-title>
            <ui-card-description>
              Current billing posture and due-date context.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Status</p>
                <p class="text-lg font-semibold">{{ invoiceStatus() }}</p>
              </article>
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Amount</p>
                <p class="text-lg font-semibold">{{ formattedAmount() }}</p>
              </article>
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Due date</p>
                <p class="text-lg font-semibold">{{ dueDateLabel() }}</p>
              </article>
            </div>
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Record Payment</ui-card-title>
            <ui-card-description>
              Capture a new payment against this invoice.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <form [formGroup]="paymentForm" class="space-y-4" (ngSubmit)="onRecordPayment()">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Amount</label>
                  <ui-input type="number" formControlName="amount" placeholder="1000.00" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Payment Date</label>
                  <ui-date-picker formControlName="paymentDateUtc" />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium">Reference</label>
                <ui-input formControlName="reference" placeholder="BANK-TRX-12345" />
              </div>

              @if (invoiceStore.error() !== null) {
                <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {{ invoiceStore.error() }}
                </p>
              }

              <ui-button
                type="submit"
                [disabled]="invoiceStore.isLoading()"
                [label]="invoiceStore.isLoading() ? 'Recording...' : 'Record Payment'"
              />
            </form>
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Payment proof submissions</ui-card-title>
            <ui-card-description>Review client-submitted payment proofs.</ui-card-description>
          </ui-card-header>
          <ui-card-content class="space-y-2">
            @for (submission of paymentSubmissions(); track submission.id) {
              <div class="rounded-lg border p-3 text-sm">
                <p>{{ submission.amount }} {{ submission.currency }} · {{ submission.method }}</p>
                <p class="text-xs text-muted-foreground">Ref {{ submission.reference }} · Status {{ submission.status }}</p>
                @if (submission.status === 1) {
                  <div class="mt-2 flex gap-2">
                    <ui-button type="button" label="Approve" (click)="approveSubmission(submission.id)" />
                    <ui-button type="button" variant="outline" label="Reject" (click)="rejectSubmission(submission.id)" />
                  </div>
                }
              </div>
            } @empty {
              <p class="text-sm text-muted-foreground">No payment submissions.</p>
            }
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class InvoiceDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly invoiceStore = inject(InvoiceStore);
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly purchaseOrderApi = inject(PurchaseOrderApiService);

  protected readonly paymentSubmissions = signal<PaymentSubmission[]>([]);

  protected readonly invoiceId = computed(
    () => this.route.snapshot.paramMap.get('invoiceId') ?? 'unknown-invoice',
  );

  protected readonly invoiceStatus = computed(
    () => this.invoiceStore.selectedInvoice()?.status ?? 'Pending',
  );

  protected readonly formattedAmount = computed(() => {
    const invoice = this.invoiceStore.selectedInvoice();
    const amount = invoice?.totalAmount ?? 0;
    const currency = invoice?.currencyCode ?? 'USD';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  });

  protected readonly dueDateLabel = computed(() => {
    const dueDate = this.invoiceStore.selectedInvoice()?.dueDateUtc;
    if (!dueDate) {
      return 'Not set';
    }

    const parsed = new Date(dueDate);
    return Number.isNaN(parsed.getTime()) ? dueDate : parsed.toLocaleDateString();
  });

  protected readonly paymentForm = this.formBuilder.nonNullable.group({
    amount: [1000, [Validators.required, Validators.min(0.01)]],
    paymentDateUtc: [new Date().toISOString().slice(0, 10), [Validators.required]],
    reference: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.invoiceStore.loadInvoiceById(this.invoiceId());
    await this.loadPaymentSubmissions();
  }

  protected async approveSubmission(submissionId: string): Promise<void> {
    await firstValueFrom(this.purchaseOrderApi.approvePaymentSubmission(submissionId));
    this.toast.success('Payment submission approved.');
    await this.loadPaymentSubmissions();
  }

  protected async rejectSubmission(submissionId: string): Promise<void> {
    await firstValueFrom(this.purchaseOrderApi.rejectPaymentSubmission(submissionId));
    this.toast.success('Payment submission rejected.');
    await this.loadPaymentSubmissions();
  }

  private async loadPaymentSubmissions(): Promise<void> {
    const clientId = this.route.snapshot.queryParamMap.get('clientId')
      ?? this.invoiceStore.selectedInvoice()?.clientId;
    if (!clientId) {
      return;
    }

    const submissions = await firstValueFrom(
      this.purchaseOrderApi.getPaymentSubmissions(this.invoiceId(), clientId),
    );
    this.paymentSubmissions.set(submissions);
  }

  protected async onRecordPayment(): Promise<void> {
    if (this.paymentForm.invalid) {
      this.paymentForm.markAllAsTouched();
      return;
    }

    const request = this.paymentForm.getRawValue();
    await this.invoiceStore.recordPayment(this.invoiceId(), {
      amount: request.amount,
      paymentDateUtc: request.paymentDateUtc,
      reference: request.reference.trim() === '' ? undefined : request.reference.trim(),
    });

    if (this.invoiceStore.error() !== null) {
      return;
    }

    this.toast.success('Payment recorded successfully.');
    await this.invoiceStore.loadInvoiceById(this.invoiceId());
  }
}
