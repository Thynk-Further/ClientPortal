import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';

import { ClientDetail } from '@/app/core/api/services/client-api.service';
import { InvoiceDetail } from '@/app/core/api/services/invoice-api.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';

import { formatInvoiceDate } from './invoice-display.util';
import { formatQuoteMoney } from './quote-display.util';

@Component({
  selector: 'app-invoice-document',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section
      class="overflow-hidden rounded-xl border border-border/70 bg-white shadow-sm dark:border-white/10 dark:bg-card"
    >
      <div class="border-b border-blue-600/20 bg-gradient-to-r from-blue-700 to-blue-600 px-6 py-5 text-white">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1 space-y-1">
            <p class="text-lg font-semibold">{{ businessName() }}</p>
            <p class="text-sm text-white/80">Tax invoice</p>
          </div>
          <div class="space-y-1 text-sm lg:max-w-sm lg:text-right">
            @if (businessContactEmail()) {
              <p>{{ businessContactEmail() }}</p>
            }
          </div>
        </div>
      </div>

      <div class="space-y-6 p-6">
        <div class="grid gap-4 lg:grid-cols-2">
          <div class="space-y-3 text-sm">
            <div class="grid grid-cols-[5rem_1fr] items-center gap-2">
              <span class="font-medium text-muted-foreground">Invoice:</span>
              <span class="font-mono font-medium text-foreground">{{ invoice().invoiceNumber }}</span>
            </div>
            <div class="grid grid-cols-[5rem_1fr] items-center gap-2">
              <span class="font-medium text-muted-foreground">Issued:</span>
              <span>{{ formatDate(invoice().createdAt) }}</span>
            </div>
            <div class="grid grid-cols-[5rem_1fr] items-center gap-2">
              <span class="font-medium text-muted-foreground">Due:</span>
              <span>{{ formatDate(invoice().dueDate) }}</span>
            </div>
            @if (invoice().paidAt) {
              <div class="grid grid-cols-[5rem_1fr] items-center gap-2">
                <span class="font-medium text-muted-foreground">Paid:</span>
                <span>{{ formatDate(invoice().paidAt!) }}</span>
              </div>
            }
          </div>

          <div class="rounded-lg border border-amber-200/80 bg-amber-50/50 p-3 text-sm dark:border-amber-500/20 dark:bg-amber-500/5">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bill to</p>
            <p class="mt-2 font-semibold text-foreground">{{ billToCompanyName() }}</p>
            @if (client()?.contactName) {
              <p class="text-muted-foreground">{{ client()?.contactName }}</p>
            }
            @if (client()?.email) {
              <p class="text-muted-foreground">{{ client()?.email }}</p>
            }
            @if (client()?.phone) {
              <p class="text-muted-foreground">{{ client()?.phone }}</p>
            }
          </div>
        </div>

        <div class="overflow-x-auto rounded-lg border border-border/70">
          <table class="w-full min-w-[640px] border-collapse text-sm">
            <thead>
              <tr
                class="border-b border-border/70 bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground"
              >
                <th class="px-3 py-2.5 font-semibold">#</th>
                <th class="px-3 py-2.5 font-semibold">Description</th>
                <th class="px-3 py-2.5 font-semibold text-right">Qty</th>
                <th class="px-3 py-2.5 font-semibold text-right">Unit price {{ invoice().currency }}</th>
                @if (hasLineTax()) {
                  <th class="px-3 py-2.5 font-semibold text-right">Tax %</th>
                }
                <th class="px-3 py-2.5 font-semibold text-right">Amount {{ invoice().currency }}</th>
              </tr>
            </thead>
            <tbody>
              @for (item of invoice().lineItems; track item.description; let index = $index) {
                <tr class="border-b border-border/50 last:border-b-0">
                  <td class="px-3 py-3 text-muted-foreground">{{ index + 1 }}</td>
                  <td class="px-3 py-3 font-medium text-foreground">{{ item.description }}</td>
                  <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">
                    {{ item.quantity }}
                  </td>
                  <td class="px-3 py-3 text-right tabular-nums">
                    {{ formatMoney(item.unitPrice) }}
                  </td>
                  @if (hasLineTax()) {
                    <td class="px-3 py-3 text-right tabular-nums text-muted-foreground">
                      {{ item.taxRate }}%
                    </td>
                  }
                  <td class="px-3 py-3 text-right font-medium tabular-nums">
                    {{ formatMoney(item.amount) }}
                  </td>
                </tr>
              } @empty {
                <tr>
                  <td colspan="6" class="px-3 py-6 text-center text-sm text-muted-foreground">
                    No line items on this invoice.
                  </td>
                </tr>
              }
            </tbody>
            <tfoot>
              <tr class="border-t border-border/70 bg-muted/20">
                <td
                  [attr.colspan]="hasLineTax() ? 5 : 4"
                  class="px-3 py-2.5 text-right text-sm text-muted-foreground"
                >
                  Subtotal
                </td>
                <td class="px-3 py-2.5 text-right text-sm tabular-nums font-medium">
                  {{ formatMoney(invoice().subtotal) }}
                </td>
              </tr>
              @if (invoice().taxAmount > 0) {
                <tr class="bg-muted/20">
                  <td
                    [attr.colspan]="hasLineTax() ? 5 : 4"
                    class="px-3 py-2.5 text-right text-sm text-muted-foreground"
                  >
                    Tax
                  </td>
                  <td class="px-3 py-2.5 text-right text-sm tabular-nums font-medium">
                    {{ formatMoney(invoice().taxAmount) }}
                  </td>
                </tr>
              }
              <tr class="bg-muted/30">
                <td
                  [attr.colspan]="hasLineTax() ? 5 : 4"
                  class="px-3 py-3 text-right text-sm font-semibold"
                >
                  Invoice total
                </td>
                <td class="px-3 py-3 text-right text-base font-bold tabular-nums text-foreground">
                  {{ formatMoney(invoice().total) }}
                </td>
              </tr>
              @if (invoice().amountPaid > 0) {
                <tr class="bg-muted/20">
                  <td
                    [attr.colspan]="hasLineTax() ? 5 : 4"
                    class="px-3 py-2.5 text-right text-sm text-muted-foreground"
                  >
                    Amount paid
                  </td>
                  <td class="px-3 py-2.5 text-right text-sm tabular-nums font-medium text-emerald-700 dark:text-emerald-400">
                    − {{ formatMoney(invoice().amountPaid) }}
                  </td>
                </tr>
                <tr class="bg-amber-50/50 dark:bg-amber-500/5">
                  <td
                    [attr.colspan]="hasLineTax() ? 5 : 4"
                    class="px-3 py-3 text-right text-sm font-semibold"
                  >
                    Outstanding
                  </td>
                  <td class="px-3 py-3 text-right text-base font-bold tabular-nums text-foreground">
                    {{ formatMoney(outstandingAmount()) }}
                  </td>
                </tr>
              }
            </tfoot>
          </table>
        </div>

        @if (invoice().notes) {
          <div class="rounded-lg border border-border/60 bg-muted/20 p-4 text-sm">
            <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Notes</p>
            <p class="mt-2 whitespace-pre-line text-foreground">{{ invoice().notes }}</p>
          </div>
        }
      </div>
    </section>
  `,
})
export class InvoiceDocumentComponent {
  private readonly userSession = inject(UserSessionService);

  readonly invoice = input.required<InvoiceDetail>();
  readonly client = input<ClientDetail | null>(null);

  protected readonly formatDate = formatInvoiceDate;

  protected businessName(): string {
    return 'Your Company';
  }

  protected businessContactEmail(): string | null {
    return this.userSession.getUser()?.email ?? null;
  }

  protected billToCompanyName(): string {
    const invoice = this.invoice();
    return this.client()?.companyName?.trim()
      || invoice.clientCompanyName?.trim()
      || 'Client';
  }

  protected hasLineTax(): boolean {
    return this.invoice().lineItems.some((item) => item.taxRate > 0);
  }

  protected outstandingAmount(): number {
    const invoice = this.invoice();
    return Math.max(0, invoice.total - invoice.amountPaid);
  }

  protected formatMoney(value: number): string {
    return formatQuoteMoney(value, this.invoice().currency);
  }
}
