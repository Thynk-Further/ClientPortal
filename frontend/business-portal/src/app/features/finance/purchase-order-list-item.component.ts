import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PurchaseOrderSummary } from '@/app/core/api/services/purchase-order-api.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  formatPurchaseOrderDate,
  purchaseOrderStatusAccentClass,
  purchaseOrderStatusLabel,
} from './purchase-order-display.util';
import { formatQuoteMoney } from './quote-display.util';

@Component({
  selector: 'app-purchase-order-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <a
      class="group block overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-border hover:shadow-md dark:border-white/10"
      [routerLink]="['/finance/purchase-orders', po().id]"
      [queryParams]="{ clientId: po().clientId }"
    >
      <div class="flex">
        <div
          class="w-1 shrink-0 self-stretch"
          [class]="purchaseOrderStatusAccentClass(po().status)"
          aria-hidden="true"
        ></div>

        <div class="min-w-0 flex-1 p-4">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-semibold tracking-tight text-foreground">
                {{ displayTitle() }}
              </h3>
              <p class="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {{ po().poNumber }}
              </p>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <ui-status-badge [status]="purchaseOrderStatusLabel(po().status)" />
              <svg
                class="hidden h-4 w-4 text-muted-foreground/50 transition-all group-hover:translate-x-0.5 group-hover:text-primary sm:block"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="m9 18 6-6-6-6"
                />
              </svg>
            </div>
          </div>

          <dl class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
            @if (po().clientCompanyName) {
              <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Client
                </dt>
                <dd class="mt-1 flex items-center gap-1.5 truncate text-sm font-medium text-foreground">
                  <svg
                    class="h-3.5 w-3.5 shrink-0 text-muted-foreground"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                      d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
                    />
                  </svg>
                  <span class="truncate">{{ po().clientCompanyName }}</span>
                </dd>
              </div>
            }

            <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
              <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                RFQ no.
              </dt>
              <dd class="mt-1 truncate font-mono text-sm font-medium text-foreground">
                {{ po().rfqNumber ?? '—' }}
              </dd>
            </div>

            <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
              <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Created
              </dt>
              <dd class="mt-1 text-sm font-semibold leading-snug text-foreground">
                {{ formatPurchaseOrderDate(po().createdAt) }}
              </dd>
            </div>

            <div class="rounded-lg border border-emerald-200/80 bg-emerald-50/50 px-3 py-2.5 dark:border-emerald-500/20 dark:bg-emerald-500/5">
              <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Order total
              </dt>
              <dd class="mt-1 text-sm font-semibold tabular-nums text-foreground">
                {{ formatTotal() }}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </a>
  `,
})
export class PurchaseOrderListItemComponent {
  readonly po = input.required<PurchaseOrderSummary>();

  protected readonly purchaseOrderStatusLabel = purchaseOrderStatusLabel;
  protected readonly purchaseOrderStatusAccentClass = purchaseOrderStatusAccentClass;
  protected readonly formatPurchaseOrderDate = formatPurchaseOrderDate;

  protected displayTitle(): string {
    const title = this.po().rfqTitle?.trim();
    return title === '' || title === undefined ? this.po().poNumber : title;
  }

  protected formatTotal(): string {
    return formatQuoteMoney(this.po().total, this.po().currency);
  }
}
