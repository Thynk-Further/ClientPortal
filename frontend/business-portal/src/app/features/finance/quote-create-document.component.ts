import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserSessionService } from '@/app/core/auth/user-session.service';
import { ButtonComponent } from '@/components/ui/button.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

import { formatQuoteMoney } from './quote-display.util';
import { buildQuoteNotes } from './quote-notes.util';

export interface QuoteCreateDocumentPayload {
  quoteNumber: string;
  dueDate: string;
  currency: string;
  recipientCompanyName: string;
  recipientContactName: string;
  recipientEmail: string;
  recipientPhone: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes: string;
}

@Component({
  selector: 'app-quote-create-document',
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
          <div class="space-y-2 text-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient</p>
            <ui-input formControlName="recipientCompanyName" placeholder="Company name *" />
            <ui-input formControlName="recipientContactName" placeholder="Contact name" />
            <ui-input formControlName="recipientEmail" placeholder="Email" />
            <ui-input formControlName="recipientPhone" placeholder="Phone" />
          </div>
          <div class="space-y-3">
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">Subject (RE:)</label>
              <ui-input formControlName="subject" placeholder="e.g. Laboratory equipment supply" />
            </div>
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground">Currency</label>
              <input
                type="text"
                formControlName="currency"
                maxlength="3"
                class="h-9 w-full max-w-[8rem] rounded-md border border-input bg-background px-3 text-sm uppercase outline-none focus-visible:border-neutral-400"
                placeholder="USD"
              />
            </div>
          </div>
        </div>

        <div class="flex items-center justify-between gap-3">
          <h3 class="text-sm font-semibold text-foreground">Pricing</h3>
          <ui-button type="button" variant="outline" label="Add line item" (clicked)="addLineItem()" />
        </div>

        <div class="overflow-x-auto rounded-lg border border-border/70">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr class="border-b border-border/70 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th class="px-3 py-2.5 font-semibold">Item</th>
                <th class="px-3 py-2.5 font-semibold">Description</th>
                <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                <th class="px-3 py-2.5 font-semibold text-right">
                  Unit price {{ form.controls.currency.value }} incl. VAT
                </th>
                <th class="px-3 py-2.5 font-semibold text-right">
                  Total {{ form.controls.currency.value }} incl. VAT
                </th>
                <th class="w-10 px-2 py-2.5" aria-label="Remove"></th>
              </tr>
            </thead>
            <tbody formArrayName="lineItems">
              @for (_ of lineItems.controls; track $index) {
                <tr class="border-b border-border/50 last:border-b-0" [formGroupName]="$index">
                  <td class="px-3 py-3 align-top text-muted-foreground">{{ $index + 1 }}</td>
                  <td class="px-3 py-3 align-top">
                    <ui-input formControlName="description" placeholder="Description" />
                  </td>
                  <td class="px-3 py-3 align-top">
                    <ui-input type="number" formControlName="quantity" />
                  </td>
                  <td class="px-3 py-3 align-top">
                    <ui-input type="number" formControlName="unitPrice" placeholder="0.00" />
                  </td>
                  <td class="px-3 py-3 align-top text-right font-medium tabular-nums">
                    {{ formatMoney(lineTotal($index)) }}
                  </td>
                  <td class="px-3 py-3 align-top">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-40"
                      [disabled]="lineItems.length <= 1"
                      (click)="removeLineItem($index)"
                      aria-label="Remove line item"
                    >
                      ×
                    </button>
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
                <td></td>
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
          Prices are VAT-inclusive. Quotation valid until {{ computedDueDateLabel() }}.
        </p>
        <ui-button
          type="submit"
          label="Create quote"
          [disabled]="isSaving() || !canSubmit() || form.invalid || grandTotal() <= 0"
        />
      </div>
    </form>
  `,
})
export class QuoteCreateDocumentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly userSession = inject(UserSessionService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly canSubmit = input(true);
  readonly isSaving = input(false);

  readonly createQuote = output<QuoteCreateDocumentPayload>();
  readonly previewChange = output<{
    items: Array<{ description: string; quantity: number }>;
    total: number;
    currency: string;
  }>();

  protected readonly form = this.fb.group({
    companyName: ['Your Company', Validators.required],
    companyTagline: [''],
    companyAddress: [''],
    companyPhone: [''],
    companyEmail: [''],
    companyWebsite: [''],
    companyRegistration: [''],
    bankingDetails: [''],
    recipientCompanyName: ['', Validators.required],
    recipientContactName: [''],
    recipientEmail: [''],
    recipientPhone: [''],
    currency: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    quoteNumber: ['', Validators.required],
    quoteDate: [todayIsoDate(), Validators.required],
    subject: ['', Validators.required],
    paymentTerms: ['COD', Validators.required],
    deliveryTerms: [
      'Ex-stock, subject to priority sale otherwise 5-7 working days.',
      Validators.required,
    ],
    validityDays: [60, [Validators.required, Validators.min(1)]],
    signatoryName: ['', Validators.required],
    signatoryTitle: ['Sales representative', Validators.required],
    lineItems: this.fb.array([this.createLineItemGroup()]),
  });

  ngOnInit(): void {
    this.form.patchValue({
      signatoryName: this.userSession.getUser()?.fullName ?? '',
    });

    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.emitPreview();
      this.cdr.markForCheck();
    });

    this.emitPreview();
  }

  protected get lineItems(): FormArray {
    return this.form.controls.lineItems;
  }

  protected addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup());
    this.emitPreview();
  }

  protected removeLineItem(index: number): void {
    if (this.lineItems.length <= 1) {
      return;
    }

    this.lineItems.removeAt(index);
    this.emitPreview();
  }

  protected lineTotal(index: number): number {
    const group = this.lineItems.at(index);
    if (!group) {
      return 0;
    }

    const quantity = parseNumber(group.get('quantity')?.value);
    const unitPrice = parseNumber(group.get('unitPrice')?.value);
    return quantity * unitPrice;
  }

  protected grandTotal(): number {
    return this.lineItems.controls.reduce((sum, _, index) => sum + this.lineTotal(index), 0);
  }

  protected formatMoney(value: number): string {
    return formatQuoteMoney(value, this.form.controls.currency.value ?? 'USD');
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
    if (this.form.invalid || !this.canSubmit() || this.grandTotal() <= 0) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const validityDays = Number(raw.validityDays ?? 60);
    const dueDate = addDaysToIsoDate(raw.quoteDate ?? todayIsoDate(), validityDays);

    this.createQuote.emit({
      quoteNumber: raw.quoteNumber ?? '',
      dueDate,
      currency: (raw.currency ?? 'USD').toUpperCase(),
      recipientCompanyName: String(raw.recipientCompanyName ?? '').trim(),
      recipientContactName: String(raw.recipientContactName ?? '').trim(),
      recipientEmail: String(raw.recipientEmail ?? '').trim(),
      recipientPhone: String(raw.recipientPhone ?? '').trim(),
      lineItems: this.lineItems.controls.map((group) => ({
        description: String(group.get('description')?.value ?? '').trim(),
        quantity: parseNumber(group.get('quantity')?.value),
        unitPrice: parseNumber(group.get('unitPrice')?.value),
        taxRate: 0,
      })),
      notes: buildQuoteNotes({
        paymentTerms: raw.paymentTerms ?? '',
        deliveryTerms: raw.deliveryTerms ?? '',
        validityDays,
        signatoryName: raw.signatoryName ?? '',
        signatoryTitle: raw.signatoryTitle ?? '',
      }),
    });
  }

  private emitPreview(): void {
    const items = this.lineItems.controls
      .map((group) => ({
        description: String(group.get('description')?.value ?? '').trim(),
        quantity: parseNumber(group.get('quantity')?.value),
      }))
      .filter((item) => item.description !== '');

    this.previewChange.emit({
      items,
      total: this.grandTotal(),
      currency: (this.form.controls.currency.value ?? 'USD').toUpperCase(),
    });
  }

  private createLineItemGroup() {
    return this.fb.nonNullable.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
      unitPrice: ['', [Validators.required, Validators.min(0.01)]],
    });
  }
}

function parseNumber(value: unknown): number {
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
