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

import {
  ClientPortalApiService,
  ClientPortalProjectListItem,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { EmptyStateComponent } from '@/components/ui/empty-state.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'In progress',
  3: 'On hold',
  4: 'Completed',
  5: 'Cancelled',
};

type StatusTab = 'all' | 1 | 2 | 3 | 4 | 5;
type SortKey = 'name' | 'status' | 'endDate' | 'progress' | 'activity';

interface StatusTabOption {
  readonly id: StatusTab;
  readonly label: string;
}

const STATUS_TABS: ReadonlyArray<StatusTabOption> = [
  { id: 'all', label: 'All' },
  { id: 1, label: 'Planned' },
  { id: 2, label: 'In progress' },
  { id: 3, label: 'On hold' },
  { id: 4, label: 'Completed' },
  { id: 5, label: 'Cancelled' },
];

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

@Component({
  selector: 'app-client-projects-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="pb-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Projects</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Browse project status, milestone progress, and recent updates.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading projects...</p>
      } @else if (projects().length === 0) {
        <ui-empty-state
          title="No projects yet"
          message="When your business adds projects for you, they will appear here."
        />
      } @else {
        <div class="flex flex-wrap gap-1 pb-1">
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
              <span class="ml-1 text-xs text-muted-foreground">({{ statusCount(tab.id) }})</span>
            </button>
          }
        </div>

        <div class="relative max-w-md">
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
            placeholder="Search projects..."
            [value]="searchQuery()"
            (input)="onSearchInput($event)"
          />
        </div>

        <div class="overflow-x-auto rounded-lg border border-border/70 bg-background">
          <table class="w-full min-w-[760px] text-sm">
            <thead>
              <tr class="border-b border-border/70 text-left text-muted-foreground">
                <th class="px-3 py-3 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="toggleSort('name')">
                    Project
                    <span class="text-xs opacity-60">{{ sortIndicator('name') }}</span>
                  </button>
                </th>
                <th class="px-3 py-3 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="toggleSort('status')">
                    Status
                    <span class="text-xs opacity-60">{{ sortIndicator('status') }}</span>
                  </button>
                </th>
                <th class="px-3 py-3 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="toggleSort('progress')">
                    Progress
                    <span class="text-xs opacity-60">{{ sortIndicator('progress') }}</span>
                  </button>
                </th>
                <th class="px-3 py-3 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="toggleSort('endDate')">
                    Due date
                    <span class="text-xs opacity-60">{{ sortIndicator('endDate') }}</span>
                  </button>
                </th>
                <th class="px-3 py-3 font-medium">
                  <button type="button" class="inline-flex items-center gap-1 hover:text-foreground" (click)="toggleSort('activity')">
                    Last activity
                    <span class="text-xs opacity-60">{{ sortIndicator('activity') }}</span>
                  </button>
                </th>
                <th class="w-10 px-3 py-3" aria-label="Open"></th>
              </tr>
            </thead>
            <tbody>
              @if (paginatedProjects().length === 0) {
                <tr>
                  <td class="px-3 py-12 text-center text-muted-foreground" colspan="6">
                    No projects matched your search or filter.
                  </td>
                </tr>
              } @else {
                @for (project of paginatedProjects(); track project.id) {
                  <tr class="border-b border-border/50 transition-colors hover:bg-muted/30">
                    <td class="px-3 py-3">
                      <div class="min-w-0">
                        <a
                          [routerLink]="['/projects', project.id]"
                          class="truncate font-medium text-foreground hover:text-primary hover:underline"
                        >
                          {{ project.name }}
                        </a>
                        <p class="mt-0.5 truncate text-xs text-muted-foreground">
                          {{ formatDate(project.startDate) }} – {{ formatDate(project.endDate) }}
                        </p>
                      </div>
                    </td>
                    <td class="px-3 py-3">
                      <ui-status-badge [status]="statusLabel(project.status)" />
                    </td>
                    <td class="px-3 py-3">
                      <div class="flex min-w-[8rem] items-center gap-2">
                        <div class="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            class="h-full rounded-full bg-foreground transition-all"
                            [style.width.%]="project.milestoneProgress.progressPercent"
                          ></div>
                        </div>
                        <span class="shrink-0 text-xs text-muted-foreground">
                          {{ project.milestoneProgress.completedCount }}/{{ project.milestoneProgress.totalCount }}
                        </span>
                      </div>
                    </td>
                    <td class="px-3 py-3 text-muted-foreground">
                      {{ formatDate(project.endDate) }}
                    </td>
                    <td class="px-3 py-3">
                      @if (latestActivity(project); as activity) {
                        <p class="max-w-[14rem] truncate text-foreground">{{ activity.description }}</p>
                        <p class="text-xs text-muted-foreground">{{ formatDateTime(activity.occurredAtUtc) }}</p>
                      } @else {
                        <span class="text-muted-foreground">—</span>
                      }
                    </td>
                    <td class="px-3 py-3">
                      <a
                        [routerLink]="['/projects', project.id]"
                        class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                        [attr.aria-label]="'Open ' + project.name"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="m9 6 6 6-6 6" />
                        </svg>
                      </a>
                    </td>
                  </tr>
                }
              }
            </tbody>
          </table>
        </div>

        <footer class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">
            Showing {{ pageRangeStart() }}–{{ pageRangeEnd() }} of {{ filteredProjects().length }} projects
          </p>

          <div class="flex flex-wrap items-center gap-3">
            <label class="flex items-center gap-2 text-sm text-muted-foreground">
              Rows
              <select
                class="h-8 rounded-lg border border-border/80 bg-background px-2 text-sm text-foreground"
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
                class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border/80 px-2 text-sm transition-colors hover:bg-muted disabled:opacity-40"
                [disabled]="currentPage() <= 1"
                (click)="goToPage(currentPage() - 1)"
              >
                Prev
              </button>
              @for (page of visiblePages(); track page) {
                <button
                  type="button"
                  class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg px-2 text-sm transition-colors"
                  [class.bg-neutral-950]="page === currentPage()"
                  [class.text-white]="page === currentPage()"
                  [class.hover:bg-muted]="page !== currentPage()"
                  (click)="goToPage(page)"
                >
                  {{ page }}
                </button>
              }
              <button
                type="button"
                class="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border/80 px-2 text-sm transition-colors hover:bg-muted disabled:opacity-40"
                [disabled]="currentPage() >= totalPages()"
                (click)="goToPage(currentPage() + 1)"
              >
                Next
              </button>
            </div>
          </div>
        </footer>
      }
    </main>
  `,
})
export class ClientProjectsListComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly statusTabs = STATUS_TABS;
  protected readonly pageSizeOptions = PAGE_SIZE_OPTIONS;

  protected readonly projects = signal<ClientPortalProjectListItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly activeStatusTab = signal<StatusTab>('all');
  protected readonly sortKey = signal<SortKey>('endDate');
  protected readonly sortDirection = signal<'asc' | 'desc'>('asc');
  protected readonly currentPage = signal(1);
  protected readonly pageSize = signal<number>(10);

  protected readonly filteredProjects = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const tab = this.activeStatusTab();

    return this.projects().filter((project) => {
      if (tab !== 'all' && project.status !== tab) {
        return false;
      }

      if (query !== '' && !project.name.toLowerCase().includes(query)) {
        return false;
      }

      return true;
    });
  });

  protected readonly sortedProjects = computed(() => {
    const items = [...this.filteredProjects()];
    const key = this.sortKey();
    const direction = this.sortDirection();
    const multiplier = direction === 'asc' ? 1 : -1;

    items.sort((left, right) => {
      switch (key) {
        case 'name':
          return multiplier * left.name.localeCompare(right.name);
        case 'status':
          return multiplier * (left.status - right.status);
        case 'progress':
          return multiplier * (left.milestoneProgress.progressPercent - right.milestoneProgress.progressPercent);
        case 'endDate':
          return multiplier * (Date.parse(left.endDate) - Date.parse(right.endDate));
        case 'activity': {
          const leftTime = this.latestActivityTimestamp(left);
          const rightTime = this.latestActivityTimestamp(right);
          return multiplier * (leftTime - rightTime);
        }
        default:
          return 0;
      }
    });

    return items;
  });

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.sortedProjects().length / this.pageSize())),
  );

  protected readonly paginatedProjects = computed(() => {
    const page = Math.min(this.currentPage(), this.totalPages());
    const start = (page - 1) * this.pageSize();
    return this.sortedProjects().slice(start, start + this.pageSize());
  });

  protected readonly pageRangeStart = computed(() => {
    if (this.filteredProjects().length === 0) {
      return 0;
    }

    return (Math.min(this.currentPage(), this.totalPages()) - 1) * this.pageSize() + 1;
  });

  protected readonly pageRangeEnd = computed(() => {
    const end = Math.min(this.currentPage(), this.totalPages()) * this.pageSize();
    return Math.min(end, this.filteredProjects().length);
  });

  protected readonly visiblePages = computed(() => {
    const total = this.totalPages();
    const current = Math.min(this.currentPage(), total);
    const pages: number[] = [];

    const start = Math.max(1, current - 2);
    const end = Math.min(total, start + 4);

    for (let page = start; page <= end; page += 1) {
      pages.push(page);
    }

    return pages;
  });

  async ngOnInit(): Promise<void> {
    try {
      const result = await firstValueFrom(this.clientPortalApi.getProjects());
      this.projects.set(result.projects);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load projects.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected statusLabel(status: number): string {
    return PROJECT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusCount(tab: StatusTab): number {
    if (tab === 'all') {
      return this.projects().length;
    }

    return this.projects().filter((project) => project.status === tab).length;
  }

  protected setStatusTab(tab: StatusTab): void {
    this.activeStatusTab.set(tab);
    this.currentPage.set(1);
  }

  protected onSearchInput(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.searchQuery.set(target.value);
    this.currentPage.set(1);
  }

  protected toggleSort(key: SortKey): void {
    if (this.sortKey() === key) {
      this.sortDirection.update((direction) => (direction === 'asc' ? 'desc' : 'asc'));
      return;
    }

    this.sortKey.set(key);
    this.sortDirection.set('asc');
  }

  protected sortIndicator(key: SortKey): string {
    if (this.sortKey() !== key) {
      return '↕';
    }

    return this.sortDirection() === 'asc' ? '↑' : '↓';
  }

  protected onPageSizeChange(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLSelectElement)) {
      return;
    }

    this.pageSize.set(Number(target.value));
    this.currentPage.set(1);
  }

  protected goToPage(page: number): void {
    const nextPage = Math.min(Math.max(page, 1), this.totalPages());
    this.currentPage.set(nextPage);
  }

  protected latestActivity(project: ClientPortalProjectListItem) {
    return project.recentActivity[0] ?? null;
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  private latestActivityTimestamp(project: ClientPortalProjectListItem): number {
    const activity = project.recentActivity[0];
    if (activity === undefined) {
      return 0;
    }

    const timestamp = Date.parse(activity.occurredAtUtc);
    return Number.isNaN(timestamp) ? 0 : timestamp;
  }
}
