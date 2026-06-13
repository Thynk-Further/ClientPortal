import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  ClientActivityItem,
  ClientWorkspace,
} from '@/app/core/api/services/client-api.service';
import { DocumentApiService, DocumentSummary } from '@/app/core/api/services/document-api.service';
import { InvoiceApiService, InvoiceSummary } from '@/app/core/api/services/invoice-api.service';
import { invoiceStatusLabel } from '@/app/features/finance/invoice-display.util';
import { BusinessPortalBreadcrumbService } from '@/app/core/layout/business-portal-breadcrumb.service';
import { ClientStore } from '@/app/core/stores/client.store';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { StatCardComponent } from '@/components/ui/stat-card.component';
import { ClientProjectsTabComponent } from './client-projects-tab.component';

type ClientDetailTab =
  | 'overview'
  | 'projects'
  | 'invoices'
  | 'documents'
  | 'messages'
  | 'requests';

interface TabDefinition {
  readonly key: ClientDetailTab;
  readonly label: string;
  readonly description: string;
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    StatCardComponent,
    ClientProjectsTabComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">
                {{ clientCompanyName() }}
              </h1>
              <p class="text-sm text-muted-foreground">
                @if (workspace() !== null) {
                  {{ workspace()!.client.contactName }} · {{ workspace()!.client.email }}
                } @else {
                  Loading client account context...
                }
              </p>
            </div>

            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/clients']"
            >
              Back to clients
            </a>
          </div>
        </header>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        <section class="rounded-xl border bg-card p-2" aria-label="Client detail tabs">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-6">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm transition-colors"
                [class]="tab.key === activeTab() ? activeTabClasses : inactiveTabClasses"
                (click)="setActiveTab(tab.key)"
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </section>

        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ activeTabDefinition().label }}</ui-card-title>
            <ui-card-description>{{ activeTabDefinition().description }}</ui-card-description>
          </ui-card-header>

          <ui-card-content>
            @if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading...</p>
            } @else if (workspace() === null) {
              <p class="text-sm text-muted-foreground">Client data is unavailable.</p>
            } @else {
              @switch (activeTab()) {
                @case ('overview') {
                  <div class="space-y-4">
                    <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      @for (stat of overviewStatCards(); track stat.label) {
                        <ui-stat-card
                          [label]="stat.label"
                          [value]="stat.value"
                          [iconPath]="stat.iconPath"
                          [accentColor]="stat.accentColor"
                          [accentBg]="stat.accentBg"
                          [sparkline]="stat.sparkline"
                          [trendValue]="stat.trendValue"
                          [trendLabel]="stat.trendLabel"
                          [trendDirection]="stat.trendDirection"
                          [footnote]="stat.footnote"
                        />
                      }
                    </div>

                    @if (workspace()!.attentionItems.length > 0) {
                      <ul class="space-y-2">
                        @for (item of workspace()!.attentionItems; track item.code) {
                          <li class="rounded-xl border border-border/70 bg-card p-4 text-sm shadow-sm dark:border-white/10">
                            <p class="font-medium text-foreground">{{ item.title }}</p>
                            <p class="mt-1 text-muted-foreground">{{ item.description }}</p>
                          </li>
                        }
                      </ul>
                    } @else {
                      <article class="rounded-xl border border-border/70 bg-muted/30 p-4 shadow-sm dark:border-white/10 dark:bg-muted/20">
                        <p class="font-medium text-foreground">All clear</p>
                        <p class="mt-1 text-sm text-muted-foreground">
                          No urgent follow-ups for this client right now.
                        </p>
                      </article>
                    }
                  </div>
                }
                @case ('projects') {
                  <app-client-projects-tab
                    [clientId]="clientId()"
                    [clientName]="clientCompanyName()"
                  />
                }
                @case ('invoices') {
                  @if (invoices().length === 0) {
                    <p class="text-sm text-muted-foreground">No invoices for this client yet.</p>
                  } @else {
                    <ul class="space-y-2 text-sm">
                      @for (invoice of invoices(); track invoice.id) {
                        <li class="rounded-md border p-3">
                          {{ readInvoiceNumber(invoice) }} |
                          {{ readInvoiceTotal(invoice) | number: '1.2-2' }} |
                          {{ formatInvoiceStatus(invoice.status) }}
                        </li>
                      }
                    </ul>
                  }
                }
                @case ('documents') {
                  @if (documents().length === 0) {
                    <p class="text-sm text-muted-foreground">No documents for this client yet.</p>
                  } @else {
                    <ul class="space-y-2 text-sm">
                      @for (document of documents(); track document.id) {
                        <li class="rounded-md border p-3">{{ document.fileName }}</li>
                      }
                    </ul>
                  }
                }
                @case ('messages') {
                  @if (messageActivity().length === 0) {
                    <p class="text-sm text-muted-foreground">No message activity recorded yet.</p>
                  } @else {
                    <ul class="space-y-2 text-sm">
                      @for (activity of messageActivity(); track activity.type + activity.occurredAt + activity.title) {
                        <li class="rounded-md border p-3">
                          <p class="font-medium">{{ activity.title }}</p>
                          <p class="text-muted-foreground">{{ activity.description }}</p>
                          <p class="mt-1 text-xs text-muted-foreground">{{ formatDateTime(activity.occurredAt) }}</p>
                        </li>
                      }
                    </ul>
                  }
                }
                @case ('requests') {
                  @if (requestActivity().length === 0) {
                    <p class="text-sm text-muted-foreground">No client requests recorded yet.</p>
                  } @else {
                    <ul class="space-y-2 text-sm">
                      @for (activity of requestActivity(); track activity.type + activity.occurredAt + activity.title) {
                        <li class="rounded-md border p-3">
                          <p class="font-medium">{{ activity.title }}</p>
                          <p class="text-muted-foreground">{{ activity.description }}</p>
                          <p class="mt-1 text-xs text-muted-foreground">{{ formatDateTime(activity.occurredAt) }}</p>
                        </li>
                      }
                    </ul>
                  }
                }
              }
            }
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ClientDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientStore = inject(ClientStore);
  private readonly breadcrumbService = inject(BusinessPortalBreadcrumbService);
  private readonly invoiceApiService = inject(InvoiceApiService);
  private readonly documentApiService = inject(DocumentApiService);

  protected readonly clientId = computed(
    () => this.route.snapshot.paramMap.get('clientId') ?? '',
  );

  protected readonly workspace = computed(() => this.clientStore.clientWorkspace());
  protected readonly clientCompanyName = computed(
    () => this.workspace()?.client.companyName ?? 'Client Detail',
  );
  protected readonly isLoading = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly invoices = signal<InvoiceSummary[]>([]);
  protected readonly documents = signal<DocumentSummary[]>([]);

  protected readonly messageActivity = computed(() =>
    filterActivity(this.workspace()?.recentActivity ?? [], 'message.'),
  );

  protected readonly requestActivity = computed(() =>
    filterActivity(this.workspace()?.recentActivity ?? [], 'request.'),
  );

  protected readonly tabs: ReadonlyArray<TabDefinition> = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'High-level client metrics and relationship health indicators.',
    },
    {
      key: 'projects',
      label: 'Projects',
      description: 'Current and upcoming project work for this client account.',
    },
    {
      key: 'invoices',
      label: 'Invoices',
      description: 'Billing status, due dates, and payment collection visibility.',
    },
    {
      key: 'documents',
      label: 'Documents',
      description: 'Contracts, statements of work, and shared compliance artifacts.',
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Recent communication timeline for internal and client-facing updates.',
    },
    {
      key: 'requests',
      label: 'Requests',
      description: 'Open support, access, and feature requests requiring follow-up.',
    },
  ];

  protected readonly activeTab = signal<ClientDetailTab>('overview');
  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.key === this.activeTab()) ?? this.tabs[0],
  );

  protected readonly overviewStatCards = computed(() => {
    const workspace = this.workspace();
    if (workspace === null) {
      return [];
    }

    return buildOverviewStatCards(
      workspace,
      (status) => this.formatStatus(status),
    );
  });

  protected readonly activeTabClasses =
    'bg-primary text-primary-foreground border border-primary';
  protected readonly inactiveTabClasses =
    'bg-background text-foreground border border-input hover:bg-muted';

  ngOnInit(): void {
    const tab = this.route.snapshot.queryParamMap.get('tab');
    if (isClientDetailTab(tab)) {
      this.activeTab.set(tab);
    }

    void this.loadClient();
  }

  protected setActiveTab(tab: ClientDetailTab): void {
    this.activeTab.set(tab);
    void this.loadTabData(tab);
  }

  protected formatStatus(status: ClientWorkspace['client']['status']): string {
    switch (normalizeStatus(status)) {
      case 1:
        return 'Pending invite';
      case 2:
        return 'Active';
      case 3:
        return 'Inactive';
      case 4:
        return 'Suspended';
      default:
        return 'Unknown';
    }
  }

  protected formatInvoiceStatus(status: InvoiceSummary['status']): string {
    return invoiceStatusLabel(status);
  }

  protected readInvoiceNumber(invoice: InvoiceSummary): string {
    const value = invoice.invoiceNumber;
    return typeof value === 'string' && value.trim() !== '' ? value : 'Invoice';
  }

  protected readInvoiceTotal(invoice: InvoiceSummary): number {
    if (typeof invoice.total === 'number') {
      return invoice.total;
    }

    return 0;
  }

  protected formatDateTime(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private async loadClient(): Promise<void> {
    const clientId = this.clientId().trim();
    if (clientId === '') {
      this.errorMessage.set('Client id is missing from the route.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      await this.clientStore.loadClientWorkspace(clientId);
      if (this.clientStore.error() !== null) {
        this.errorMessage.set(this.clientStore.error());
        return;
      }

      this.breadcrumbService.setDynamicTrail([
        { label: this.clientCompanyName() },
      ]);

      await this.loadTabData(this.activeTab());
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load client detail.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTabData(tab: ClientDetailTab): Promise<void> {
    const clientId = this.clientId().trim();
    if (
      clientId === ''
      || tab === 'overview'
      || tab === 'projects'
      || tab === 'messages'
      || tab === 'requests'
    ) {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      if (tab === 'invoices') {
        const result = await firstValueFrom(
          this.invoiceApiService.getInvoices({ clientId, page: 1, pageSize: 50 }),
        );
        this.invoices.set(result.items);
      }

      if (tab === 'documents') {
        const result = await firstValueFrom(
          this.documentApiService.getDocuments({ clientId, page: 1, pageSize: 50 }),
        );
        this.documents.set(result.items);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load tab data.'));
    } finally {
      this.isLoading.set(false);
    }
  }

}

function filterActivity(
  activities: ReadonlyArray<ClientActivityItem>,
  prefix: string,
): ClientActivityItem[] {
  return activities.filter((activity) => activity.type.startsWith(prefix));
}

function isClientDetailTab(value: string | null): value is ClientDetailTab {
  return (
    value === 'overview' ||
    value === 'projects' ||
    value === 'invoices' ||
    value === 'documents' ||
    value === 'messages' ||
    value === 'requests'
  );
}

function normalizeStatus(status: ClientWorkspace['client']['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

interface OverviewStatCard {
  readonly label: string;
  readonly value: string;
  readonly iconPath: string;
  readonly accentColor: string;
  readonly accentBg: string;
  readonly sparkline: ReadonlyArray<number>;
  readonly trendValue: string;
  readonly trendLabel: string;
  readonly trendDirection: 'up' | 'down' | 'neutral';
  readonly footnote: string;
}

function buildOverviewStatCards(
  workspace: ClientWorkspace,
  formatStatus: (status: ClientWorkspace['client']['status']) => string,
): ReadonlyArray<OverviewStatCard> {
  const statusCode = normalizeStatus(workspace.client.status);
  const { metrics } = workspace;
  const accountStatusLabel = formatStatus(workspace.client.status);
  const outstandingBalance = metrics.outstandingInvoiceAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const accountTrend = accountStatusTrend(statusCode);
  const overdueTrend = metrics.overdueInvoices > 0
    ? {
        trendValue: String(metrics.overdueInvoices),
        trendLabel: ' need follow-up',
        trendDirection: 'down' as const,
        footnote: '',
      }
    : {
        trendValue: '0',
        trendLabel: ' all current',
        trendDirection: 'up' as const,
        footnote: '',
      };

  return [
    {
      label: 'Account status',
      value: accountStatusLabel,
      iconPath: 'M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
      accentColor: '#3b82f6',
      accentBg: '#dbeafe',
      sparkline: decorativeSparkline(statusCode + 11),
      trendValue: accountTrend.trendValue,
      trendLabel: accountTrend.trendLabel,
      trendDirection: accountTrend.trendDirection,
      footnote: accountTrend.footnote,
    },
    {
      label: 'Active projects',
      value: String(metrics.activeProjects),
      iconPath: 'M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z',
      accentColor: '#14b8a6',
      accentBg: '#ccfbf1',
      sparkline: decorativeSparkline(metrics.activeProjects + 23),
      trendValue: '',
      trendLabel: '',
      trendDirection: 'neutral',
      footnote: `${metrics.activeProjects} of ${metrics.totalProjects} total projects`,
    },
    {
      label: 'Overdue invoices',
      value: String(metrics.overdueInvoices),
      iconPath: 'M12 8v5l3 3M22 12a10 10 0 1 1-20 0 10 10 0 0 1 20 0Z',
      accentColor: '#f97316',
      accentBg: '#ffedd5',
      sparkline: decorativeSparkline(metrics.overdueInvoices + 37),
      trendValue: overdueTrend.trendValue,
      trendLabel: overdueTrend.trendLabel,
      trendDirection: overdueTrend.trendDirection,
      footnote: overdueTrend.footnote,
    },
    {
      label: 'Outstanding balance',
      value: outstandingBalance,
      iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
      accentColor: '#a855f7',
      accentBg: '#f3e8ff',
      sparkline: decorativeSparkline(Math.round(metrics.outstandingInvoiceAmount) + 51),
      trendValue: '',
      trendLabel: '',
      trendDirection: 'neutral',
      footnote:
        metrics.outstandingInvoiceAmount > 0
          ? 'Unpaid invoice total'
          : 'No outstanding balance',
    },
  ];
}

function accountStatusTrend(statusCode: number): {
  readonly trendValue: string;
  readonly trendLabel: string;
  readonly trendDirection: 'up' | 'down' | 'neutral';
  readonly footnote: string;
} {
  switch (statusCode) {
    case 2:
      return {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'up',
        footnote: 'Healthy client account',
      };
    case 1:
      return {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'neutral',
        footnote: 'Invitation pending acceptance',
      };
    case 3:
      return {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'neutral',
        footnote: 'Account is currently inactive',
      };
    case 4:
      return {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'down',
        footnote: 'Account access is suspended',
      };
    default:
      return {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'neutral',
        footnote: '',
      };
  }
}

function decorativeSparkline(seed: number): ReadonlyArray<number> {
  const values: number[] = [];
  let current = 10 + (seed % 8);

  for (let index = 0; index < 12; index += 1) {
    const delta = ((seed * (index + 3)) % 5) - 2;
    current = Math.max(6, Math.min(34, current + delta));
    values.push(current);
  }

  return values;
}
