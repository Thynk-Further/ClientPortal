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
import { ProjectApiService, ProjectSummary } from '@/app/core/api/services/project-api.service';
import { ClientStore } from '@/app/core/stores/client.store';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

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
                    <div class="grid grid-cols-1 gap-3 md:grid-cols-4">
                      <article class="rounded-lg border p-3">
                        <p class="text-xs text-muted-foreground">Account status</p>
                        <p class="text-lg font-semibold">{{ formatStatus(workspace()!.client.status) }}</p>
                      </article>
                      <article class="rounded-lg border p-3">
                        <p class="text-xs text-muted-foreground">Active projects</p>
                        <p class="text-lg font-semibold">{{ workspace()!.metrics.activeProjects }}</p>
                      </article>
                      <article class="rounded-lg border p-3">
                        <p class="text-xs text-muted-foreground">Overdue invoices</p>
                        <p class="text-lg font-semibold">{{ workspace()!.metrics.overdueInvoices }}</p>
                      </article>
                      <article class="rounded-lg border p-3">
                        <p class="text-xs text-muted-foreground">Outstanding balance</p>
                        <p class="text-lg font-semibold">
                          {{ workspace()!.metrics.outstandingInvoiceAmount | number: '1.2-2' }}
                        </p>
                      </article>
                    </div>

                    @if (workspace()!.attentionItems.length > 0) {
                      <ul class="space-y-2">
                        @for (item of workspace()!.attentionItems; track item.code) {
                          <li class="rounded-md border p-3 text-sm">
                            <p class="font-medium">{{ item.title }}</p>
                            <p class="text-muted-foreground">{{ item.description }}</p>
                          </li>
                        }
                      </ul>
                    }
                  </div>
                }
                @case ('projects') {
                  @if (projects().length === 0) {
                    <p class="text-sm text-muted-foreground">No projects for this client yet.</p>
                  } @else {
                    <ul class="space-y-2 text-sm">
                      @for (project of projects(); track project.id) {
                        <li class="rounded-md border p-3">
                          {{ project.name }} — {{ formatProjectStatus(project.status) }}
                        </li>
                      }
                    </ul>
                  }
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
  private readonly projectApiService = inject(ProjectApiService);
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
  protected readonly projects = signal<ProjectSummary[]>([]);
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

  protected formatProjectStatus(status: ProjectSummary['status']): string {
    if (typeof status === 'string' && status.trim() !== '') {
      return status;
    }

    return String(status);
  }

  protected formatInvoiceStatus(status: InvoiceSummary['status']): string {
    if (typeof status === 'string' && status.trim() !== '') {
      return status;
    }

    return String(status);
  }

  protected readInvoiceNumber(invoice: InvoiceSummary): string {
    const value = invoice.invoiceNumber;
    return typeof value === 'string' && value.trim() !== '' ? value : 'Invoice';
  }

  protected readInvoiceTotal(invoice: InvoiceSummary): number {
    if (typeof invoice.totalAmount === 'number') {
      return invoice.totalAmount;
    }

    const total = invoice['total'];
    return typeof total === 'number' ? total : 0;
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

      await this.loadTabData(this.activeTab());
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load client detail.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTabData(tab: ClientDetailTab): Promise<void> {
    const clientId = this.clientId().trim();
    if (clientId === '' || tab === 'overview' || tab === 'messages' || tab === 'requests') {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      if (tab === 'projects') {
        const result = await firstValueFrom(
          this.projectApiService.getProjects({ clientId, page: 1, pageSize: 50 }),
        );
        this.projects.set(result.items);
      }

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
