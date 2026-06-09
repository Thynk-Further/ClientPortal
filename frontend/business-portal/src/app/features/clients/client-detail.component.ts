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
import {
  CreateProjectMilestoneRequest,
  ProjectApiService,
  ProjectSummary,
} from '@/app/core/api/services/project-api.service';
import { BusinessPortalBreadcrumbService } from '@/app/core/layout/business-portal-breadcrumb.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ClientStore } from '@/app/core/stores/client.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { ProjectHealthBadgeComponent } from '../projects/project-health-badge.component';

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
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    ProjectHealthBadgeComponent,
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
                  <div class="mb-4 flex justify-end">
                    <ui-button
                      variant="outline"
                      [label]="showCreateProject() ? 'Cancel' : 'Create project'"
                      (clicked)="toggleCreateProject()"
                    />
                  </div>

                  @if (showCreateProject()) {
                    <form class="mb-4 grid gap-3 rounded-md border p-4" (submit)="submitCreateProject($event)">
                      <input
                        class="rounded-md border px-3 py-2 text-sm"
                        placeholder="Project name"
                        required
                        [value]="newProjectName()"
                        (input)="onNewProjectNameInput($event)"
                      />
                      <textarea
                        class="rounded-md border px-3 py-2 text-sm"
                        placeholder="Description"
                        rows="3"
                        required
                        [value]="newProjectDescription()"
                        (input)="onNewProjectDescriptionInput($event)"
                      ></textarea>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <label class="space-y-1 text-sm">
                          <span class="font-medium">Start date</span>
                          <input
                            type="date"
                            class="w-full rounded-md border px-3 py-2"
                            required
                            [value]="newProjectStartDate()"
                            (input)="onNewProjectStartDateInput($event)"
                          />
                        </label>
                        <label class="space-y-1 text-sm">
                          <span class="font-medium">End date</span>
                          <input
                            type="date"
                            class="w-full rounded-md border px-3 py-2"
                            required
                            [value]="newProjectEndDate()"
                            (input)="onNewProjectEndDateInput($event)"
                          />
                        </label>
                      </div>
                      <div class="grid gap-3 sm:grid-cols-2">
                        <label class="space-y-1 text-sm">
                          <span class="font-medium">Budget</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            class="w-full rounded-md border px-3 py-2"
                            [value]="newProjectBudget()"
                            (input)="onNewProjectBudgetInput($event)"
                          />
                        </label>
                        <label class="space-y-1 text-sm">
                          <span class="font-medium">Currency</span>
                          <input
                            class="w-full rounded-md border px-3 py-2"
                            maxlength="3"
                            [value]="newProjectCurrency()"
                            (input)="onNewProjectCurrencyInput($event)"
                          />
                        </label>
                      </div>
                      <div class="space-y-2 rounded-md border bg-muted/20 p-3">
                        <div class="flex items-center justify-between gap-2">
                          <p class="text-sm font-medium">Initial milestones (optional)</p>
                          <ui-button
                            type="button"
                            variant="outline"
                            label="Add milestone"
                            (clicked)="addScaffoldMilestone()"
                          />
                        </div>
                        @if (scaffoldMilestones().length === 0) {
                          <p class="text-xs text-muted-foreground">
                            Add delivery phases to scaffold the project timeline.
                          </p>
                        } @else {
                          @for (milestone of scaffoldMilestones(); track $index) {
                            <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                              <input
                                class="rounded-md border px-3 py-2 text-sm"
                                placeholder="Milestone name"
                                [value]="milestone.name"
                                (input)="onScaffoldMilestoneNameInput($index, $event)"
                              />
                              <input
                                type="date"
                                class="rounded-md border px-3 py-2 text-sm"
                                [value]="milestone.dueDate"
                                (input)="onScaffoldMilestoneDueDateInput($index, $event)"
                              />
                              <ui-button
                                type="button"
                                variant="outline"
                                label="Remove"
                                (clicked)="removeScaffoldMilestone($index)"
                              />
                            </div>
                          }
                        }
                      </div>
                      <ui-button type="submit" label="Create project" />
                    </form>
                  }

                  @if (ongoingProjects().length === 0 && completedProjects().length === 0) {
                    <p class="text-sm text-muted-foreground">No projects for this client yet.</p>
                  } @else {
                    @if (ongoingProjects().length > 0) {
                      <section class="mb-6 space-y-2">
                        <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Ongoing</h3>
                        <ul class="space-y-2">
                          @for (project of ongoingProjects(); track project.id) {
                            <li class="rounded-md border p-3">
                              <div class="flex flex-wrap items-center justify-between gap-2">
                                <a
                                  class="font-medium hover:underline"
                                  [routerLink]="['/clients', clientId(), 'projects', project.id]"
                                >
                                  {{ project.name }}
                                </a>
                                <div class="flex items-center gap-2 text-sm">
                                  <app-project-health-badge [health]="project.health" />
                                  <span class="text-muted-foreground">{{ formatProjectStatus(project.status) }}</span>
                                </div>
                              </div>
                              <p class="mt-1 text-xs text-muted-foreground">Ends {{ project.endDate }}</p>
                            </li>
                          }
                        </ul>
                      </section>
                    }

                    @if (completedProjects().length > 0) {
                      <section class="space-y-2">
                        <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Completed</h3>
                        <ul class="space-y-2">
                          @for (project of completedProjects(); track project.id) {
                            <li class="rounded-md border p-3">
                              <div class="flex flex-wrap items-center justify-between gap-2">
                                <a
                                  class="font-medium hover:underline"
                                  [routerLink]="['/clients', clientId(), 'projects', project.id]"
                                >
                                  {{ project.name }}
                                </a>
                                <span class="text-sm text-muted-foreground">{{ formatProjectStatus(project.status) }}</span>
                              </div>
                            </li>
                          }
                        </ul>
                      </section>
                    }
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
  private readonly breadcrumbService = inject(BusinessPortalBreadcrumbService);
  private readonly projectStore = inject(ProjectStore);
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
  protected readonly showCreateProject = signal(false);
  protected readonly newProjectName = signal('');
  protected readonly newProjectDescription = signal('');
  protected readonly newProjectStartDate = signal(this.formatDateInputValue(new Date()));
  protected readonly newProjectEndDate = signal(this.formatDateInputValue(this.defaultProjectEndDate()));
  protected readonly newProjectBudget = signal('0');
  protected readonly newProjectCurrency = signal('ZAR');
  protected readonly scaffoldMilestones = signal<CreateProjectMilestoneRequest[]>([]);

  protected readonly ongoingProjects = computed(() =>
    this.projects().filter((project) => isOngoingProject(project.status)),
  );

  protected readonly completedProjects = computed(() =>
    this.projects().filter((project) => isCompletedProject(project.status)),
  );
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
    if (typeof status === 'number') {
      switch (status) {
        case 1:
          return 'Planned';
        case 2:
          return 'In Progress';
        case 3:
          return 'On Hold';
        case 4:
          return 'Completed';
        case 5:
          return 'Cancelled';
        default:
          return 'Unknown';
      }
    }

    const statusText = String(status);
    if (statusText.trim() !== '') {
      return statusText;
    }

    return 'Unknown';
  }

  protected toggleCreateProject(): void {
    const next = !this.showCreateProject();
    this.showCreateProject.set(next);
    if (next) {
      this.resetCreateProjectForm();
    }
  }

  protected onNewProjectNameInput(event: Event): void {
    this.newProjectName.set((event.target as HTMLInputElement).value);
  }

  protected onNewProjectDescriptionInput(event: Event): void {
    this.newProjectDescription.set((event.target as HTMLTextAreaElement).value);
  }

  protected onNewProjectStartDateInput(event: Event): void {
    this.newProjectStartDate.set((event.target as HTMLInputElement).value);
  }

  protected onNewProjectEndDateInput(event: Event): void {
    this.newProjectEndDate.set((event.target as HTMLInputElement).value);
  }

  protected onNewProjectBudgetInput(event: Event): void {
    this.newProjectBudget.set((event.target as HTMLInputElement).value);
  }

  protected onNewProjectCurrencyInput(event: Event): void {
    this.newProjectCurrency.set((event.target as HTMLInputElement).value.toUpperCase());
  }

  protected addScaffoldMilestone(): void {
    const endDate = this.newProjectEndDate();
    this.scaffoldMilestones.update((current) => [
      ...current,
      { name: '', dueDate: endDate },
    ]);
  }

  protected removeScaffoldMilestone(index: number): void {
    this.scaffoldMilestones.update((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  protected onScaffoldMilestoneNameInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scaffoldMilestones.update((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, name: value } : milestone,
      ),
    );
  }

  protected onScaffoldMilestoneDueDateInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scaffoldMilestones.update((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, dueDate: value } : milestone,
      ),
    );
  }

  protected async submitCreateProject(event: Event): Promise<void> {
    event.preventDefault();
    const clientId = this.clientId().trim();
    const name = this.newProjectName().trim();
    const description = this.newProjectDescription().trim();
    const startDate = this.newProjectStartDate().trim();
    const endDate = this.newProjectEndDate().trim();
    const budget = Number.parseFloat(this.newProjectBudget());
    const currency = this.newProjectCurrency().trim().toUpperCase();
    if (
      clientId === ''
      || name === ''
      || description === ''
      || startDate === ''
      || endDate === ''
      || currency === ''
      || Number.isNaN(budget)
    ) {
      return;
    }

    const milestones = this.scaffoldMilestones()
      .map((milestone) => ({
        name: milestone.name.trim(),
        dueDate: milestone.dueDate,
      }))
      .filter((milestone) => milestone.name !== '' && milestone.dueDate !== '');

    const projectId = await this.projectStore.createProject({
      clientId,
      name,
      description,
      startDate,
      endDate,
      budget,
      currency,
      milestones: milestones.length > 0 ? milestones : undefined,
    });

    if (projectId !== null) {
      this.resetCreateProjectForm();
      this.showCreateProject.set(false);
      await this.loadProjectsTab();
    }
  }

  private resetCreateProjectForm(): void {
    this.newProjectName.set('');
    this.newProjectDescription.set('');
    this.newProjectStartDate.set(this.formatDateInputValue(new Date()));
    this.newProjectEndDate.set(this.formatDateInputValue(this.defaultProjectEndDate()));
    this.newProjectBudget.set('0');
    this.newProjectCurrency.set('ZAR');
    this.scaffoldMilestones.set([]);
  }

  private defaultProjectEndDate(): Date {
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return end;
  }

  private formatDateInputValue(date: Date): string {
    return date.toISOString().slice(0, 10);
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
    if (clientId === '' || tab === 'overview' || tab === 'messages' || tab === 'requests') {
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      if (tab === 'projects') {
        await this.loadProjectsTab();
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

  private async loadProjectsTab(): Promise<void> {
    const clientId = this.clientId().trim();
    if (clientId === '') {
      return;
    }

    const result = await firstValueFrom(
      this.projectApiService.getProjects({ clientId, page: 1, pageSize: 50 }),
    );
    this.projects.set(result.items);
  }
}

function isOngoingProject(status: ProjectSummary['status']): boolean {
  const normalized = normalizeProjectStatus(status);
  return normalized === 1 || normalized === 2 || normalized === 3;
}

function isCompletedProject(status: ProjectSummary['status']): boolean {
  const normalized = normalizeProjectStatus(status);
  return normalized === 4 || normalized === 5;
}

function normalizeProjectStatus(status: ProjectSummary['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
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
