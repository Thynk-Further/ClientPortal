import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  formatRfqLongDate,
  rfqActivityVerb,
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
      class="group block overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-colors hover:bg-muted/30 dark:border-white/10"
      [routerLink]="['/finance/rfqs', rfq().id]"
      [queryParams]="{ clientId: rfq().clientId }"
    >
      <div class="flex">
        <div
          class="w-1 shrink-0 self-stretch"
          [class]="rfqStatusAccentClass(rfq().status)"
        ></div>
        <div class="min-w-0 flex-1 p-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <p class="font-semibold leading-snug text-foreground">{{ rfq().rfqNumber }}</p>
              <p class="mt-1.5 inline-flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                <svg
                  class="h-3.5 w-3.5 shrink-0"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                  />
                </svg>
                @if (rfq().clientCompanyName) {
                  <span>{{ rfq().clientCompanyName }} ·</span>
                }
                <span>{{ rfqActivityVerb(rfq().status) }} {{ formatRfqLongDate(rfq().updatedAt) }}</span>
                <span class="text-muted-foreground/80">· {{ rfq().currency }}</span>
              </p>
            </div>
            <ui-status-badge [status]="rfqStatusLabel(rfq().status)" />
          </div>
        </div>
      </div>
    </a>
  `,
})
export class RfqListItemComponent {
  readonly rfq = input.required<RfqSummary>();

  protected readonly rfqStatusLabel = rfqStatusLabel;
  protected readonly rfqStatusAccentClass = rfqStatusAccentClass;
  protected readonly rfqActivityVerb = rfqActivityVerb;
  protected readonly formatRfqLongDate = formatRfqLongDate;
}
