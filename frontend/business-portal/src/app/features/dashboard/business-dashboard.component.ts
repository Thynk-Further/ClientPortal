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
import { UserAccountMenuComponent } from '@/app/core/layout/user-account-menu.component';
import { ClientInviteOnboardingComponent } from '../clients/client-invite-onboarding.component';
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

interface SidebarItem {
  readonly id: string;
  readonly label: string;
  readonly iconPath: string;
  readonly badgeCount?: number;
  readonly active?: boolean;
}

interface SidebarSection {
  readonly id: string;
  readonly label: string;
  readonly items: ReadonlyArray<SidebarItem>;
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
  imports: [ClientInviteOnboardingComponent, ClientsListComponent, ClientWorkspaceComponent, UserAccountMenuComponent],
  template: `
    <div class="min-h-screen bg-muted/30 text-foreground">
      <div class="flex min-h-screen">
        <aside
          class="flex min-h-screen flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-all duration-300"
          [class.w-64]="!sidebarCollapsed()"
          [class.w-20]="sidebarCollapsed()"
        >
          <div class="mb-6 flex items-center justify-between gap-2">
            <div class="flex items-center gap-2">
              <div class="grid h-9 w-9 place-content-center rounded-lg bg-primary text-primary-foreground">
                Z
              </div>
              @if (!sidebarCollapsed()) {
                <div>
                  <p class="text-sm font-semibold leading-4">Business Portal</p>
                  <p class="text-xs text-muted-foreground">Dashboard</p>
                </div>
              }
            </div>

            <button
              type="button"
              class="grid h-8 w-8 place-content-center rounded-md border bg-background hover:bg-muted"
              (click)="toggleSidebar()"
              [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
            >
              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>

          <nav class="flex-1 space-y-5" aria-label="Sidebar">
            @for (section of sidebarSections(); track section.id) {
              <div class="space-y-1.5">
                @if (!sidebarCollapsed()) {
                  <button
                    type="button"
                    class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted/50"
                    [attr.aria-label]="'Toggle ' + section.label + ' section'"
                    [attr.aria-expanded]="isSidebarSectionExpanded(section.id)"
                    (click)="toggleSidebarSection(section.id)"
                  >
                    <span class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                      {{ section.label }}
                    </span>
                    <svg
                      class="h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200"
                      [class.rotate-90]="isSidebarSectionExpanded(section.id)"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                    >
                      <path
                        d="m9 6 6 6-6 6"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="2"
                      />
                    </svg>
                  </button>
                }

                @if (sidebarCollapsed() || isSidebarSectionExpanded(section.id)) {
                  @for (item of section.items; track item.id) {
                    <a
                      href="#"
                      [attr.title]="sidebarCollapsed() ? item.label : null"
                      class="flex items-center rounded-lg px-3 py-2 text-sm transition-colors"
                      [class.bg-sidebar-accent]="isItemActive(item.id)"
                      [class.text-sidebar-accent-foreground]="isItemActive(item.id)"
                      [class.text-muted-foreground]="!isItemActive(item.id)"
                      [class.hover:bg-muted]="!isItemActive(item.id)"
                      (click)="onSidebarItemClick($event, item.id)"
                    >
                      <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path
                          [attr.d]="item.iconPath"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.8"
                        />
                      </svg>
                      @if (!sidebarCollapsed()) {
                        <span class="ml-3 flex-1">{{ item.label }}</span>
                        @if (item.badgeCount !== undefined) {
                          <span
                            class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold leading-4 text-foreground"
                          >
                            {{ item.badgeCount }}
                          </span>
                        }
                      }
                    </a>
                  }
                }
              </div>
            }
          </nav>

          <div class="mt-4 border-t border-sidebar-border pt-4">
            @if (sidebarCollapsed()) {
              <app-user-account-menu />
            } @else {
              <app-user-account-menu layout="sidebar" />
            }
          </div>
        </aside>

        <div class="flex min-w-0 flex-1 flex-col">
          <header class="flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Dashboard</h1>
              <p class="text-sm text-muted-foreground">Welcome back. Here is your business snapshot.</p>
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

              <app-user-account-menu />
            </div>
          </header>

          @if (activeView() === 'client-invite-onboard') {
            <app-client-invite-onboarding />
          } @else if (activeView() === 'client-list') {
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
      </div>
    </div>
  `,
})
export class BusinessDashboardComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly route = inject(ActivatedRoute);
  private readonly clientStore = inject(ClientStore);
  private readonly storageKey = 'business-portal-theme';
  protected readonly activeView = signal<
    'dashboard' | 'client-invite-onboard' | 'client-list' | 'client-workspace'
  >('dashboard');
  protected readonly sidebarCollapsed = signal(false);
  protected readonly expandedSidebarSections = signal<ReadonlySet<string>>(
    new Set([
      'overview',
      'clients',
      'projects',
      'finance',
      'documents',
      'communication',
      'reports',
      'settings',
    ]),
  );
  protected readonly isDark = signal(false);
  protected readonly monthlyGoalProgress = 88;

  constructor() {
    const initialView = this.route.snapshot.data['initialView'] as
      | 'dashboard'
      | 'client-invite-onboard'
      | 'client-list'
      | 'client-workspace'
      | undefined;
    if (initialView !== undefined) {
      this.activeView.set(initialView);
    }

    this.initializeTheme();
  }

  ngOnInit(): void {
    void this.refreshClientCount();
  }

  private readonly sidebarSectionDefinitions: ReadonlyArray<SidebarSection> = [
    {
      id: 'overview',
      label: 'Overview',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          active: true,
          iconPath: 'M3 12h8V3H3v9Zm0 9h8v-7H3v7Zm10 0h8V12h-8v9Zm0-18v7h8V3h-8Z',
        },
        {
          id: 'dashboard-analytics',
          label: 'Analytics',
          iconPath: 'M5 20V10m7 10V4m7 16v-7',
        },
      ],
    },
    {
      id: 'clients',
      label: 'Client Management',
      items: [
        {
          id: 'client-invite-onboard',
          label: 'Invite & Onboard',
          iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm5 8-3-3m0 0-3 3m3-3v6',
        },
        {
          id: 'client-list',
          label: 'Client List',
          iconPath: 'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 0-4-4H3m16-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9 11A4 4 0 1 0 9 3a4 4 0 0 0 0 8Z',
        },
        {
          id: 'client-workspace',
          label: 'Client Workspace',
          iconPath: 'M3 4h18v16H3V4Zm4 4h10M7 12h6',
        },
      ],
    },
    {
      id: 'projects',
      label: 'Project Management',
      items: [
        {
          id: 'project-list-detail',
          label: 'Projects',
          iconPath: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
        },
        {
          id: 'kanban-flow',
          label: 'Kanban',
          iconPath: 'M5 5v14M12 5v10M19 5v7',
        },
        {
          id: 'project-timeline',
          label: 'Milestones & Timeline',
          iconPath: 'M5 12h4m6 0h4M12 5v4m0 6v4M3 3h18v18H3V3Z',
        },
        {
          id: 'project-risk-status',
          label: 'Risk & Status',
          iconPath: 'M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.72 3h16.92a2 2 0 0 0 1.72-3L13.71 3.86a2 2 0 0 0-3.42 0Z',
        },
      ],
    },
    {
      id: 'finance',
      label: 'Finance',
      items: [
        {
          id: 'invoice-list-detail',
          label: 'Invoices',
          iconPath: 'M6 2h9l5 5v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 1v5h5',
        },
        {
          id: 'invoice-wizard',
          label: 'Invoice Wizard',
          iconPath: 'M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
        },
        {
          id: 'quote-builder',
          label: 'Quotes',
          iconPath: 'M4 4h16v16H4V4Zm4 4h8M8 12h8M8 16h5',
        },
        {
          id: 'overdue-reminders',
          label: 'Overdue & Reminders',
          iconPath: 'M12 8v5l3 3M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
        },
        {
          id: 'financial-summary',
          label: 'Financial Summary',
          iconPath: 'M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Zm0 3h18',
        },
      ],
    },
    {
      id: 'documents',
      label: 'Documents & Contracts',
      items: [
        {
          id: 'document-library',
          label: 'Document Library',
          iconPath: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 0v6h6',
        },
        {
          id: 'contracts-signing',
          label: 'Contracts & E-Sign',
          iconPath: 'M8 2h8m-9 4h10M7 10h10M7 14h10M7 18h6M5 2h14a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Z',
        },
        {
          id: 'contract-expiry',
          label: 'Expiry Tracking',
          iconPath: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
        },
      ],
    },
    {
      id: 'communication',
      label: 'Communication & Meetings',
      items: [
        {
          id: 'messages-inbox',
          label: 'Inbox & Threads',
          iconPath: 'M21 11.5a8.5 8.5 0 0 1-8.5 8.5 8.4 8.4 0 0 1-3.5-.8L3 21l1.8-5.3A8.5 8.5 0 1 1 21 11.5Z',
        },
        {
          id: 'notices-manager',
          label: 'Notices',
          iconPath: 'M19 8A7 7 0 1 0 5 8c0 7-3 9-3 9h20s-3-2-3-9ZM10.73 21a2 2 0 0 0 3.54 0',
        },
        {
          id: 'meetings-calendar',
          label: 'Meetings Calendar',
          iconPath: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
        },
      ],
    },
    {
      id: 'reports',
      label: 'Reports',
      items: [
        {
          id: 'financial-reports',
          label: 'Financial Reports',
          iconPath: 'M4 19h16M7 16V8m5 8V5m5 11v-6',
        },
        {
          id: 'project-reports',
          label: 'Project Status Reports',
          iconPath: 'M3 3h18v18H3V3Zm4 12 3-3 2 2 5-5',
        },
        {
          id: 'client-activity-reports',
          label: 'Client Activity Reports',
          iconPath: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2m15-10a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z',
        },
        {
          id: 'exports',
          label: 'Exports',
          iconPath: 'M12 3v12m0 0 4-4m-4 4-4-4M5 21h14',
        },
      ],
    },
    {
      id: 'settings',
      label: 'Settings & Branding',
      items: [
        {
          id: 'company-branding',
          label: 'Company Branding',
          iconPath: 'M12 3 3 8l9 5 9-5-9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5',
        },
        {
          id: 'team-users',
          label: 'Team & Users',
          iconPath: 'M17 21v-2a4 4 0 0 0-3-3.87M9 21v-2a4 4 0 0 0-4-4H3m16-4a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM9 11A4 4 0 1 0 9 3a4 4 0 0 0 0 8Z',
        },
        {
          id: 'notification-preferences',
          label: 'Notification Preferences',
          iconPath: 'M19 8A7 7 0 1 0 5 8c0 7-3 9-3 9h20s-3-2-3-9Z',
        },
        {
          id: 'tax-currency',
          label: 'Tax & Currency',
          iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
        },
        {
          id: 'tenant-runtime-config',
          label: 'Tenant Branding Runtime',
          iconPath: 'M4 4h16v16H4V4Zm3 3h4v4H7V7Zm6 0h4v10h-4V7ZM7 13h4v4H7v-4Z',
        },
      ],
    },
  ];

  protected readonly sidebarSections = computed<ReadonlyArray<SidebarSection>>(() => {
    const clientCount = this.clientStore.totalCount();

    return this.sidebarSectionDefinitions.map((section) => {
      if (section.id !== 'clients') {
        return section;
      }

      return {
        ...section,
        items: section.items.map((item) =>
          item.id === 'client-list' ? { ...item, badgeCount: clientCount } : item,
        ),
      };
    });
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

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
  }

  protected toggleSidebarSection(sectionId: string): void {
    this.expandedSidebarSections.update((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }

  protected isSidebarSectionExpanded(sectionId: string): boolean {
    return this.expandedSidebarSections().has(sectionId);
  }

  protected toggleTheme(): void {
    const nextValue = !this.isDark();
    this.isDark.set(nextValue);
    this.applyTheme(nextValue);
  }

  protected onSidebarItemClick(event: Event, itemId: string): void {
    if (
      itemId !== 'dashboard'
      && itemId !== 'client-invite-onboard'
      && itemId !== 'client-list'
      && itemId !== 'client-workspace'
    ) {
      return;
    }

    event.preventDefault();
    this.activeView.set(itemId as 'dashboard' | 'client-invite-onboard' | 'client-list' | 'client-workspace');

    if (itemId === 'client-list' || itemId === 'client-invite-onboard' || itemId === 'client-workspace') {
      void this.refreshClientCount();
    }
  }

  private async refreshClientCount(): Promise<void> {
    await this.clientStore.loadClients({ page: 1, pageSize: 1 });
  }

  protected isItemActive(itemId: string): boolean {
    return this.activeView() === itemId;
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
