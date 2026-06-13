import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  formatRfqDueDate,
  formatRfqDueTime,
  rfqDueUrgency,
  rfqDueUrgencyLabel,
  rfqStatusAccentClass,
  rfqStatusLabel,
} from './rfq-display.util';

@Component({
  selector: 'app-rfq-list-item',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent],
  template: `
    <a
      class="group block overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-border hover:shadow-md dark:border-white/10"
      [routerLink]="['/finance/rfqs', rfq().id]"
      [queryParams]="{ clientId: rfq().clientId }"
    >
      <div class="flex">
        <div
          class="w-1 shrink-0 self-stretch"
          [class]="rfqStatusAccentClass(rfq().status)"
          aria-hidden="true"
        ></div>

        <div class="min-w-0 flex-1 p-4">
          <div class="flex items-start gap-3">
            <div class="min-w-0 flex-1">
              <h3 class="truncate text-base font-semibold tracking-tight text-foreground">
                {{ displayTitle() }}
              </h3>
            </div>

            <div class="flex shrink-0 items-center gap-2">
              <ui-status-badge [status]="rfqStatusLabel(rfq().status)" />
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

          <dl
            class="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3"
          >
            @if (rfq().clientCompanyName) {
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
                  <span class="truncate">{{ rfq().clientCompanyName }}</span>
                </dd>
              </div>
            }

            <div class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
              <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                RFQ no.
              </dt>
              <dd class="mt-1 truncate font-mono text-sm font-medium text-foreground">
                {{ rfq().rfqNumber }}
              </dd>
            </div>

            <div
              class="rounded-lg border px-3 py-2.5"
              [class]="duePanelClass()"
            >
              <dt class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Quotation due
              </dt>
              <dd class="mt-1 text-sm font-semibold leading-snug text-foreground">
                {{ formatRfqDueDate(rfq().quotationDueAtUtc) }}
              </dd>
              <dd class="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                <span>{{ formatRfqDueTime(rfq().quotationDueAtUtc) }}</span>
                @if (dueUrgencyText()) {
                  <span aria-hidden="true">·</span>
                  <span [class]="dueUrgencyTextClass()">{{ dueUrgencyText() }}</span>
                }
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </a>
  `,
})
export class RfqListItemComponent {
  readonly rfq = input.required<RfqSummary>();

  protected readonly rfqStatusLabel = rfqStatusLabel;
  protected readonly rfqStatusAccentClass = rfqStatusAccentClass;
  protected readonly formatRfqDueDate = formatRfqDueDate;
  protected readonly formatRfqDueTime = formatRfqDueTime;

  protected displayTitle(): string {
    const title = this.rfq().title?.trim();
    return title === '' || title === undefined ? 'Untitled' : title;
  }

  protected dueUrgencyText(): string | null {
    return rfqDueUrgencyLabel(this.rfq().quotationDueAtUtc);
  }

  protected duePanelClass(): string {
    switch (rfqDueUrgency(this.rfq().quotationDueAtUtc)) {
      case 'overdue':
        return 'border-red-200/80 bg-red-50/80 dark:border-red-500/30 dark:bg-red-500/10';
      case 'soon':
        return 'border-amber-200/80 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-500/10';
      default:
        return 'border-border/50 bg-muted/20';
    }
  }

  protected dueUrgencyTextClass(): string {
    const urgency = rfqDueUrgency(this.rfq().quotationDueAtUtc);
    if (urgency === 'overdue') {
      return 'font-medium text-red-600 dark:text-red-400';
    }

    if (urgency === 'soon') {
      return 'font-medium text-amber-700 dark:text-amber-400';
    }

    return '';
  }
}
