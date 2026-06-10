import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { ClientDetail, ClientSummary } from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { AppendToBodyDirective } from '@/components/ui/append-to-body.directive';
import { ClientViewDialogComponent } from './client-view-dialog.component';

const CLIENT_STATUS_INVITED = 1;

type ClientStatus = 1 | 2 | 3 | 4;
type StatusTab = 'all' | ClientStatus;
type SortKey = 'company' | 'contact' | 'email' | 'status' | 'invitedAt' | 'onboardedAt';
type SortDirection = 'asc' | 'desc';

interface RowActionMenu {
  readonly client: ClientSummary;
  readonly top: number;
  readonly left: number;
}

interface StatusTabOption {
  readonly id: StatusTab;
  readonly label: string;
}

interface TableColumn {
  readonly key: SortKey;
  readonly label: string;
  readonly sortable: boolean;
}

@Component({
  selector: 'app-clients-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, AppendToBodyDirective, ClientViewDialogComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="flex items-center justify-between gap-4 pb-5">
        <div>
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Clients</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            View active clients and pending invitations.
          </p>
        </div>

        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800"
          (click)="goToInviteOnboarding()"
        >
          + Invite Client
        </button>
      </header>

      <div class="flex flex-wrap gap-1 pb-4">
        @for (tab of statusTabs; track tab.id) {
          <button
            type="button"
            class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
            [class.bg-neutral-100]="activeStatusTab() === tab.id"
            [class.text-foreground]="activeStatusTab() === tab.id"
            [class.text-muted-foreground]="activeStatusTab() !== tab.id"
            [class.hover:text-foreground]="activeStatusTab() !== tab.id"
            (click)="setStatusTab(tab.id)"
          >
            {{ tab.label }}
          </button>
        }
      </div>

      <form class="mb-4" [formGroup]="filterForm" (ngSubmit)="$event.preventDefault()">
        <div class="relative min-w-0 max-w-md">
          <svg
            class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="m21 21-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
            />
          </svg>
          <input
            type="search"
            class="h-9 w-full rounded-lg border border-border/80 bg-background py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-neutral-400"
            placeholder="Search clients..."
            formControlName="search"
          />
        </div>
      </form>

      @if (clientStore.error(); as error) {
        <p class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error }}
        </p>
      }

      <div class="overflow-x-auto rounded-lg border border-border/70 bg-background">
        <table class="w-full min-w-[960px] text-sm">
          <thead>
            <tr class="border-b border-border/70 text-left text-muted-foreground">
              @for (column of tableColumns; track column.key) {
                <th class="px-3 py-3 font-medium">
                  @if (column.sortable) {
                    <button
                      type="button"
                      class="inline-flex items-center gap-1 transition-colors hover:text-foreground"
                      (click)="toggleSort(column.key)"
                    >
                      {{ column.label }}
                      <svg class="h-3.5 w-3.5 opacity-50" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path
                          stroke-linecap="round"
                          stroke-linejoin="round"
                          stroke-width="1.75"
                          [attr.d]="sortIconPath(column.key)"
                        />
                      </svg>
                    </button>
                  } @else {
                    <span>{{ column.label }}</span>
                  }
                </th>
              }
              <th class="w-10 px-3 py-3" aria-label="Actions"></th>
            </tr>
          </thead>
          <tbody>
            @if (clientStore.isLoading()) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="7">
                  Loading clients...
                </td>
              </tr>
            } @else if (displayedClients().length === 0) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="7">
                  No clients matched your search or filter criteria.
                </td>
              </tr>
            } @else {
              @for (client of displayedClients(); track client.id) {
                <tr class="border-b border-border/50">
                  <td class="px-3 py-4">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-neutral-100 text-neutral-500"
                      >
                        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6"
                          />
                        </svg>
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-foreground">{{ client.companyName }}</p>
                        <p class="mt-0.5 truncate text-xs text-muted-foreground">
                          {{ client.contactName }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4 text-foreground">{{ client.contactName }}</td>
                  <td class="px-3 py-4 text-muted-foreground">{{ client.email }}</td>
                  <td class="px-3 py-4">
                    <span [class]="clientStatusClass(client.status)">
                      {{ formatClientStatus(client.status) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">
                    {{ formatDate(client.invitedAt) }}
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">
                    {{ formatOptionalDate(client.onboardedAt) }}
                  </td>
                  <td class="px-3 py-4">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground"
                      [attr.aria-label]="'Actions for ' + client.companyName"
                      [attr.aria-expanded]="rowMenu()?.client?.id === client.id"
                      (click)="toggleRowMenu(client, $event)"
                    >
                      <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                        <circle cx="5" cy="12" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                        <circle cx="19" cy="12" r="1.5" />
                      </svg>
                    </button>
                  </td>
                </tr>
              }
            }
          </tbody>
        </table>

        <div
          class="flex flex-col gap-3 border-t border-border/70 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p class="text-sm text-muted-foreground">{{ resultsSummary() }}</p>

          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Rows</span>
              <select
                class="h-9 rounded-lg border border-border/80 bg-background px-2.5 text-sm text-foreground outline-none focus-visible:border-neutral-400"
                [value]="pageSize()"
                (change)="onPageSizeChange($event)"
              >
                @for (size of pageSizeOptions; track size) {
                  <option [value]="size">{{ size }}</option>
                }
              </select>
            </label>

            <div class="flex items-center gap-1">
              <button
                type="button"
                class="inline-flex h-9 items-center rounded-lg border border-border/80 px-3 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50"
                [class.text-muted-foreground]="!canGoPrevious()"
                [class.text-foreground]="canGoPrevious()"
                [class.hover:bg-neutral-50]="canGoPrevious()"
                [disabled]="!canGoPrevious()"
                (click)="goToPreviousPage()"
              >
                Previous
              </button>

              @for (pageNumber of visiblePageNumbers(); track pageNumber) {
                <button
                  type="button"
                  class="inline-flex h-9 min-w-9 items-center justify-center rounded-lg border px-3 text-sm font-medium transition-colors"
                  [class.border-neutral-950]="pageNumber === page()"
                  [class.bg-neutral-950]="pageNumber === page()"
                  [class.text-white]="pageNumber === page()"
                  [class.border-border/80]="pageNumber !== page()"
                  [class.text-foreground]="pageNumber !== page()"
                  [class.hover:bg-neutral-50]="pageNumber !== page()"
                  (click)="goToPage(pageNumber)"
                >
                  {{ pageNumber }}
                </button>
              }

              <button
                type="button"
                class="inline-flex h-9 items-center rounded-lg border border-border/80 px-3 text-sm font-medium text-foreground transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground"
                [disabled]="!canGoNext()"
                (click)="goToNextPage()"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      @if (rowMenu(); as menu) {
        <div
          uiAppendToBody
          class="fixed z-[200] min-w-[10.5rem] rounded-lg border border-border/80 bg-background py-1 shadow-lg"
          [style.top.px]="menu.top"
          [style.left.px]="menu.left"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50"
            (click)="viewClient(menu.client)"
          >
            <svg class="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Zm10 3a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
              />
            </svg>
            View
          </button>
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50"
            (click)="openClient(menu.client)"
          >
            <svg class="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M15 3h6v6M10 14 21 3l7-7M21 3h-6v6"
              />
            </svg>
            Open
          </button>
          @if (isPendingInvite(menu.client.status)) {
            <button
              type="button"
              class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="resendingClientId() === menu.client.id"
              (click)="resendInvite(menu.client.id)"
            >
              <svg class="h-4 w-4 shrink-0 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"
                />
              </svg>
              {{ resendingClientId() === menu.client.id ? 'Sending...' : 'Resend invite' }}
            </button>
          }
        </div>
      }

      <app-client-view-dialog
        [open]="viewDialogOpen()"
        [clientId]="viewDialogClientId()"
        (openChange)="onViewDialogOpenChange($event)"
        (openClient)="openClientFromView($event)"
      />
    </div>
  `,
  host: {
    '(document:click)': 'closeMenus()',
    '(window:scroll)': 'closeRowMenu()',
    '(window:resize)': 'closeRowMenu()',
  },
})
export class ClientsListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastNotificationService);

  protected readonly clientStore = inject(ClientStore);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: '',
  });

  protected readonly activeStatusTab = signal<StatusTab>('all');
  protected readonly sortKey = signal<SortKey>('company');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly rowMenu = signal<RowActionMenu | null>(null);
  protected readonly viewDialogOpen = signal(false);
  protected readonly viewDialogClientId = signal<string | null>(null);
  protected readonly resendingClientId = signal<string | null>(null);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 50] as const;

  protected readonly statusTabs: ReadonlyArray<StatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 1, label: 'Pending invite' },
    { id: 2, label: 'Active' },
    { id: 3, label: 'Inactive' },
    { id: 4, label: 'Suspended' },
  ];

  protected readonly tableColumns: ReadonlyArray<TableColumn> = [
    { key: 'company', label: 'Client', sortable: true },
    { key: 'contact', label: 'Contact', sortable: true },
    { key: 'email', label: 'Email', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'invitedAt', label: 'Invited', sortable: true },
    { key: 'onboardedAt', label: 'Onboarded', sortable: true },
  ];

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.clientStore.totalCount() / this.pageSize())),
  );

  protected readonly visiblePageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected readonly resultsSummary = computed(() => {
    const total = this.clientStore.totalCount();
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `Showing ${start}-${end} of ${total} results`;
  });

  protected readonly displayedClients = computed(() => {
    const sortKey = this.sortKey();
    const sortDirection = this.sortDirection();
    const clients = [...this.clientStore.clients()];

    clients.sort((left, right) => compareClients(left, right, sortKey, sortDirection));
    return clients;
  });

  ngOnInit(): void {
    void this.applyFilters();

    this.filterForm.controls.search.valueChanges.subscribe(() => {
      this.page.set(1);
      void this.applyFilters();
    });
  }

  protected setStatusTab(tab: StatusTab): void {
    this.activeStatusTab.set(tab);
    this.page.set(1);
    void this.applyFilters();
  }

  protected canGoPrevious(): boolean {
    return this.page() > 1;
  }

  protected canGoNext(): boolean {
    return this.page() < this.totalPages() && this.clientStore.totalCount() > 0;
  }

  protected goToPreviousPage(): void {
    if (!this.canGoPrevious()) {
      return;
    }

    this.page.update((current) => current - 1);
    void this.applyFilters();
  }

  protected goToNextPage(): void {
    if (!this.canGoNext()) {
      return;
    }

    this.page.update((current) => current + 1);
    void this.applyFilters();
  }

  protected goToPage(pageNumber: number): void {
    if (pageNumber === this.page() || pageNumber < 1 || pageNumber > this.totalPages()) {
      return;
    }

    this.page.set(pageNumber);
    void this.applyFilters();
  }

  protected onPageSizeChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    const nextPageSize = Number.parseInt(select.value, 10);
    if (Number.isNaN(nextPageSize) || nextPageSize === this.pageSize()) {
      return;
    }

    this.pageSize.set(nextPageSize);
    this.page.set(1);
    void this.applyFilters();
  }

  protected closeMenus(): void {
    this.rowMenu.set(null);
  }

  protected closeRowMenu(): void {
    this.rowMenu.set(null);
  }

  protected toggleRowMenu(client: ClientSummary, event: MouseEvent): void {
    event.stopPropagation();

    if (this.rowMenu()?.client.id === client.id) {
      this.rowMenu.set(null);
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 168;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    this.rowMenu.set({
      client,
      top: rect.bottom + 4,
      left,
    });
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.set(this.sortDirection() === 'asc' ? 'desc' : 'asc');
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set('asc');
  }

  protected sortIconPath(key: SortKey): string {
    if (this.sortKey() !== key) {
      return 'M8 9l4-4 4 4M8 15l4 4 4-4';
    }

    return this.sortDirection() === 'asc'
      ? 'M8 9l4-4 4 4'
      : 'M8 15l4 4 4-4';
  }

  protected goToInviteOnboarding(): void {
    void this.router.navigate(['/clients/invite-onboarding']);
  }

  protected viewClient(client: ClientSummary): void {
    this.rowMenu.set(null);
    this.viewDialogClientId.set(client.id);
    this.viewDialogOpen.set(true);
  }

  protected onViewDialogOpenChange(open: boolean): void {
    this.viewDialogOpen.set(open);
    if (!open) {
      this.viewDialogClientId.set(null);
    }
  }

  protected openClientFromView(client: ClientDetail): void {
    this.viewDialogOpen.set(false);
    this.viewDialogClientId.set(null);
    void this.router.navigate(['/clients', client.id]);
  }

  protected openClient(client: ClientSummary): void {
    this.rowMenu.set(null);
    void this.router.navigate(['/clients', client.id]);
  }

  protected isPendingInvite(status: ClientSummary['status']): boolean {
    return normalizeClientStatus(status) === CLIENT_STATUS_INVITED;
  }

  protected formatClientStatus(status: ClientSummary['status']): string {
    return formatClientStatus(status);
  }

  protected clientStatusClass(status: ClientSummary['status']): string {
    const base = 'inline-flex rounded-md px-2.5 py-1 text-xs font-medium';
    switch (normalizeClientStatus(status)) {
      case 1:
        return `${base} bg-amber-100 text-amber-800`;
      case 2:
        return `${base} bg-emerald-100 text-emerald-700`;
      case 3:
        return `${base} bg-neutral-100 text-neutral-600`;
      case 4:
        return `${base} bg-rose-100 text-rose-700`;
      default:
        return `${base} bg-neutral-100 text-neutral-600`;
    }
  }

  protected formatDate(value: string): string {
    return formatDate(value);
  }

  protected formatOptionalDate(value: string | null | undefined): string {
    if (value === null || value === undefined || value.trim() === '') {
      return '—';
    }

    return formatDate(value);
  }

  protected async resendInvite(clientId: string): Promise<void> {
    this.rowMenu.set(null);
    this.resendingClientId.set(clientId);
    try {
      const success = await this.clientStore.resendClientInvitation(clientId);
      if (success) {
        this.toast.success('Invitation email resent successfully.');
      }
    } finally {
      this.resendingClientId.set(null);
    }
  }

  private async applyFilters(): Promise<void> {
    const filters = this.filterForm.getRawValue();
    const activeStatusTab = this.activeStatusTab();

    await this.clientStore.loadClients({
      status: activeStatusTab === 'all' ? undefined : String(activeStatusTab),
      search: filters.search.trim() === '' ? undefined : filters.search.trim(),
      page: this.page(),
      pageSize: this.pageSize(),
    });
  }
}

function normalizeClientStatus(status: ClientSummary['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatClientStatus(status: ClientSummary['status']): string {
  switch (normalizeClientStatus(status)) {
    case 1:
      return 'Pending invite';
    case 2:
      return 'Active';
    case 3:
      return 'Inactive';
    case 4:
      return 'Suspended';
    default: {
      const statusText = String(status).trim();
      return statusText === '' ? 'Unknown' : statusText;
    }
  }
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function compareClients(
  left: ClientSummary,
  right: ClientSummary,
  key: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  switch (key) {
    case 'company':
      return multiplier * left.companyName.localeCompare(right.companyName);
    case 'contact':
      return multiplier * left.contactName.localeCompare(right.contactName);
    case 'email':
      return multiplier * left.email.localeCompare(right.email);
    case 'status':
      return multiplier * (normalizeClientStatus(left.status) - normalizeClientStatus(right.status));
    case 'invitedAt':
      return multiplier * (Date.parse(left.invitedAt) - Date.parse(right.invitedAt));
    case 'onboardedAt': {
      const leftValue = left.onboardedAt ?? '';
      const rightValue = right.onboardedAt ?? '';
      return multiplier * (Date.parse(leftValue) - Date.parse(rightValue));
    }
    default:
      return 0;
  }
}
