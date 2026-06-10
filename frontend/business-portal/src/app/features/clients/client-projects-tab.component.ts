import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  effect,
  inject,
  input,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import {
  ProjectDashboard,
  ProjectStatus,
  ProjectSummary,
} from '@/app/core/api/services/project-api.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { AppendToBodyDirective } from '@/components/ui/append-to-body.directive';
import { CreateProjectDialogComponent } from '../projects/create-project-dialog.component';
import { ProjectViewDialogComponent } from '../projects/project-view-dialog.component';

type StatusTab = 'all' | ProjectStatus;
type SortKey = 'name' | 'status' | 'budget' | 'startDate' | 'endDate';
type SortDirection = 'asc' | 'desc';

interface RowActionMenu {
  readonly project: ProjectSummary;
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
  selector: 'app-client-projects-tab',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    AppendToBodyDirective,
    CreateProjectDialogComponent,
    ProjectViewDialogComponent,
  ],
  template: `
    <div class="space-y-4">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap gap-1">
          @for (tab of statusTabs; track tab.id) {
            <button
              type="button"
              class="rounded-lg px-3 py-1.5 text-sm font-medium transition-colors"
              [class.bg-neutral-100]="activeStatusTab() === tab.id"
              [class.text-foreground]="activeStatusTab() === tab.id"
              [class.dark:bg-neutral-800]="activeStatusTab() === tab.id"
              [class.text-muted-foreground]="activeStatusTab() !== tab.id"
              [class.hover:text-foreground]="activeStatusTab() !== tab.id"
              (click)="setStatusTab(tab.id)"
            >
              {{ tab.label }}
            </button>
          }
        </div>

        <button
          type="button"
          class="inline-flex h-9 shrink-0 items-center rounded-lg bg-neutral-950 px-4 text-sm font-medium text-white transition-colors hover:bg-neutral-800 dark:bg-white dark:text-neutral-950 dark:hover:bg-neutral-200"
          (click)="openCreateProjectDialog()"
        >
          + Create Project
        </button>
      </div>

      <app-create-project-dialog
        [open]="createProjectDialogOpen()"
        [clientId]="clientId()"
        [clientName]="clientName()"
        (openChange)="onCreateProjectDialogOpenChange($event)"
        (created)="onProjectCreated()"
      />

      <form class="max-w-md" [formGroup]="filterForm" (ngSubmit)="$event.preventDefault()">
        <div class="relative min-w-0">
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
            formControlName="search"
          />
        </div>
      </form>

      @if (projectStore.error(); as error) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error }}
        </p>
      }

      <div class="overflow-x-auto rounded-lg border border-border/70 bg-background dark:border-white/10">
        <table class="w-full min-w-[760px] text-sm">
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
            @if (projectStore.isLoading()) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="6">
                  Loading projects...
                </td>
              </tr>
            } @else if (displayedProjects().length === 0) {
              <tr>
                <td class="px-3 py-12 text-center text-muted-foreground" colspan="6">
                  No projects matched your search or filter criteria.
                </td>
              </tr>
            } @else {
              @for (project of displayedProjects(); track project.id) {
                <tr class="border-b border-border/50">
                  <td class="px-3 py-4">
                    <div class="flex items-center gap-3">
                      <span
                        class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400"
                      >
                        <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"
                          />
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M3.3 7.7 12 12.5l8.7-4.8M12 22V12.5"
                          />
                        </svg>
                      </span>
                      <div class="min-w-0">
                        <p class="truncate font-medium text-foreground">{{ project.name }}</p>
                        <p class="mt-0.5 truncate text-xs text-muted-foreground">
                          Ends {{ formatDate(project.endDate) }}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td class="px-3 py-4">
                    <span [class]="projectStatusClass(project.status)">
                      {{ formatProjectStatus(project.status) }}
                    </span>
                  </td>
                  <td class="px-3 py-4 font-medium text-foreground">
                    {{ formatBudget(project.budget, project.currency) }}
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">
                    {{ formatDate(project.startDate) }}
                  </td>
                  <td class="px-3 py-4 text-muted-foreground">
                    {{ formatDate(project.endDate) }}
                  </td>
                  <td class="px-3 py-4">
                    <button
                      type="button"
                      class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-neutral-100 hover:text-foreground dark:hover:bg-neutral-800"
                      [attr.aria-label]="'Actions for ' + project.name"
                      [attr.aria-expanded]="rowMenu()?.project?.id === project.id"
                      (click)="toggleRowMenu(project, $event)"
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
                [class.dark:hover:bg-neutral-800]="canGoPrevious()"
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
                  [class.dark:border-white]="pageNumber === page()"
                  [class.dark:bg-white]="pageNumber === page()"
                  [class.dark:text-neutral-950]="pageNumber === page()"
                  [class.border-border/80]="pageNumber !== page()"
                  [class.text-foreground]="pageNumber !== page()"
                  [class.hover:bg-neutral-50]="pageNumber !== page()"
                  [class.dark:hover:bg-neutral-800]="pageNumber !== page()"
                  (click)="goToPage(pageNumber)"
                >
                  {{ pageNumber }}
                </button>
              }

              <button
                type="button"
                class="inline-flex h-9 items-center rounded-lg border border-border/80 px-3 text-sm font-medium text-foreground transition-colors hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:text-muted-foreground dark:hover:bg-neutral-800"
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
          class="fixed z-[200] min-w-[10.5rem] rounded-lg border border-border/80 bg-background py-1 shadow-lg dark:border-white/10"
          [style.top.px]="menu.top"
          [style.left.px]="menu.left"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
            (click)="viewProject(menu.project)"
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
            class="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800"
            (click)="openProject(menu.project)"
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
        </div>
      }

      <app-project-view-dialog
        [open]="viewDialogOpen()"
        [projectId]="viewDialogProjectId()"
        (openChange)="onViewDialogOpenChange($event)"
        (openWorkspace)="openProjectFromView($event)"
      />
    </div>
  `,
  host: {
    '(document:click)': 'closeMenus()',
    '(window:scroll)': 'closeRowMenu()',
    '(window:resize)': 'closeRowMenu()',
  },
})
export class ClientProjectsTabComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);

  readonly clientId = input.required<string>();
  readonly clientName = input('');

  protected readonly projectStore = inject(ProjectStore);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: '',
  });

  protected readonly activeStatusTab = signal<StatusTab>('all');
  protected readonly sortKey = signal<SortKey>('name');
  protected readonly sortDirection = signal<SortDirection>('asc');
  protected readonly rowMenu = signal<RowActionMenu | null>(null);
  protected readonly viewDialogOpen = signal(false);
  protected readonly viewDialogProjectId = signal<string | null>(null);
  protected readonly createProjectDialogOpen = signal(false);
  protected readonly page = signal(1);
  protected readonly pageSize = signal(10);
  protected readonly pageSizeOptions = [10, 20, 50] as const;

  protected readonly statusTabs: ReadonlyArray<StatusTabOption> = [
    { id: 'all', label: 'All' },
    { id: 1, label: 'Planned' },
    { id: 2, label: 'In Progress' },
    { id: 3, label: 'On Hold' },
    { id: 4, label: 'Completed' },
    { id: 5, label: 'Cancelled' },
  ];

  protected readonly tableColumns: ReadonlyArray<TableColumn> = [
    { key: 'name', label: 'Project', sortable: true },
    { key: 'status', label: 'Status', sortable: true },
    { key: 'budget', label: 'Budget', sortable: true },
    { key: 'startDate', label: 'Start', sortable: true },
    { key: 'endDate', label: 'End', sortable: true },
  ];

  protected readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.projectStore.totalCount() / this.pageSize())),
  );

  protected readonly visiblePageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_, index) => index + 1),
  );

  protected readonly resultsSummary = computed(() => {
    const total = this.projectStore.totalCount();
    if (total === 0) {
      return 'Showing 0 of 0 results';
    }

    const start = (this.page() - 1) * this.pageSize() + 1;
    const end = Math.min(this.page() * this.pageSize(), total);
    return `Showing ${start}-${end} of ${total} results`;
  });

  protected readonly displayedProjects = computed(() => {
    const sortKey = this.sortKey();
    const sortDirection = this.sortDirection();
    const projects = [...this.projectStore.projects()];

    projects.sort((left, right) => compareProjects(left, right, sortKey, sortDirection));
    return projects;
  });

  constructor() {
    effect(() => {
      const clientId = this.clientId().trim();
      if (clientId === '') {
        return;
      }

      this.page.set(1);
      void this.applyFilters();
    });
  }

  ngOnInit(): void {
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

  protected openCreateProjectDialog(): void {
    this.createProjectDialogOpen.set(true);
  }

  protected onCreateProjectDialogOpenChange(open: boolean): void {
    this.createProjectDialogOpen.set(open);
  }

  protected async onProjectCreated(): Promise<void> {
    this.createProjectDialogOpen.set(false);
    await this.applyFilters();
  }

  protected canGoPrevious(): boolean {
    return this.page() > 1;
  }

  protected canGoNext(): boolean {
    return this.page() < this.totalPages() && this.projectStore.totalCount() > 0;
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

  protected toggleRowMenu(project: ProjectSummary, event: MouseEvent): void {
    event.stopPropagation();

    if (this.rowMenu()?.project.id === project.id) {
      this.rowMenu.set(null);
      return;
    }

    const trigger = event.currentTarget as HTMLElement;
    const rect = trigger.getBoundingClientRect();
    const menuWidth = 136;
    const left = Math.max(8, Math.min(rect.right - menuWidth, window.innerWidth - menuWidth - 8));

    this.rowMenu.set({
      project,
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

  protected viewProject(project: ProjectSummary): void {
    this.rowMenu.set(null);
    this.viewDialogProjectId.set(project.id);
    this.viewDialogOpen.set(true);
  }

  protected onViewDialogOpenChange(open: boolean): void {
    this.viewDialogOpen.set(open);
    if (!open) {
      this.viewDialogProjectId.set(null);
    }
  }

  protected openProjectFromView(project: ProjectDashboard): void {
    this.viewDialogOpen.set(false);
    this.viewDialogProjectId.set(null);
    void this.router.navigate(['/clients', project.clientId, 'projects', project.id]);
  }

  protected openProject(project: ProjectSummary): void {
    this.rowMenu.set(null);
    void this.router.navigate(['/clients', project.clientId, 'projects', project.id]);
  }

  protected formatProjectStatus(status: ProjectSummary['status']): string {
    return formatProjectStatus(status);
  }

  protected projectStatusClass(status: ProjectSummary['status']): string {
    const base = 'inline-flex rounded-md px-2.5 py-1 text-xs font-medium';
    switch (normalizeProjectStatus(status)) {
      case 1:
        return `${base} bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400`;
      case 2:
        return `${base} bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400`;
      case 3:
        return `${base} bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-400`;
      case 4:
        return `${base} bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400`;
      case 5:
        return `${base} bg-neutral-100 text-neutral-600 dark:bg-neutral-500/15 dark:text-neutral-400`;
      default:
        return `${base} bg-neutral-100 text-neutral-600`;
    }
  }

  protected formatBudget(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency.trim() === '' ? 'USD' : currency,
        minimumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${currency} ${amount.toFixed(2)}`;
    }
  }

  protected formatDate(value: string): string {
    return formatDate(value);
  }

  private async applyFilters(): Promise<void> {
    const clientId = this.clientId().trim();
    if (clientId === '') {
      return;
    }

    const filters = this.filterForm.getRawValue();
    const activeStatusTab = this.activeStatusTab();

    await this.projectStore.loadProjects({
      clientId,
      status: activeStatusTab === 'all' ? undefined : activeStatusTab,
      search: filters.search.trim() === '' ? undefined : filters.search.trim(),
      page: this.page(),
      pageSize: this.pageSize(),
    });
  }
}

function normalizeProjectStatus(status: ProjectSummary['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatProjectStatus(status: ProjectSummary['status']): string {
  switch (normalizeProjectStatus(status)) {
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

function compareProjects(
  left: ProjectSummary,
  right: ProjectSummary,
  key: SortKey,
  direction: SortDirection,
): number {
  const multiplier = direction === 'asc' ? 1 : -1;

  switch (key) {
    case 'name':
      return multiplier * left.name.localeCompare(right.name);
    case 'status':
      return multiplier * (normalizeProjectStatus(left.status) - normalizeProjectStatus(right.status));
    case 'budget':
      return multiplier * (left.budget - right.budget);
    case 'startDate':
      return multiplier * (Date.parse(left.startDate) - Date.parse(right.startDate));
    case 'endDate':
      return multiplier * (Date.parse(left.endDate) - Date.parse(right.endDate));
    default:
      return 0;
  }
}
