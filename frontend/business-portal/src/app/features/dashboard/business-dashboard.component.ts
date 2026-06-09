import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  computed,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { ClientStore } from '@/app/core/stores/client.store';
import { ClientWorkspaceComponent } from '../clients/client-workspace.component';
import { ClientsListComponent } from '../clients/clients-list.component';

interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly trendValue: string;
  readonly trendLabel: string;
  readonly trendDirection: 'up' | 'down';
  readonly iconPath: string;
}

interface RevenuePoint {
  readonly month: string;
  readonly value: number;
}

interface TrafficSource {
  readonly name: string;
  readonly percent: number;
  readonly color: string;
}

interface RecentActivityItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly timestamp: string;
}

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClientsListComponent, ClientWorkspaceComponent],
  template: `
    <div class="flex min-w-0 flex-1 flex-col">
          <header class="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">{{ pageTitle() }}</h1>
              <p class="text-sm text-muted-foreground">{{ pageDescription() }}</p>
            </div>

            <div class="flex items-center gap-2">
              <button
                type="button"
                class="grid h-9 w-9 place-content-center rounded-full border bg-background hover:bg-muted"
                (click)="toggleTheme()"
                [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
              >
                @if (isDark()) {
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
                    />
                  </svg>
                } @else {
                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M21 12.79A9 9 0 1 1 11.21 3c-.03.22-.05.44-.05.67A7.33 7.33 0 0 0 18.33 11c.23 0 .45-.02.67-.05Z"
                    />
                  </svg>
                }
              </button>

              <button
                type="button"
                class="relative grid h-9 w-9 place-content-center rounded-full border bg-background hover:bg-muted"
                aria-label="Open notifications"
              >
                <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                    d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
                  />
                </svg>
                <span class="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"></span>
              </button>

            </div>
          </header>

          @if (activeView() === 'client-list') {
            <app-clients-list />
          } @else if (activeView() === 'client-workspace') {
            <app-client-workspace />
          } @else {
            <main class="space-y-6 p-4 sm:p-6">
              <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary metrics">
                @for (stat of stats; track stat.label) {
                  <article class="rounded-xl border bg-card p-4 shadow-sm">
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="text-sm text-muted-foreground">{{ stat.label }}</p>
                        <p class="mt-2 text-3xl font-semibold">{{ stat.value }}</p>
                        <p class="mt-2 text-sm" [class.text-emerald-600]="stat.trendDirection === 'up'" [class.text-red-600]="stat.trendDirection === 'down'">
                          {{ stat.trendDirection === 'up' ? '+' : '-' }}{{ stat.trendValue }}
                          <span class="text-muted-foreground">{{ stat.trendLabel }}</span>
                        </p>
                      </div>
                      <span class="grid h-10 w-10 place-content-center rounded-lg bg-muted text-muted-foreground">
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          <path
                            [attr.d]="stat.iconPath"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="2"
                          />
                        </svg>
                      </span>
                    </div>
                  </article>
                }
              </section>

              <section class="grid grid-cols-1 gap-6 xl:grid-cols-[2fr_1fr]">
                <article class="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                  <div class="mb-4 flex items-center justify-between gap-2">
                    <div>
                      <h2 class="font-semibold">Overview</h2>
                      <p class="text-sm text-muted-foreground">Monthly revenue performance for the current year.</p>
                    </div>
                  </div>

                  <div class="rounded-lg bg-gradient-to-b from-orange-100/80 to-transparent p-4 dark:from-orange-950/20">
                    <svg class="h-60 w-full" viewBox="0 0 640 240" preserveAspectRatio="none">
                      <polyline
                        points="0,210 58,198 116,203 174,170 232,160 290,172 348,148 406,138 464,126 522,132 580,116 638,102"
                        fill="none"
                        stroke="var(--color-chart-1)"
                        stroke-width="4"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      />
                    </svg>
                  </div>

                  <div class="mt-3 grid grid-cols-6 gap-1 text-center text-xs text-muted-foreground">
                    @for (point of revenueSeries; track point.month) {
                      <span>{{ point.month }}</span>
                    }
                  </div>
                </article>

                <div class="space-y-6">
                  <article class="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                    <h2 class="font-semibold">Traffic Sources</h2>
                    <p class="text-sm text-muted-foreground">Where your visitors come from.</p>

                    <div class="mt-4 flex items-center gap-4">
                      <div class="relative h-32 w-32 rounded-full" [style.background]="trafficGradient()">
                        <div class="absolute inset-5 grid place-content-center rounded-full bg-card text-center">
                          <span class="text-2xl font-semibold">284K</span>
                          <span class="text-xs text-muted-foreground">visits</span>
                        </div>
                      </div>

                      <ul class="space-y-2 text-sm">
                        @for (source of trafficSources; track source.name) {
                          <li class="flex items-center justify-between gap-6">
                            <span class="flex items-center gap-2">
                              <span class="h-2.5 w-2.5 rounded-full" [style.background]="source.color"></span>
                              {{ source.name }}
                            </span>
                            <strong>{{ source.percent }}%</strong>
                          </li>
                        }
                      </ul>
                    </div>
                  </article>

                  <article class="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                    <h2 class="font-semibold">Monthly Goals</h2>
                    <p class="text-sm text-muted-foreground">Track progress toward target KPIs.</p>

                    <div class="mt-4 space-y-4">
                      <div>
                        <div class="mb-1 flex items-center justify-between text-sm">
                          <span class="font-medium">Revenue target</span>
                          <span>{{ monthlyGoalProgress }}%</span>
                        </div>
                        <div class="h-2 rounded-full bg-muted">
                          <div class="h-2 rounded-full bg-chart-1" [style.width.%]="monthlyGoalProgress"></div>
                        </div>
                      </div>
                    </div>
                  </article>
                </div>
              </section>

              <section class="rounded-xl border bg-card p-4 shadow-sm sm:p-6">
                <h2 class="font-semibold">Recent Activity</h2>
                <p class="text-sm text-muted-foreground">Latest operational updates across clients and finance.</p>

                <ul class="mt-4 space-y-3">
                  @for (item of recentActivity; track item.id) {
                    <li class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                      <div class="space-y-1">
                        <p class="font-medium">{{ item.title }}</p>
                        <p class="text-sm text-muted-foreground">{{ item.description }}</p>
                      </div>

                      <div class="flex items-center gap-3">
                        <span class="text-xs text-muted-foreground">{{ item.timestamp }}</span>
                        <span
                          class="rounded-full px-2.5 py-1 text-xs font-medium"
                          [class.bg-emerald-100]="item.status === 'Paid' || item.status === 'Approved'"
                          [class.text-emerald-700]="item.status === 'Paid' || item.status === 'Approved'"
                          [class.bg-sky-100]="item.status === 'Sent'"
                          [class.text-sky-700]="item.status === 'Sent'"
                          [class.bg-amber-100]="item.status === 'Pending'"
                          [class.text-amber-700]="item.status === 'Pending'"
                        >
                          {{ item.status }}
                        </span>
                      </div>
                    </li>
                  }
                </ul>
              </section>
            </main>
          }
    </div>
  `,
})
export class BusinessDashboardComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly clientStore = inject(ClientStore);
  private readonly storageKey = 'business-portal-theme';
  protected readonly activeView = signal<'dashboard' | 'client-list' | 'client-workspace'>(
    'dashboard',
  );
  protected readonly isDark = signal(false);
  protected readonly monthlyGoalProgress = 88;

  constructor() {
    const initialView = this.route.snapshot.data['initialView'] as
      | 'dashboard'
      | 'client-list'
      | 'client-workspace'
      | undefined;
    if (initialView !== undefined) {
      this.activeView.set(initialView);
    }

    this.initializeTheme();
  }

  ngOnInit(): void {
    if (this.activeView() === 'client-list') {
      void this.refreshClientCount();
    }
  }

  protected readonly pageTitle = computed(() => {
    switch (this.activeView()) {
      case 'client-list':
        return 'Clients';
      case 'client-workspace':
        return 'Client Workspace';
      default:
        return 'Dashboard';
    }
  });

  protected readonly pageDescription = computed(() => {
    switch (this.activeView()) {
      case 'client-list':
        return 'Manage client folders, onboarding, and relationships.';
      case 'client-workspace':
        return 'Work across client folders from one operational view.';
      default:
        return 'Welcome back. Here is your business snapshot.';
    }
  });

  protected readonly stats: ReadonlyArray<DashboardStat> = [
    {
      label: 'Total Revenue',
      value: '$48,295',
      trendValue: '12.5%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
    },
    {
      label: 'Active Users',
      value: '2,847',
      trendValue: '8.2%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
    },
    {
      label: 'Total Orders',
      value: '1,432',
      trendValue: '3.1%',
      trendLabel: 'vs last month',
      trendDirection: 'down',
      iconPath: 'M6 6h15l-1.4 7H8M6 6 5 3H2m6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Zm9 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z',
    },
    {
      label: 'Page Views',
      value: '284K',
      trendValue: '24.7%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
      iconPath: 'M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z',
    },
  ];

  protected readonly revenueSeries: ReadonlyArray<RevenuePoint> = [
    { month: 'Jan', value: 16 },
    { month: 'Feb', value: 18 },
    { month: 'Mar', value: 17 },
    { month: 'Apr', value: 24 },
    { month: 'May', value: 26 },
    { month: 'Jun', value: 23 },
  ];

  protected readonly trafficSources: ReadonlyArray<TrafficSource> = [
    { name: 'Direct', percent: 35, color: '#f97316' },
    { name: 'Organic', percent: 28, color: '#14b8a6' },
    { name: 'Referral', percent: 22, color: '#0f766e' },
    { name: 'Social', percent: 15, color: '#f59e0b' },
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

  protected readonly recentActivity: ReadonlyArray<RecentActivityItem> = [
    {
      id: 'activity-1',
      title: 'Invoice INV-2026-041 marked as paid',
      description: 'Contoso Architects settled a $2,400 invoice.',
      status: 'Paid',
      timestamp: '10 minutes ago',
    },
    {
      id: 'activity-2',
      title: 'Project kickoff meeting confirmed',
      description: 'Northwind Retail kickoff moved to Monday 09:00.',
      status: 'Approved',
      timestamp: '35 minutes ago',
    },
    {
      id: 'activity-3',
      title: 'Payment reminder sent',
      description: 'Reminder issued for two invoices due in 3 days.',
      status: 'Sent',
      timestamp: '1 hour ago',
    },
    {
      id: 'activity-4',
      title: 'Contract renewal at risk',
      description: 'Fabrikam account flagged because of pending legal review.',
      status: 'Pending',
      timestamp: '2 hours ago',
    },
  ];

  protected toggleTheme(): void {
    const nextValue = !this.isDark();
    this.isDark.set(nextValue);
    this.applyTheme(nextValue);
  }

  private async refreshClientCount(): Promise<void> {
    await this.clientStore.loadClients({ page: 1, pageSize: 1 });
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedTheme = window.localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    this.isDark.set(shouldUseDark);
    this.applyTheme(shouldUseDark);
  }

  private applyTheme(useDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.classList.toggle('dark', useDark);
    window.localStorage.setItem(this.storageKey, useDark ? 'dark' : 'light');
  }
}
