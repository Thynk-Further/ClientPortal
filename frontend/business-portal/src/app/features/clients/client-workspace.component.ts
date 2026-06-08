import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import {
  ClientSummary,
  ClientWorkspace,
} from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';

const CLIENT_STATUS_INVITED = 1;
const RECENT_CLIENTS_STORAGE_KEY = 'business-portal.recent-workspace-clients';

interface WorkAreaLink {
  readonly label: string;
  readonly description: string;
  readonly route: string;
  readonly metric: string;
  readonly queryParams?: Record<string, string>;
}

@Component({
  selector: 'app-client-workspace',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Client Workspace</h1>
          <p class="text-sm text-muted-foreground">
            Select a client to review status, follow-ups, and jump into their work areas.
          </p>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Select client</ui-card-title>
            <ui-card-description>
              Search by company, contact, or email. Recent clients appear first.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <form class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]" [formGroup]="selectorForm">
              <ui-input
                type="search"
                placeholder="Filter clients..."
                formControlName="searchTerm"
              />
              <ui-select
                [options]="clientOptions()"
                placeholder="Choose a client"
                formControlName="clientId"
              />
              <ui-button
                variant="outline"
                [disabled]="isLoading()"
                label="Refresh"
                (clicked)="refresh()"
              />
            </form>
          </ui-card-content>
        </ui-card>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        @if (selectedClientId() === '') {
          <section class="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ui-card>
              <ui-card-header>
                <ui-card-title>Recent clients</ui-card-title>
                <ui-card-description>
                  {{ landing()?.totalClients ?? 0 }} total clients in your workspace.
                </ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (isLoading()) {
                  <p class="text-sm text-muted-foreground">Loading...</p>
                } @else if ((landing()?.recentClients?.length ?? 0) === 0) {
                  <p class="text-sm text-muted-foreground">No clients yet. Invite your first client to get started.</p>
                } @else {
                  <ul class="space-y-2">
                    @for (client of landing()?.recentClients ?? []; track client.id) {
                      <li>
                        <button
                          type="button"
                          class="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-left text-sm hover:bg-muted"
                          (click)="selectClient(client.id)"
                        >
                          <span>
                            <span class="font-medium">{{ client.companyName }}</span>
                            <span class="block text-xs text-muted-foreground">{{ client.contactName }}</span>
                          </span>
                          <span [class]="statusBadgeClass(client.status)">{{ formatStatus(client.status) }}</span>
                        </button>
                      </li>
                    }
                  </ul>
                }
              </ui-card-content>
            </ui-card>

            <ui-card>
              <ui-card-header>
                <ui-card-title>Pending invites</ui-card-title>
                <ui-card-description>Clients who have not accepted their invitation yet.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if ((landing()?.pendingInvites?.length ?? 0) === 0) {
                  <p class="text-sm text-muted-foreground">No pending invitations.</p>
                } @else {
                  <ul class="space-y-2">
                    @for (client of landing()?.pendingInvites ?? []; track client.id) {
                      <li class="rounded-lg border px-3 py-2">
                        <div class="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p class="font-medium">{{ client.companyName }}</p>
                            <p class="text-xs text-muted-foreground">{{ client.email }}</p>
                          </div>
                          <div class="flex gap-2">
                            <ui-button
                              variant="outline"
                              label="Open"
                              (clicked)="selectClient(client.id)"
                            />
                            <ui-button
                              variant="outline"
                              [disabled]="resendingClientId() === client.id"
                              [label]="resendingClientId() === client.id ? 'Sending...' : 'Resend'"
                              (clicked)="resendInvite(client.id)"
                            />
                          </div>
                        </div>
                      </li>
                    }
                  </ul>
                }
              </ui-card-content>
            </ui-card>
          </section>
        } @else if (workspace() !== null) {
          @let data = workspace()!;

          <section class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
            <article class="rounded-xl border bg-card p-4 shadow-sm">
              <p class="text-xs text-muted-foreground">Account status</p>
              <p class="mt-1 text-lg font-semibold">{{ formatStatus(data.client.status) }}</p>
            </article>
            <article class="rounded-xl border bg-card p-4 shadow-sm">
              <p class="text-xs text-muted-foreground">Active projects</p>
              <p class="mt-1 text-lg font-semibold">{{ data.metrics.activeProjects }}</p>
            </article>
            <article class="rounded-xl border bg-card p-4 shadow-sm">
              <p class="text-xs text-muted-foreground">Overdue invoices</p>
              <p class="mt-1 text-lg font-semibold">{{ data.metrics.overdueInvoices }}</p>
            </article>
            <article class="rounded-xl border bg-card p-4 shadow-sm">
              <p class="text-xs text-muted-foreground">Outstanding balance</p>
              <p class="mt-1 text-lg font-semibold">{{ data.metrics.outstandingInvoiceAmount | number: '1.2-2' }}</p>
            </article>
          </section>

          <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
            <ui-card>
              <ui-card-header>
                <ui-card-title>Client snapshot</ui-card-title>
                <ui-card-description>{{ data.client.companyName }}</ui-card-description>
              </ui-card-header>
              <ui-card-content class="space-y-3 text-sm">
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div>
                    <p class="text-xs text-muted-foreground">Contact</p>
                    <p class="font-medium">{{ data.client.contactName }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Email</p>
                    <p class="font-medium">{{ data.client.email }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Phone</p>
                    <p class="font-medium">{{ data.client.phone }}</p>
                  </div>
                  <div>
                    <p class="text-xs text-muted-foreground">Invited</p>
                    <p class="font-medium">{{ formatDate(data.client.invitedAt) }}</p>
                  </div>
                </div>

                @if (data.onboarding !== null) {
                  <div class="rounded-lg border bg-muted/20 p-3">
                    <p class="text-xs text-muted-foreground">Onboarding progress</p>
                    <p class="mt-1 font-medium">
                      {{ data.onboarding.completedSteps }} / {{ data.onboarding.totalSteps }} steps complete
                    </p>
                    <div class="mt-2 h-2 w-full rounded-full bg-muted">
                      <div
                        class="h-2 rounded-full bg-primary transition-all"
                        [style.width.%]="onboardingPercent(data)"
                      ></div>
                    </div>
                  </div>
                }

                <div class="flex flex-wrap gap-2 pt-1">
                  @if (isPendingInvite(data.client.status)) {
                    <ui-button
                      variant="outline"
                      [disabled]="resendingClientId() === data.client.id"
                      [label]="resendingClientId() === data.client.id ? 'Sending...' : 'Resend invite'"
                      (clicked)="resendInvite(data.client.id)"
                    />
                  }
                  <a
                    class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
                    [routerLink]="['/clients', data.client.id]"
                  >
                    Full client profile
                  </a>
                </div>
              </ui-card-content>
            </ui-card>

            <ui-card>
              <ui-card-header>
                <ui-card-title>Needs attention</ui-card-title>
                <ui-card-description>Follow-ups for this client account.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                <ul class="space-y-2">
                  @for (item of data.attentionItems; track item.code) {
                    <li class="rounded-lg border p-3">
                      <div class="flex items-start gap-3">
                        <span class="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" [class]="attentionDotClass(item.severity)"></span>
                        <div>
                          <p class="font-medium">{{ item.title }}</p>
                          <p class="text-sm text-muted-foreground">{{ item.description }}</p>
                        </div>
                      </div>
                    </li>
                  }
                </ul>
              </ui-card-content>
            </ui-card>
          </div>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Work areas</ui-card-title>
              <ui-card-description>Jump into projects, billing, documents, and communication.</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                @for (area of workAreas(data); track area.label) {
                  <a
                    class="rounded-lg border p-4 transition-colors hover:bg-muted/40"
                    [routerLink]="area.route"
                    [queryParams]="area.queryParams ?? null"
                  >
                    <p class="font-medium">{{ area.label }}</p>
                    <p class="mt-1 text-sm text-muted-foreground">{{ area.description }}</p>
                    <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-primary">{{ area.metric }}</p>
                  </a>
                }
              </div>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Recent activity</ui-card-title>
              <ui-card-description>Latest updates across this client relationship.</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (data.recentActivity.length === 0) {
                <p class="text-sm text-muted-foreground">No activity recorded yet.</p>
              } @else {
                <ul class="space-y-3">
                  @for (activity of data.recentActivity; track activity.type + activity.occurredAt + activity.title) {
                    <li class="flex flex-col gap-1 border-b pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <p class="font-medium">{{ activity.title }}</p>
                        <p class="text-sm text-muted-foreground">{{ activity.description }}</p>
                      </div>
                      <span class="shrink-0 text-xs text-muted-foreground">{{ formatDateTime(activity.occurredAt) }}</span>
                    </li>
                  }
                </ul>
              }
            </ui-card-content>
          </ui-card>
        }
      </section>
    </main>
  `,
})
export class ClientWorkspaceComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly clientStore = inject(ClientStore);
  private readonly toast = inject(ToastNotificationService);

  protected readonly selectorForm = this.formBuilder.nonNullable.group({
    searchTerm: [''],
    clientId: [''],
  });

  protected readonly isLoading = computed(() => this.clientStore.isLoading());
  protected readonly errorMessage = computed(() => this.clientStore.error());
  protected readonly landing = computed(() => this.clientStore.workspaceLanding());
  protected readonly workspace = computed(() => this.clientStore.clientWorkspace());
  protected readonly allClients = computed(() => this.clientStore.clients());
  protected readonly resendingClientId = signal<string | null>(null);

  protected readonly selectedClientId = computed(() => this.selectorForm.controls.clientId.value.trim());

  protected readonly clientOptions = computed<ReadonlyArray<SelectOption>>(() => {
    const searchTerm = this.selectorForm.controls.searchTerm.value.trim().toLowerCase();
    const clients = this.allClients().filter((client) => {
      if (searchTerm === '') {
        return true;
      }

      return (
        client.companyName.toLowerCase().includes(searchTerm) ||
        client.contactName.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm)
      );
    });

    return clients.map((client) => ({
      value: client.id,
      label: `${client.companyName} (${this.formatStatus(client.status)})`,
    }));
  });

  ngOnInit(): void {
    this.selectorForm.controls.clientId.valueChanges.subscribe((clientId) => {
      void this.loadWorkspace(clientId.trim());
    });

    void this.initialize();
  }

  protected async refresh(): Promise<void> {
    await this.initialize();
    const clientId = this.selectedClientId();
    if (clientId !== '') {
      await this.loadWorkspace(clientId);
    }
  }

  protected selectClient(clientId: string): void {
    this.selectorForm.patchValue({ clientId }, { emitEvent: true });
  }

  protected async resendInvite(clientId: string): Promise<void> {
    this.resendingClientId.set(clientId);
    try {
      const success = await this.clientStore.resendClientInvitation(clientId);
      if (success) {
        this.toast.success('Invitation resent successfully.');
        await this.refresh();
      }
    } finally {
      this.resendingClientId.set(null);
    }
  }

  protected workAreas(data: ClientWorkspace): ReadonlyArray<WorkAreaLink> {
    const clientId = data.client.id;
    const clientQuery = { clientId };
    return [
      {
        label: 'Projects',
        description: 'Delivery timelines and active workstreams.',
        route: '/projects',
        metric: `${data.metrics.activeProjects} active`,
        queryParams: clientQuery,
      },
      {
        label: 'Invoices',
        description: 'Billing, due dates, and collections.',
        route: '/finance',
        metric: `${data.metrics.overdueInvoices} overdue`,
        queryParams: clientQuery,
      },
      {
        label: 'Documents & contracts',
        description: 'Agreements, files, and e-sign status.',
        route: '/documents',
        metric: `${data.metrics.unsignedContracts} unsigned`,
        queryParams: clientQuery,
      },
      {
        label: 'Messages',
        description: 'Client communication threads.',
        route: '/communication',
        metric: `${data.metrics.messageThreads} threads`,
        queryParams: clientQuery,
      },
      {
        label: 'Requests',
        description: 'Support and change requests.',
        route: `/clients/${clientId}`,
        metric: `${data.metrics.openRequests} open`,
        queryParams: { tab: 'requests' },
      },
      {
        label: 'Meetings',
        description: 'Scheduled calls and sessions.',
        route: '/communication',
        metric: `${data.metrics.upcomingMeetings} upcoming`,
        queryParams: { ...clientQuery, tab: 'meetings' },
      },
    ];
  }

  protected formatStatus(status: ClientSummary['status']): string {
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

  protected statusBadgeClass(status: ClientSummary['status']): string {
    const base = 'rounded-full px-2 py-0.5 text-[11px] font-medium';
    switch (normalizeStatus(status)) {
      case 1:
        return `${base} bg-amber-100 text-amber-900`;
      case 2:
        return `${base} bg-emerald-100 text-emerald-900`;
      case 3:
        return `${base} bg-slate-100 text-slate-700`;
      case 4:
        return `${base} bg-rose-100 text-rose-900`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  protected attentionDotClass(severity: string): string {
    switch (severity) {
      case 'critical':
        return 'bg-destructive';
      case 'warning':
        return 'bg-amber-500';
      case 'success':
        return 'bg-emerald-500';
      default:
        return 'bg-primary';
    }
  }

  protected isPendingInvite(status: ClientSummary['status']): boolean {
    return normalizeStatus(status) === CLIENT_STATUS_INVITED;
  }

  protected onboardingPercent(data: ClientWorkspace): number {
    if (data.onboarding === null || data.onboarding.totalSteps === 0) {
      return 0;
    }

    return Math.round((data.onboarding.completedSteps / data.onboarding.totalSteps) * 100);
  }

  protected formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
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

  private async initialize(): Promise<void> {
    await this.clientStore.loadWorkspaceLanding();
    await this.clientStore.loadClients({ page: 1, pageSize: 200 });

    const restoredClientId = this.readRecentClientId();
    if (
      restoredClientId !== null &&
      this.clientStore.clients().some((client) => client.id === restoredClientId)
    ) {
      this.selectorForm.patchValue({ clientId: restoredClientId }, { emitEvent: true });
    }
  }

  private async loadWorkspace(clientId: string): Promise<void> {
    await this.clientStore.loadClientWorkspace(clientId);
    if (clientId !== '') {
      this.rememberRecentClient(clientId);
    }
  }

  private rememberRecentClient(clientId: string): void {
    sessionStorage.setItem(RECENT_CLIENTS_STORAGE_KEY, clientId);
  }

  private readRecentClientId(): string | null {
    const value = sessionStorage.getItem(RECENT_CLIENTS_STORAGE_KEY)?.trim();
    return value === '' ? null : value ?? null;
  }
}

function normalizeStatus(status: ClientSummary['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
