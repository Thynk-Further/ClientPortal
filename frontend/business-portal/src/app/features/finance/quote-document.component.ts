import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  effect,
  inject,
  input,
  output,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormArray, FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';

import { ClientDetail } from '@/app/core/api/services/client-api.service';
import { QuoteDetail, QuoteLineItem } from '@/app/core/api/services/quote-api.service';
import { ButtonComponent } from '@/components/ui/button.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

import { formatQuoteMoney } from './quote-display.util';
import { buildQuoteNotes, parseQuoteNotes } from './quote-notes.util';

export interface QuoteDocumentSavePayload {
  quoteNumber: string;
  dueDate: string;
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
  }>;
  notes: string;
  recipientCompanyName?: string;
  recipientContactName?: string;
  recipientEmail?: string;
  recipientPhone?: string;
}

@Component({
  selector: 'app-quote-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, ButtonComponent, InputComponent, TextareaComponent],
  template: `
    <form
      class="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm dark:border-white/10 dark:bg-card"
      [formGroup]="form"
      (ngSubmit)="$event.preventDefault()"
    >
      <div class="border-b border-blue-600/20 bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1 space-y-2">
            @if (readonly()) {
              <p class="text-lg font-semibold">{{ form.controls.companyName.value }}</p>
              @if (form.controls.companyTagline.value) {
                <p class="text-sm text-white/90">{{ form.controls.companyTagline.value }}</p>
              }
            } @else {
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
            }
          </div>
          <div class="space-y-2 text-sm lg:max-w-sm lg:text-right">
            @if (readonly()) {
              @if (form.controls.companyAddress.value) {
                <p class="whitespace-pre-line text-white/90">{{ form.controls.companyAddress.value }}</p>
              }
              @if (form.controls.companyPhone.value) {
                <p>{{ form.controls.companyPhone.value }}</p>
              }
              @if (form.controls.companyEmail.value) {
                <p>{{ form.controls.companyEmail.value }}</p>
              }
              @if (form.controls.companyWebsite.value) {
                <p>{{ form.controls.companyWebsite.value }}</p>
              }
            } @else {
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
            }
          </div>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-3">
            <div class="grid grid-cols-[4rem_1fr] items-center gap-2 text-sm">
              <span class="font-medium text-muted-foreground">Ref:</span>
              @if (readonly()) {
                <span class="font-mono font-medium">{{ form.controls.quoteNumber.value }}</span>
              } @else {
                <ui-input formControlName="quoteNumber" placeholder="Reference number" />
              }
            </div>
            <div class="grid grid-cols-[4rem_1fr] items-center gap-2 text-sm">
              <span class="font-medium text-muted-foreground">Date:</span>
              @if (readonly()) {
                <span>{{ formatDisplayDate(form.controls.quoteDate.value) }}</span>
              } @else {
                <input
                  type="date"
                  formControlName="quoteDate"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-neutral-400"
                />
              }
            </div>
          </div>

          <div class="space-y-2 rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 dark:border-amber-500/20 dark:bg-amber-500/5">
            @if (readonly()) {
              @if (form.controls.companyRegistration.value) {
                <p class="whitespace-pre-line text-sm">{{ form.controls.companyRegistration.value }}</p>
              }
              @if (form.controls.bankingDetails.value) {
                <p class="whitespace-pre-line text-sm">{{ form.controls.bankingDetails.value }}</p>
              }
            } @else {
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
            }
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-1 text-sm">
            @if (isExternalQuote()) {
              @if (readonly()) {
                <p class="font-semibold text-foreground">{{ form.controls.recipientCompanyName.value }}</p>
                @if (form.controls.recipientContactName.value) {
                  <p class="text-muted-foreground">{{ form.controls.recipientContactName.value }}</p>
                }
                @if (form.controls.recipientEmail.value) {
                  <p class="text-muted-foreground">{{ form.controls.recipientEmail.value }}</p>
                }
                @if (form.controls.recipientPhone.value) {
                  <p class="text-muted-foreground">{{ form.controls.recipientPhone.value }}</p>
                }
              } @else {
                <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Recipient</p>
                <ui-input formControlName="recipientCompanyName" placeholder="Company name *" />
                <ui-input formControlName="recipientContactName" placeholder="Contact name" />
                <ui-input formControlName="recipientEmail" placeholder="Email" />
                <ui-input formControlName="recipientPhone" placeholder="Phone" />
              }
            } @else {
              <p class="font-semibold text-foreground">{{ client()?.companyName ?? 'Client' }}</p>
              @if (client()?.contactName) {
                <p class="text-muted-foreground">{{ client()?.contactName }}</p>
              }
              @if (client()?.email) {
                <p class="text-muted-foreground">{{ client()?.email }}</p>
              }
            }
          </div>
          <div class="flex items-end lg:justify-end">
            <p class="text-sm font-bold underline decoration-foreground/30 underline-offset-4">
              RE: {{ subjectTitle() }}
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
                  Unit price {{ quote().currency }} incl. VAT
                </th>
                <th class="px-3 py-2.5 font-semibold text-right">
                  Total {{ quote().currency }} incl. VAT
                </th>
              </tr>
            </thead>
            <tbody formArrayName="lineItems">
              @for (item of quote().lineItems; track $index) {
                <tr class="border-b border-border/50 last:border-b-0" [formGroupName]="$index">
                  <td class="px-3 py-3 align-top text-muted-foreground">{{ $index + 1 }}</td>
                  <td class="px-3 py-3 align-top font-medium text-foreground">
                    {{ item.description }}
                  </td>
                  <td class="px-3 py-3 align-top text-right tabular-nums text-muted-foreground">
                    {{ item.quantity }}
                  </td>
                  <td class="px-3 py-3 align-top">
                    @if (readonly()) {
                      <span class="block text-right tabular-nums">{{ formatMoney(readUnitPrice($index)) }}</span>
                    } @else {
                      <ui-input
                        type="number"
                        [formControl]="unitPriceControl($index)"
                        placeholder="0.00"
                      />
                    }
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
            @if (readonly()) {
              <dl class="space-y-2 text-sm">
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Payment terms</dt>
                  <dd class="mt-0.5">{{ form.controls.paymentTerms.value }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Delivery</dt>
                  <dd class="mt-0.5 whitespace-pre-line">{{ form.controls.deliveryTerms.value }}</dd>
                </div>
                <div>
                  <dt class="text-xs font-medium text-muted-foreground">Validity</dt>
                  <dd class="mt-0.5">{{ form.controls.validityDays.value }} days</dd>
                </div>
              </dl>
            } @else {
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
            }
          </div>

          <div class="flex flex-col justify-end space-y-2 text-sm lg:items-end lg:text-right">
            <p class="text-muted-foreground">Yours faithfully</p>
            @if (readonly()) {
              <p class="font-medium">{{ form.controls.signatoryName.value }}</p>
              <p class="text-muted-foreground">{{ form.controls.signatoryTitle.value }}</p>
            } @else {
              <div class="h-10 w-full border-b border-dashed border-border/80 lg:w-48"></div>
              <ui-input formControlName="signatoryName" placeholder="Signatory name" />
              <ui-input formControlName="signatoryTitle" placeholder="Title (e.g. Sales representative)" />
            }
          </div>
        </div>
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border/70 bg-muted/20 px-6 py-4">
        <p class="text-xs text-muted-foreground">
          Prices are VAT-inclusive. Quotation valid until {{ computedDueDateLabel() }}.
        </p>
        @if (!readonly()) {
          <div class="flex flex-wrap items-center gap-2">
            <ui-button
              type="button"
              variant="outline"
              label="Save changes"
              [disabled]="isSaving() || form.invalid || grandTotal() <= 0"
              (clicked)="onSave()"
            />
            <ui-button
              type="button"
              [label]="isExternalQuote() ? 'Mark as sent' : 'Send to client'"
              [disabled]="isSaving() || form.invalid || grandTotal() <= 0"
              (clicked)="onSend()"
            />
          </div>
        }
      </div>
    </form>
  `,
})
export class QuoteDocumentComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);

  readonly quote = input.required<QuoteDetail>();
  readonly client = input<ClientDetail | null>(null);
  readonly readonly = input(false);
  readonly isSaving = input(false);

  readonly saveQuote = output<QuoteDocumentSavePayload>();
  readonly sendQuote = output<QuoteDocumentSavePayload>();

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
    recipientCompanyName: [''],
    recipientContactName: [''],
    recipientEmail: [''],
    recipientPhone: [''],
    lineItems: this.fb.array<ReturnType<QuoteDocumentComponent['createLineItemGroup']>>([]),
  });

  constructor() {
    effect(() => {
      const quote = this.quote();
      if (!quote) {
        return;
      }

      this.initializeFromQuote();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.cdr.markForCheck();
    });
  }

  protected subjectTitle(): string {
    const quote = this.quote();
    const title = quote.rfqTitle?.trim();
    return title || quote.quoteNumber;
  }

  protected isExternalQuote(): boolean {
    return this.quote().origin === 3;
  }

  protected get lineItems(): FormArray {
    return this.form.controls.lineItems;
  }

  protected unitPriceControl(index: number): FormControl<number> {
    return this.lineItems.at(index).get('unitPrice') as FormControl<number>;
  }

  protected readUnitPrice(index: number): number {
    return parseUnitPrice(this.lineItems.at(index)?.get('unitPrice')?.value);
  }

  protected lineTotal(index: number): number {
    const quoteItem = this.quote().lineItems[index];
    if (!quoteItem) {
      return 0;
    }

    const unitPrice = this.readonly()
      ? quoteItem.unitPrice
      : parseUnitPrice(this.lineItems.at(index)?.get('unitPrice')?.value);
    return quoteItem.quantity * unitPrice;
  }

  protected grandTotal(): number {
    return this.quote().lineItems.reduce((sum, _, index) => sum + this.lineTotal(index), 0);
  }

  protected formatMoney(value: number): string {
    return formatQuoteMoney(value, this.quote().currency);
  }

  protected formatDisplayDate(isoDate: string | null | undefined): string {
    if (!isoDate) {
      return '—';
    }

    return new Date(`${isoDate}T00:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }

  protected computedDueDateLabel(): string {
    const quoteDate = this.form.controls.quoteDate.value;
    const validityDays = Number(this.form.controls.validityDays.value ?? 60);
    if (!quoteDate) {
      return formatQuoteDateFromIso(this.quote().dueDate);
    }

    const due = addDaysToIsoDate(quoteDate, validityDays);
    return this.formatDisplayDate(due);
  }

  protected onSave(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.saveQuote.emit(payload);
  }

  protected onSend(): void {
    const payload = this.buildPayload();
    if (!payload) {
      return;
    }

    this.sendQuote.emit(payload);
  }

  private buildPayload(): QuoteDocumentSavePayload | null {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return null;
    }

    if (this.grandTotal() <= 0) {
      this.form.markAllAsTouched();
      return null;
    }

    const raw = this.form.getRawValue();
    const validityDays = Number(raw.validityDays ?? 60);
    const dueDate = addDaysToIsoDate(raw.quoteDate ?? todayIsoDate(), validityDays);

    const payload: QuoteDocumentSavePayload = {
      quoteNumber: raw.quoteNumber ?? '',
      dueDate,
      lineItems: this.quote().lineItems.map((item, index) => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: parseUnitPrice(this.lineItems.at(index)?.get('unitPrice')?.value),
        taxRate: 0,
      })),
      notes: buildQuoteNotes({
        paymentTerms: raw.paymentTerms ?? '',
        deliveryTerms: raw.deliveryTerms ?? '',
        validityDays,
        signatoryName: raw.signatoryName ?? '',
        signatoryTitle: raw.signatoryTitle ?? '',
      }),
    };

    if (this.isExternalQuote()) {
      payload.recipientCompanyName = String(raw.recipientCompanyName ?? '').trim();
      payload.recipientContactName = String(raw.recipientContactName ?? '').trim();
      payload.recipientEmail = String(raw.recipientEmail ?? '').trim();
      payload.recipientPhone = String(raw.recipientPhone ?? '').trim();
    }

    return payload;
  }

  private initializeFromQuote(): void {
    const quote = this.quote();
    const parsedNotes = parseQuoteNotes(quote.notes);

    this.form.patchValue({
      quoteNumber: quote.quoteNumber,
      quoteDate: estimateQuoteDate(quote),
      paymentTerms: parsedNotes.paymentTerms,
      deliveryTerms: parsedNotes.deliveryTerms,
      validityDays: parsedNotes.validityDays,
      signatoryName: parsedNotes.signatoryName,
      signatoryTitle: parsedNotes.signatoryTitle,
      recipientCompanyName: quote.recipientCompanyName ?? '',
      recipientContactName: quote.recipientContactName ?? '',
      recipientEmail: quote.recipientEmail ?? '',
      recipientPhone: quote.recipientPhone ?? '',
    });

    this.lineItems.clear();
    for (const item of quote.lineItems) {
      this.lineItems.push(this.createLineItemGroup(item));
    }
  }

  private createLineItemGroup(item: QuoteLineItem) {
    return this.fb.nonNullable.group({
      unitPrice: [item.unitPrice, [Validators.required, Validators.min(0.01)]],
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

function estimateQuoteDate(quote: QuoteDetail): string {
  const parsedNotes = parseQuoteNotes(quote.notes);
  const due = new Date(quote.dueDate.includes('T') ? quote.dueDate : `${quote.dueDate}T00:00:00`);
  if (!Number.isNaN(due.getTime())) {
    const quoteDate = new Date(due);
    quoteDate.setDate(quoteDate.getDate() - parsedNotes.validityDays);
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${quoteDate.getFullYear()}-${pad(quoteDate.getMonth() + 1)}-${pad(quoteDate.getDate())}`;
  }

  const created = new Date(quote.createdAt);
  if (!Number.isNaN(created.getTime())) {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return `${created.getFullYear()}-${pad(created.getMonth() + 1)}-${pad(created.getDate())}`;
  }

  return todayIsoDate();
}

function formatQuoteDateFromIso(value: string): string {
  const parsed = new Date(value.includes('T') ? value : `${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}
