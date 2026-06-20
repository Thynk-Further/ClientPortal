import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { RfqDetail, RfqLineItem } from '@/app/core/api/services/rfq-api.service';
import { ClientDetail } from '@/app/core/api/services/client-api.service';
import { TenantSettingsApiService } from '@/app/core/api/services/tenant-settings-api.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { ButtonComponent } from '@/components/ui/button.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

export interface QuotationDocumentSubmitPayload {
  quoteNumber: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes: string;
}

@Component({
  selector: 'app-rfq-quotation-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, TextareaComponent],
  template: `
    <form
      class="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      [formGroup]="form"
      (ngSubmit)="onSubmit()"
    >
      <div class="border-b border-blue-600/20 bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1 space-y-2">
            <input
              formControlName="companyName"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/60 outline-none focus:border-white/40"
              placeholder="Company name"
            />
            <input
              formControlName="companyTagline"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white/90 placeholder:text-white/50 outline-none focus:border-white/40"
              placeholder="Tagline (e.g. Medical & Scientific)"
            />
          </div>
          <div class="space-y-2 text-sm lg:max-w-sm lg:text-right">
            <textarea
              formControlName="companyAddress"
              rows="2"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-white/50 outline-none focus:border-white/40"
              placeholder="Address lines"
            ></textarea>
            <input
              formControlName="companyPhone"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              placeholder="Telephone"
            />
            <input
              formControlName="companyEmail"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              placeholder="Email"
            />
            <input
              formControlName="companyWebsite"
              class="w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white outline-none focus:border-white/40"
              placeholder="Website"
            />
          </div>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-3">
            <div class="grid grid-cols-[4rem_1fr] items-center gap-2 text-sm">
              <span class="font-medium text-muted-foreground">Ref:</span>
              <ui-input formControlName="quoteNumber" placeholder="Reference number" />
            </div>
            <div class="grid grid-cols-[4rem_1fr] items-center gap-2 text-sm">
              <span class="font-medium text-muted-foreground">Date:</span>
              <input
                type="date"
                formControlName="quoteDate"
                class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-neutral-400"
              />
            </div>
          </div>

          <div class="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
            <ui-textarea
              formControlName="companyRegistration"
              [rows]="2"
              placeholder="Co. Reg, VAT No, TIN, Vendor No..."
            />
            <ui-textarea
              formControlName="bankingDetails"
              [rows]="2"
              placeholder="Bank, account numbers..."
            />
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-1 text-sm">
            <p class="font-semibold text-foreground">{{ client()?.companyName ?? rfq().clientCompanyName }}</p>
            @if (client()?.contactName) {
              <p class="text-muted-foreground">{{ client()?.contactName }}</p>
            }
            @if (client()?.email) {
              <p class="text-muted-foreground">{{ client()?.email }}</p>
            }
          </div>
          <div class="flex items-end lg:justify-end">
            <p class="text-sm font-bold underline decoration-foreground/30 underline-offset-4">
              RE: {{ rfq().title }}
            </p>
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border/70">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border/70 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-3 py-2.5 font-semibold">Item</th>
                <th class="px-3 py-2.5 font-semibold">Description</th>
                <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                <th class="px-3 py-2.5 font-semibold text-right">
                  Unit price {{ rfq().currency }} {{ priceBasisLabel() }}
                </th>
                <th class="px-3 py-2.5 font-semibold text-right">
                  Total {{ rfq().currency }} {{ priceBasisLabel() }}
                </th>
              </tr>
            </thead>
            <tbody formArrayName="lineItems">
              @for (item of rfq().lineItems; track $index) {
                <tr class="border-b border-border/50 last:border-b-0" [formGroupName]="$index">
                  <td class="px-3 py-3 align-top text-muted-foreground">{{ $index + 1 }}</td>
                  <td class="px-3 py-3 align-top font-medium text-foreground">
                    {{ item.description }}
                  </td>
                  <td class="px-3 py-3 align-top text-right tabular-nums text-muted-foreground">
                    {{ item.quantity }}
                  </td>
                  <td class="px-3 py-3 align-top">
                    <ui-input
                      type="number"
                      [formControl]="unitPriceControl($index)"
                      placeholder="0.00"
                    />
                  </td>
                  <td class="px-3 py-3 align-top text-right font-medium tabular-nums">
                    {{ formatMoney(lineTotal($index)) }}
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="bg-muted/30">
                <td colspan="4" class="px-3 py-3 text-right text-sm font-semibold">Grand total</td>
                <td class="px-3 py-3 text-right text-base font-bold tabular-nums text-foreground">
                  {{ formatMoney(grandTotal()) }}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <div class="grid gap-6 lg:grid-cols-2">
          <div class="space-y-3">
            <h3 class="text-sm font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400">
              Terms &amp; conditions
            </h3>
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Payment terms</label>
              <ui-input formControlName="paymentTerms" placeholder="e.g. COD" />
            </div>
            <div class="space-y-2">
              <label class="text-xs font-medium text-muted-foreground">Delivery</label>
              <ui-textarea
                formControlName="deliveryTerms"
                [rows]="2"
                placeholder="Delivery conditions"
              />
            </div>
            <div class="grid grid-cols-[auto_1fr] items-center gap-2">
              <label class="text-xs font-medium text-muted-foreground">Validity (days)</label>
              <ui-input type="number" formControlName="validityDays" />
            </div>
          </div>

          <div class="flex flex-col justify-end space-y-2 text-sm lg:items-end lg:text-right">
            <p class="text-muted-foreground">Yours faithfully</p>
            <div class="h-10 w-full border-b border-dashed border-border/80 lg:w-48"></div>
            <ui-input formControlName="signatoryName" placeholder="Signatory name" />
            <ui-input formControlName="signatoryTitle" placeholder="Title (e.g. Sales representative)" />
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-6 py-4">
        <p class="text-xs text-muted-foreground">
          Prices are {{ priceBasisDescription() }}. Quotation valid until {{ computedDueDateLabel() }}.
        </p>
        <ui-button type="submit" [disabled]="isSaving() || grandTotal() <= 0">Create quotation</ui-button>
      </div>
    </form>
  `,
})
export class RfqQuotationDocumentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userSession = inject(UserSessionService);
  private readonly settingsApi = inject(TenantSettingsApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  private readonly taxRate = signal(0);
  private readonly taxLabel = signal('VAT');
  private readonly pricingMode = signal('Inclusive');

  protected readonly priceBasisLabel = computed(() =>
    this.pricingMode().toLowerCase() === 'inclusive' ? 'incl. tax' : 'excl. tax',
  );

  protected readonly priceBasisDescription = computed(() => {
    const label = this.taxLabel();
    return this.pricingMode().toLowerCase() === 'inclusive'
      ? `${label}-inclusive`
      : `${label}-exclusive`;
  });

  readonly rfq = input.required<RfqDetail>();
  readonly client = input<ClientDetail | null>(null);
  readonly isSaving = input(false);

  readonly submitQuotation = output<QuotationDocumentSubmitPayload>();

  protected readonly form = this.fb.group({
    companyName: ['Your Company', Validators.required],
    companyTagline: [''],
    companyAddress: [''],
    companyPhone: [''],
    companyEmail: [''],
    companyWebsite: [''],
    companyRegistration: [''],
    bankingDetails: [''],
    quoteNumber: ['', Validators.required],
    quoteDate: [todayIsoDate(), Validators.required],
    paymentTerms: ['COD', Validators.required],
    deliveryTerms: [
      'Ex-stock, subject to priority sale otherwise 5-7 working days.',
      Validators.required,
    ],
    validityDays: [60, [Validators.required, Validators.min(1)]],
    signatoryName: ['', Validators.required],
    signatoryTitle: ['Sales representative', Validators.required],
    lineItems: this.fb.array<ReturnType<RfqQuotationDocumentComponent['createLineItemGroup']>>([]),
  });

  ngOnInit(): void {
    void this.initializeComponent();
  }

  private async initializeComponent(): Promise<void> {
    await this.loadTaxSettings();
    this.initializeFromRfq();

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  protected get lineItems(): FormArray {
    return this.form.controls.lineItems;
  }

  protected unitPriceControl(index: number): FormControl<number> {
    return this.lineItems.at(index).get('unitPrice') as FormControl<number>;
  }

  protected lineTotal(index: number): number {
    const group = this.lineItems.at(index);
    if (!group) {
      return 0;
    }

    const quantity = Number(group.get('quantity')?.value ?? 0);
    const unitPrice = parseUnitPrice(group.get('unitPrice')?.value);
    return quantity * unitPrice;
  }

  protected grandTotal(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.lineTotal(index), 0);
  }

  protected formatMoney(value: number): string {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: this.rfq().currency || 'USD',
      minimumFractionDigits: 2,
    }).format(value);
  }

  protected computedDueDateLabel(): string {
    const quoteDate = this.form.controls.quoteDate.value;
    const validityDays = Number(this.form.controls.validityDays.value ?? 60);
    if (!quoteDate) {
      return '—';
    }

    const due = addDaysToIsoDate(quoteDate, validityDays);
    return new Date(`${due}T00:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.grandTotal() <= 0) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const validityDays = Number(raw.validityDays ?? 60);
    const dueDate = addDaysToIsoDate(raw.quoteDate ?? todayIsoDate(), validityDays);

    const notes = [
      `PAYMENT TERMS: ${raw.paymentTerms ?? ''}`,
      `DELIVERY: ${raw.deliveryTerms ?? ''}`,
      `VALIDITY: ${validityDays} days from date of quotation.`,
      raw.signatoryName
        ? `Prepared by: ${raw.signatoryName}${raw.signatoryTitle ? ` (${raw.signatoryTitle})` : ''}`
        : null,
    ]
      .filter((line): line is string => line !== null && line.trim() !== '')
      .join('\n');

    this.submitQuotation.emit({
      quoteNumber: raw.quoteNumber ?? '',
      dueDate,
      lineItems: this.lineItems.controls.map((group, index) => {
        const rfqItem = this.rfq().lineItems[index];
        return {
          description: rfqItem.description,
          quantity: rfqItem.quantity,
          unitPrice: parseUnitPrice(group.get('unitPrice')?.value),
          taxRate: this.taxRate(),
        };
      }),
      notes,
    });
  }

  private async loadTaxSettings(): Promise<void> {
    try {
      const settings = await firstValueFrom(this.settingsApi.getSettings());
      this.taxRate.set(settings.tax.taxPercentage / 100);
      this.taxLabel.set(settings.tax.label);
      this.pricingMode.set(settings.tax.pricingMode);

      const registration = [
        settings.tax.label,
        settings.tax.registrationNumber,
      ]
        .filter((part) => part.trim() !== '')
        .join(' No: ');

      this.form.patchValue({
        companyName: settings.tenantName,
        companyRegistration: registration,
      });
    } catch {
      // Keep defaults when settings cannot be loaded.
    }
  }

  private initializeFromRfq(): void {
    const rfq = this.rfq();
    this.form.patchValue({
      quoteNumber: `Q/${rfq.rfqNumber}`,
      signatoryName: this.userSession.getUser()?.fullName ?? '',
    });

    this.lineItems.clear();
    for (const item of rfq.lineItems) {
      this.lineItems.push(this.createLineItemGroup(item));
    }
  }

  private createLineItemGroup(item: RfqLineItem) {
    return this.fb.nonNullable.group({
      description: [item.description],
      quantity: [item.quantity],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]],
    });
  }
}

function parseUnitPrice(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function todayIsoDate(): string {
  const now = new Date();
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

function addDaysToIsoDate(isoDate: string, days: number): string {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + days);
  const pad = (value: number) => value.toString().padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}
