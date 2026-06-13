import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { RfqApiService, RfqSummary } from '@/app/core/api/services/rfq-api.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';

interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly trendValue: string;
  readonly trendLabel: string;
  readonly trendDirection: 'up' | 'down';
  readonly iconPath: string;
  readonly accentColor: string;
  readonly accentBg: string;
  readonly sparkline: ReadonlyArray<number>;
}

interface TrafficSource {
  readonly name: string;
  readonly percent: number;
  readonly color: string;
}

type OverviewMetric = 'revenue' | 'orders' | 'profit';

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <div class="flex min-w-0 flex-1 flex-col">
        <main class="space-y-6 p-5 sm:p-8">
          <header class="space-y-1">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Dashboard</h1>
            <p class="text-sm text-muted-foreground">{{ welcomeMessage() }}</p>
          </header>

          <section class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6" aria-label="Incoming RFQs">
            <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-base font-semibold">Incoming RFQs</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">
                  Client-submitted requests waiting for your quotation.
                </p>
              </div>
              <a
                routerLink="/finance/rfqs"
                class="text-sm font-medium text-primary hover:underline"
              >
                View all RFQs
              </a>
            </div>

            @if (isLoadingRfqs()) {
              <p class="text-sm text-muted-foreground">Loading submitted RFQs...</p>
            } @else if (submittedRfqs().length === 0) {
              <p class="text-sm text-muted-foreground">
                No submitted RFQs right now. New requests appear here when clients submit them from the client portal.
              </p>
            } @else {
              <div class="space-y-2">
                @for (rfq of submittedRfqs(); track rfq.id) {
                  <a
                    class="flex items-center justify-between gap-4 rounded-lg border border-border/70 p-3 transition-colors hover:bg-muted/50"
                    [routerLink]="['/finance/rfqs', rfq.id]"
                    [queryParams]="{ clientId: rfq.clientId }"
                  >
                    <div class="min-w-0">
                      <p class="font-medium text-foreground">{{ rfq.rfqNumber }}</p>
                      <p class="truncate text-xs text-muted-foreground">
                        {{ rfq.clientCompanyName || 'Client' }} · Submitted
                      </p>
                    </div>
                    <span class="shrink-0 text-xs text-muted-foreground">{{ rfq.currency }}</span>
                  </a>
                }
              </div>
            }
          </section>

          <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary metrics">
            @for (stat of stats; track stat.label) {
              <article class="overflow-hidden rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
                <div class="flex items-start justify-between gap-3">
                  <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
                  <span
                    class="grid h-9 w-9 place-content-center rounded-full"
                    [style.background-color]="stat.accentBg"
                    [style.color]="stat.accentColor"
                  >
                    <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <path
                        [attr.d]="stat.iconPath"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                      />
                    </svg>
                  </span>
                </div>

                <p class="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight">{{ stat.value }}</p>

                <svg class="mt-4 h-10 w-full" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
                  <polyline
                    [attr.points]="sparklinePoints(stat.sparkline)"
                    fill="none"
                    [attr.stroke]="stat.accentColor"
                    stroke-width="2"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <p
                  class="mt-2 text-xs font-medium"
                  [class.text-emerald-600]="stat.trendDirection === 'up'"
                  [class.text-red-500]="stat.trendDirection === 'down'"
                >
                  {{ stat.trendDirection === 'up' ? '+' : '-' }}{{ stat.trendValue }}
                  <span class="font-normal text-muted-foreground">{{ stat.trendLabel }}</span>
                </p>
              </article>
            }
          </section>

          <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.65fr_1fr]">
            <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
              <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 class="text-base font-semibold">Overview</h2>
                  <p class="mt-0.5 text-sm text-muted-foreground">Monthly performance for the current year.</p>
                </div>

                <div class="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
                  @for (tab of overviewTabs; track tab.id) {
                    <button
                      type="button"
                      class="rounded-md px-3 py-1.5 text-xs font-medium transition-colors"
                      [class.bg-background]="overviewMetric() === tab.id"
                      [class.text-foreground]="overviewMetric() === tab.id"
                      [class.shadow-sm]="overviewMetric() === tab.id"
                      [class.text-muted-foreground]="overviewMetric() !== tab.id"
                      (click)="overviewMetric.set(tab.id)"
                    >
                      {{ tab.label }}
                    </button>
                  }
                </div>
              </div>

              <div class="relative">
                <div class="absolute left-0 top-0 flex h-[220px] flex-col justify-between py-2 text-[11px] text-muted-foreground">
                  @for (label of yAxisLabels; track label) {
                    <span>{{ label }}</span>
                  }
                </div>

                <svg class="ml-8 h-[220px] w-[calc(100%-2rem)]" viewBox="0 0 640 220" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="overviewFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stop-color="#f97316" stop-opacity="0.22" />
                      <stop offset="100%" stop-color="#f97316" stop-opacity="0" />
                    </linearGradient>
                  </defs>

                  @for (gridY of chartGridLines(); track gridY) {
                    <line
                      x1="0"
                      [attr.y1]="gridY"
                      x2="640"
                      [attr.y2]="gridY"
                      stroke="currentColor"
                      stroke-opacity="0.08"
                    />
                  }

                  <polygon [attr.points]="overviewChart().areaPoints" fill="url(#overviewFill)" />
                  <polyline
                    [attr.points]="overviewChart().linePoints"
                    fill="none"
                    stroke="#f97316"
                    stroke-width="3"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                  />
                </svg>

                <div class="ml-8 mt-2 grid grid-cols-12 gap-1 text-center text-[11px] text-muted-foreground">
                  @for (month of chartMonths; track month) {
                    <span>{{ month }}</span>
                  }
                </div>
              </div>
            </article>

            <div class="space-y-6">
              <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                <h2 class="text-base font-semibold">Traffic Sources</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Where your visitors come from.</p>

                <div class="mt-5 flex items-center gap-5">
                  <div class="relative h-36 w-36 shrink-0 rounded-full" [style.background]="trafficGradient()">
                    <div class="absolute inset-[18%] grid place-content-center rounded-full bg-card text-center">
                      <span class="text-xl font-semibold leading-none">284K</span>
                      <span class="mt-0.5 text-[11px] text-muted-foreground">Visits</span>
                    </div>
                  </div>

                  <ul class="min-w-0 flex-1 space-y-2.5 text-sm">
                    @for (source of trafficSources; track source.name) {
                      <li class="flex items-center justify-between gap-4">
                        <span class="flex min-w-0 items-center gap-2 text-muted-foreground">
                          <span class="h-2 w-2 shrink-0 rounded-full" [style.background]="source.color"></span>
                          <span class="truncate">{{ source.name }}</span>
                        </span>
                        <span class="font-semibold text-foreground">{{ source.percent }}%</span>
                      </li>
                    }
                  </ul>
                </div>
              </article>

              <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
                <h2 class="text-base font-semibold">Monthly Goals</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Track progress toward target KPIs.</p>

                <div class="mt-5 space-y-2">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-foreground">Monthly Revenue</span>
                    <span class="font-semibold text-foreground">{{ monthlyGoalProgress }}%</span>
                  </div>

                  <div class="h-2 overflow-hidden rounded-full bg-orange-100">
                    <div
                      class="h-full rounded-full bg-orange-500 transition-all"
                      [style.width.%]="monthlyGoalProgress"
                    ></div>
                  </div>

                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span class="font-medium text-foreground">$48,295</span>
                    <span>Target: $55,000</span>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </main>
    </div>
  `,
})
export class BusinessDashboardComponent implements OnInit {
  private readonly userSession = inject(UserSessionService);
  private readonly rfqApi = inject(RfqApiService);

  protected readonly submittedRfqs = signal<RfqSummary[]>([]);
  protected readonly isLoadingRfqs = signal(true);

  protected readonly overviewMetric = signal<OverviewMetric>('revenue');
  protected readonly monthlyGoalProgress = 88;

  protected readonly chartMonths = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ] as const;

  protected readonly yAxisLabels = ['$60k', '$45k', '$30k', '$15k', '$0k'] as const;

  protected readonly overviewTabs: ReadonlyArray<{ id: OverviewMetric; label: string }> = [
    { id: 'revenue', label: 'Revenue' },
    { id: 'orders', label: 'Orders' },
    { id: 'profit', label: 'Profit' },
  ];

  private readonly overviewDatasets: Record<OverviewMetric, ReadonlyArray<number>> = {
    revenue: [22, 28, 24, 35, 38, 34, 42, 45, 41, 48, 52, 55],
    orders: [12, 15, 14, 18, 20, 19, 22, 24, 23, 26, 28, 30],
    profit: [8, 10, 9, 14, 15, 13, 17, 18, 16, 19, 21, 22],
  };

  protected readonly welcomeMessage = computed(() => {
    const fullName = this.userSession.getUser()?.fullName?.trim();
    const firstName = fullName?.split(/\s+/)[0] ?? 'there';
    return `Welcome back, ${firstName}. Here's what's happening with your business today.`;
  });

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.rfqApi.getRfqs(undefined, 2, 1, 5));
      this.submittedRfqs.set(result.items);
    } catch {
      this.submittedRfqs.set([]);
    } finally {
      this.isLoadingRfqs.set(false);
    }
  }

  protected readonly overviewChart = computed(() => {
    const data = this.overviewDatasets[this.overviewMetric()];
    const width = 640;
    const height = 220;
    const paddingLeft = 0;
    const paddingTop = 8;
    const paddingBottom = 8;
    const chartWidth = width - paddingLeft;
    const chartHeight = height - paddingTop - paddingBottom;
    const maxValue = 60;

    const coordinates = data.map((value, index) => {
      const x = paddingLeft + (index / (data.length - 1)) * chartWidth;
      const y = paddingTop + chartHeight - (value / maxValue) * chartHeight;
      return { x, y };
    });

    const linePoints = coordinates.map((point) => `${point.x},${point.y}`).join(' ');
    const baselineY = paddingTop + chartHeight;
    const areaPoints = [
      `${paddingLeft},${baselineY}`,
      linePoints,
      `${paddingLeft + chartWidth},${baselineY}`,
    ].join(' ');

    return { linePoints, areaPoints };
  });

  protected chartGridLines(): ReadonlyArray<number> {
    const height = 220;
    const paddingTop = 8;
    const paddingBottom = 8;
    const chartHeight = height - paddingTop - paddingBottom;

    return [0, 1, 2, 3, 4].map((step) => paddingTop + (step / 4) * chartHeight);
  }

  protected readonly stats: ReadonlyArray<DashboardStat> = [
    {
      label: 'Total Revenue',
      value: '$48,295',
      trendValue: '12.5%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
      accentColor: '#f97316',
      accentBg: '#ffedd5',
      sparkline: [18, 22, 20, 28, 26, 30, 34, 32, 38, 36, 42, 45],
    },
    {
      label: 'Active Users',
      value: '2,847',
      trendValue: '8.2%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
      accentColor: '#14b8a6',
      accentBg: '#ccfbf1',
      sparkline: [12, 14, 13, 16, 18, 17, 20, 22, 21, 24, 25, 27],
    },
    {
      label: 'Total Orders',
      value: '1,432',
      trendValue: '3.1%',
      trendLabel: 'vs last month',
      trendDirection: 'down',
      iconPath: 'M6 6h15l-1.4 7H8M6 6 5 3H2m6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
      accentColor: '#3b82f6',
      accentBg: '#dbeafe',
      sparkline: [20, 19, 18, 17, 16, 15, 14, 13, 12, 11, 10, 9],
    },
    {
      label: 'Page Views',
      value: '284K',
      trendValue: '24.7%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
      accentColor: '#eab308',
      accentBg: '#fef9c3',
      sparkline: [10, 12, 11, 15, 18, 17, 22, 24, 26, 28, 30, 33],
    },
  ];

  protected readonly trafficSources: ReadonlyArray<TrafficSource> = [
    { name: 'Direct', percent: 35, color: '#f97316' },
    { name: 'Organic', percent: 28, color: '#14b8a6' },
    { name: 'Referral', percent: 22, color: '#1d4ed8' },
    { name: 'Social', percent: 15, color: '#eab308' },
  ];

  protected readonly trafficGradient = computed(() => {
    const stops: string[] = [];
    let offset = 0;

    for (const source of this.trafficSources) {
      const nextOffset = offset + source.percent;
      stops.push(`${source.color} ${offset}% ${nextOffset}%`);
      offset = nextOffset;
    }

    return `conic-gradient(${stops.join(', ')})`;
  });

  protected sparklinePoints(values: ReadonlyArray<number>): string {
    if (values.length === 0) {
      return '';
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values
      .map((value, index) => {
        const x = (index / (values.length - 1)) * 100;
        const y = 22 - ((value - min) / range) * 18;
        return `${x},${y}`;
      })
      .join(' ');
  }

}
