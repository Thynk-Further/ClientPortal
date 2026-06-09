import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { BusinessPortalBreadcrumbService } from '@/app/core/layout/business-portal-breadcrumb.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import {
  MilestoneStatus,
  ProjectDashboard,
  ProjectDashboardMilestone,
  ProjectDashboardTask,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@/app/core/api/services/project-api.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { StatCardComponent } from '@/components/ui/stat-card.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
import { CreateTaskDialogComponent } from './create-task-dialog.component';
import { ProjectHealthBadgeComponent } from './project-health-badge.component';

type ProjectTab = 'overview' | 'milestones' | 'tasks' | 'risks' | 'requests' | 'activity';

interface TabDefinition {
  readonly key: ProjectTab;
  readonly label: string;
}

interface KanbanColumn {
  readonly status: ProjectTaskStatus;
  readonly title: string;
}

@Component({
  selector: 'app-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    StatCardComponent,
    StatusBadgeComponent,
    CreateTaskDialogComponent,
    ProjectHealthBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-2">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">{{ dashboard()?.name ?? 'Project workspace' }}</h1>
              <p class="text-sm text-muted-foreground">{{ dashboard()?.description ?? 'Loading project...' }}</p>
            </div>
            @if (dashboard(); as project) {
              <div class="flex items-center gap-2">
                <app-project-health-badge [health]="project.health" />
                <ui-status-badge [status]="formatProjectStatus(project.status)" />
              </div>
            }
          </div>
        </header>

        @if (projectStore.error(); as error) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ error }}
          </p>
        }

        <section class="rounded-xl border bg-card p-2" aria-label="Project detail tabs">
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

        @if (projectStore.isLoading() && dashboard() === null) {
          <p class="text-sm text-muted-foreground">Loading project workspace...</p>
        } @else if (dashboard(); as project) {
          @switch (activeTab()) {
            @case ('overview') {
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
            }
            @case ('milestones') {
              <ui-card>
                <ui-card-header>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="min-w-0 space-y-1">
                      <ui-card-title>Milestones</ui-card-title>
                      <ui-card-description>Define delivery phases and track completion.</ui-card-description>
                    </div>
                    <ui-button
                      variant="outline"
                      [label]="showCreateMilestoneForm() ? 'Cancel' : 'Add milestone'"
                      (clicked)="toggleCreateMilestoneForm()"
                    />
                  </div>
                </ui-card-header>
                <ui-card-content class="space-y-4">
                  @if (showCreateMilestoneForm()) {
                    <form class="grid gap-3 rounded-md border p-3 sm:grid-cols-2" (submit)="submitCreateMilestone($event)">
                      <input
                        class="rounded-md border px-3 py-2 text-sm sm:col-span-2"
                        placeholder="Milestone name"
                        required
                        [value]="newMilestoneName()"
                        (input)="onNewMilestoneNameInput($event)"
                      />
                      <input
                        type="date"
                        class="rounded-md border px-3 py-2 text-sm"
                        required
                        [value]="newMilestoneDueDate()"
                        (input)="onNewMilestoneDueDateInput($event)"
                      />
                      <ui-button type="submit" label="Save milestone" />
                    </form>
                  }

                  @if (project.milestones.length === 0) {
                    <p class="text-sm text-muted-foreground">No milestones yet.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (milestone of project.milestones; track milestone.id) {
                        <li class="rounded-md border p-3 text-sm">
                          @if (editingMilestoneId() === milestone.id) {
                            <form class="grid gap-3 sm:grid-cols-2" (submit)="saveMilestoneEdit($event, milestone)">
                              <input
                                class="rounded-md border px-3 py-2 sm:col-span-2"
                                required
                                [value]="editMilestoneName()"
                                (input)="onEditMilestoneNameInput($event)"
                              />
                              <input
                                type="date"
                                class="rounded-md border px-3 py-2"
                                required
                                [value]="editMilestoneDueDate()"
                                (input)="onEditMilestoneDueDateInput($event)"
                              />
                              <div class="flex gap-2">
                                <ui-button type="submit" label="Save" />
                                <ui-button type="button" variant="outline" label="Cancel" (clicked)="cancelMilestoneEdit()" />
                              </div>
                            </form>
                          } @else {
                            <div class="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <p class="font-medium">{{ milestone.name }}</p>
                                <p class="text-muted-foreground">Due {{ formatMilestoneDueDate(milestone.dueDate) }}</p>
                              </div>
                              <div class="flex flex-wrap items-center gap-2">
                                <ui-status-badge [status]="milestone.status === 2 ? 'Completed' : 'Planned'" />
                                @if (milestone.status !== 2) {
                                  <ui-button variant="outline" label="Edit" (clicked)="startMilestoneEdit(milestone)" />
                                  <ui-button variant="outline" label="Complete" (clicked)="completeMilestone(milestone.id)" />
                                  <ui-button variant="outline" label="Delete" (clicked)="deleteMilestone(milestone.id)" />
                                }
                              </div>
                            </div>
                          }
                        </li>
                      }
                    </ul>
                  }
                </ui-card-content>
              </ui-card>
            }
            @case ('tasks') {
              <ui-card>
                <ui-card-header>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div class="min-w-0 space-y-1">
                      <ui-card-title>Board</ui-card-title>
                      <ui-card-description>
                        Drag cards between columns or change status from the card menu.
                      </ui-card-description>
                    </div>
                    <ui-button
                      variant="outline"
                      label="Add task"
                      [disabled]="project.milestones.length === 0"
                      (clicked)="openCreateTaskDialog(project)"
                    />
                  </div>
                </ui-card-header>
                <ui-card-content class="space-y-4">
                  @if (project.milestones.length === 0) {
                    <p class="text-sm text-amber-700">
                      Add at least one milestone before creating tasks.
                    </p>
                  }

                  <app-create-task-dialog
                    [open]="createTaskDialogOpen()"
                    [projectId]="projectId()"
                    [milestones]="project.milestones"
                    [defaultDueDate]="project.endDate"
                    [assigneeName]="currentAssigneeLabel()"
                    (openChange)="onCreateTaskDialogOpenChange($event)"
                    (created)="onTaskCreated()"
                  />

                  <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
                    @for (column of kanbanColumns; track column.status) {
                      <section
                        class="rounded-xl border border-border/70 bg-muted/20 p-3 dark:bg-muted/10"
                        (dragover)="onColumnDragOver($event)"
                        (drop)="onColumnDrop($event, column.status)"
                      >
                        <div class="mb-3 flex items-center justify-between gap-2 px-0.5">
                          <h2 class="text-sm font-semibold text-foreground">{{ column.title }}</h2>
                          <span
                            class="grid h-6 min-w-6 place-content-center rounded-full bg-background px-1.5 text-xs font-medium text-muted-foreground shadow-sm"
                          >
                            {{ tasksForColumn(column.status).length }}
                          </span>
                        </div>
                        <ul class="min-h-28 space-y-3">
                          @for (task of tasksForColumn(column.status); track task.id) {
                            <li
                              class="group relative rounded-xl border border-border/70 bg-card p-3.5 text-sm shadow-sm transition-shadow hover:shadow-md dark:border-white/10"
                              draggable="true"
                              (dragstart)="onTaskDragStart($event, task.id)"
                              (dragend)="onTaskDragEnd()"
                              [class.opacity-60]="draggedTaskId() === task.id"
                            >
                              @if (editingTaskId() === task.id) {
                                <form class="space-y-2" (submit)="saveTaskEdit($event, task)">
                                  <input
                                    class="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-neutral-400"
                                    required
                                    [value]="editTaskTitle()"
                                    (input)="onEditTaskTitleInput($event)"
                                  />
                                  <select
                                    class="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-neutral-400"
                                    [value]="editTaskPriority()"
                                    (change)="onEditTaskPriorityChange($event)"
                                  >
                                    <option [value]="1">Low</option>
                                    <option [value]="2">Medium</option>
                                    <option [value]="3">High</option>
                                    <option [value]="4">Critical</option>
                                  </select>
                                  <input
                                    type="date"
                                    class="w-full rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-sm outline-none focus-visible:border-neutral-400"
                                    required
                                    [value]="editTaskDueDate()"
                                    (input)="onEditTaskDueDateInput($event)"
                                  />
                                  <div class="flex gap-2">
                                    <ui-button type="submit" label="Save" />
                                    <ui-button type="button" variant="outline" label="Cancel" (clicked)="cancelTaskEdit()" />
                                  </div>
                                </form>
                              } @else {
                                <div
                                  class="pointer-events-none absolute top-2.5 right-2.5 text-muted-foreground/70 opacity-0 transition-opacity group-hover:opacity-100"
                                  aria-hidden="true"
                                >
                                  <svg class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <circle cx="8" cy="7" r="1.25" />
                                    <circle cx="8" cy="12" r="1.25" />
                                    <circle cx="8" cy="17" r="1.25" />
                                    <circle cx="14" cy="7" r="1.25" />
                                    <circle cx="14" cy="12" r="1.25" />
                                    <circle cx="14" cy="17" r="1.25" />
                                  </svg>
                                </div>

                                <span
                                  class="inline-flex max-w-full truncate rounded-md px-2 py-0.5 text-[11px] font-medium"
                                  [class]="milestoneTagClass(task.milestoneId)"
                                >
                                  {{ milestoneName(project, task.milestoneId) }}
                                </span>

                                <p class="mt-2.5 pr-6 font-semibold leading-snug text-foreground">
                                  {{ task.title }}
                                </p>

                                <div class="mt-4 flex items-end justify-between gap-2">
                                  <div class="flex min-w-0 flex-wrap items-center gap-2">
                                    <span [class]="priorityBadgeClass(task.priority)">
                                      {{ formatPriority(task.priority) }}
                                    </span>
                                    <span class="inline-flex items-center gap-1 text-xs text-muted-foreground">
                                      <svg class="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="1.75"
                                          d="M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
                                        />
                                      </svg>
                                      {{ formatShortDueDate(task.dueDate) }}
                                    </span>
                                  </div>

                                  <div class="relative z-10 flex shrink-0 items-center gap-1.5">
                                    <button
                                      type="button"
                                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-muted hover:text-foreground group-hover:opacity-100"
                                      aria-label="Edit task"
                                      (click)="startTaskEdit(task)"
                                    >
                                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="1.75"
                                          d="m16.5 3.5 4 4L8 20H4v-4L16.5 3.5Z"
                                        />
                                      </svg>
                                    </button>
                                    <button
                                      type="button"
                                      class="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                                      aria-label="Delete task"
                                      (click)="deleteTask(task.id)"
                                    >
                                      <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                        <path
                                          stroke-linecap="round"
                                          stroke-linejoin="round"
                                          stroke-width="1.75"
                                          d="M3 6h18M8 6V4h8v2m-1 0v14H9V6"
                                        />
                                      </svg>
                                    </button>
                                    <span
                                      class="grid h-7 w-7 place-content-center rounded-full bg-muted text-[10px] font-semibold uppercase text-muted-foreground"
                                      [attr.title]="assigneeLabel(task.assigneeId)"
                                    >
                                      {{ assigneeInitials(task.assigneeId) }}
                                    </span>
                                  </div>
                                </div>
                              }
                            </li>
                          }
                        </ul>
                      </section>
                    }
                  </div>
                </ui-card-content>
              </ui-card>
            }
            @case ('risks') {
              <ui-card>
                <ui-card-header>
                  <ui-card-title>Risks</ui-card-title>
                  <ui-card-description>{{ project.openRiskCount }} open risk(s).</ui-card-description>
                </ui-card-header>
                <ui-card-content class="space-y-4">
                  <ui-button label="Add risk" variant="outline" (clicked)="showRiskForm.set(true)" />
                  @if (showRiskForm()) {
                    <form class="grid gap-3 rounded-md border p-3" (submit)="submitRisk($event)">
                      <input class="rounded-md border px-3 py-2 text-sm" placeholder="Risk title" [value]="riskTitle()" (input)="onRiskTitleInput($event)" />
                      <textarea class="rounded-md border px-3 py-2 text-sm" placeholder="Description" rows="3" [value]="riskDescription()" (input)="onRiskDescriptionInput($event)"></textarea>
                      <ui-button type="submit" label="Save risk" />
                    </form>
                  }
                  @if (project.risks.length === 0) {
                    <p class="text-sm text-muted-foreground">No risks recorded.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (risk of project.risks; track risk.id) {
                        <li class="rounded-md border p-3 text-sm">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <p class="font-medium">{{ risk.title }}</p>
                            <ui-status-badge [status]="formatRiskSeverity(risk.severity)" />
                          </div>
                          <p class="mt-1 text-muted-foreground">{{ risk.description }}</p>
                        </li>
                      }
                    </ul>
                  }
                </ui-card-content>
              </ui-card>
            }
            @case ('requests') {
              <ui-card>
                <ui-card-header>
                  <ui-card-title>Client requests</ui-card-title>
                </ui-card-header>
                <ui-card-content>
                  @if (project.requests.length === 0) {
                    <p class="text-sm text-muted-foreground">No client requests for this project.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (request of project.requests; track request.id) {
                        <li class="rounded-md border p-3 text-sm">
                          <p class="font-medium">{{ request.title }}</p>
                          <p class="text-muted-foreground">{{ request.description }}</p>
                        </li>
                      }
                    </ul>
                  }
                </ui-card-content>
              </ui-card>
            }
            @case ('activity') {
              <ui-card>
                <ui-card-header>
                  <ui-card-title>Recent activity</ui-card-title>
                </ui-card-header>
                <ui-card-content>
                  @if (project.recentActivity.length === 0) {
                    <p class="text-sm text-muted-foreground">No recent activity.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (item of project.recentActivity; track item.type + item.occurredAtUtc) {
                        <li class="rounded-md border p-3 text-sm">
                          <p class="font-medium">{{ item.description }}</p>
                          <p class="text-xs text-muted-foreground">{{ item.occurredAtUtc }}</p>
                        </li>
                      }
                    </ul>
                  }
                </ui-card-content>
              </ui-card>
            }
          }
        }
      </section>
    </main>
  `,
})
export class ProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  protected readonly projectStore = inject(ProjectStore);
  private readonly breadcrumbService = inject(BusinessPortalBreadcrumbService);
  private readonly userSession = inject(UserSessionService);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? '',
  );

  protected readonly clientId = computed(() => {
    const fromRoute = this.route.parent?.snapshot.paramMap.get('clientId') ?? '';
    if (fromRoute !== '') {
      return fromRoute;
    }

    return this.dashboard()?.clientId ?? '';
  });

  protected readonly dashboard = computed(() => this.projectStore.selectedProject());

  protected readonly activeTab = signal<ProjectTab>('overview');
  protected readonly showRiskForm = signal(false);
  protected readonly riskTitle = signal('');
  protected readonly riskDescription = signal('');

  protected readonly showCreateMilestoneForm = signal(false);
  protected readonly newMilestoneName = signal('');
  protected readonly newMilestoneDueDate = signal('');
  protected readonly editingMilestoneId = signal<string | null>(null);
  protected readonly editMilestoneName = signal('');
  protected readonly editMilestoneDueDate = signal('');

  protected readonly createTaskDialogOpen = signal(false);
  protected readonly editingTaskId = signal<string | null>(null);
  protected readonly editTaskTitle = signal('');
  protected readonly editTaskPriority = signal<ProjectTaskPriority>(2);
  protected readonly editTaskDueDate = signal('');
  protected readonly draggedTaskId = signal<string | null>(null);

  protected readonly tabs: ReadonlyArray<TabDefinition> = [
    { key: 'overview', label: 'Overview' },
    { key: 'milestones', label: 'Milestones' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'risks', label: 'Risks' },
    { key: 'requests', label: 'Requests' },
    { key: 'activity', label: 'Activity' },
  ];

  protected readonly kanbanColumns: ReadonlyArray<KanbanColumn> = [
    { status: 1, title: 'To Do' },
    { status: 2, title: 'In Progress' },
    { status: 3, title: 'Blocked' },
    { status: 4, title: 'Done' },
  ];

  protected readonly activeTabClasses =
    'bg-primary text-primary-foreground border border-primary';
  protected readonly inactiveTabClasses =
    'bg-background text-foreground border border-input hover:bg-muted';

  protected setActiveTab(tab: ProjectTab): void {
    this.activeTab.set(tab);
  }

  protected readonly completedMilestones = computed(() => {
    const project = this.dashboard();
    if (project === null) {
      return 0;
    }

    return project.milestones.filter((milestone) => milestone.status === 2).length;
  });

  protected readonly overviewStatCards = computed(() => {
    const project = this.dashboard();
    if (project === null) {
      return [];
    }

    return buildProjectOverviewStatCards(project, this.completedMilestones());
  });

  ngOnInit(): void {
    void this.loadProject();
  }

  protected tasksForColumn(status: ProjectTaskStatus): ProjectDashboardTask[] {
    const project = this.dashboard();
    if (project === null) {
      return [];
    }

    return project.tasks.filter((task) => task.status === status);
  }

  protected formatProjectStatus(status: number): string {
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

  protected formatRiskSeverity(severity: number): string {
    switch (severity) {
      case 1:
        return 'Low';
      case 2:
        return 'Medium';
      case 3:
        return 'High';
      case 4:
        return 'Critical';
      default:
        return 'Unknown';
    }
  }

  protected currentAssigneeLabel(): string {
    return this.userSession.getUser()?.fullName ?? 'You';
  }

  protected milestoneName(
    project: { milestones: ProjectDashboardMilestone[] },
    milestoneId: string,
  ): string {
    return project.milestones.find((milestone) => milestone.id === milestoneId)?.name ?? 'Milestone';
  }

  protected formatMilestoneDueDate(value: string): string {
    return formatLongDueDate(value);
  }

  protected formatPriority(priority: ProjectTaskPriority): string {
    switch (priority) {
      case 1:
        return 'Low';
      case 2:
        return 'Medium';
      case 3:
        return 'High';
      case 4:
        return 'Critical';
      default:
        return 'Unknown';
    }
  }

  protected assigneeLabel(assigneeId: string): string {
    const currentUserId = this.userSession.getUser()?.id;
    if (currentUserId !== undefined && currentUserId === assigneeId) {
      return this.userSession.getUser()?.fullName?.trim() || 'You';
    }

    return 'Assigned';
  }

  protected assigneeInitials(assigneeId: string): string {
    return initialsFromName(this.assigneeLabel(assigneeId));
  }

  protected milestoneTagClass(milestoneId: string): string {
    return milestoneTagClassForId(milestoneId);
  }

  protected priorityBadgeClass(priority: ProjectTaskPriority): string {
    const base = 'inline-flex rounded-md px-2 py-0.5 text-[11px] font-semibold';
    switch (priority) {
      case 4:
      case 3:
        return `${base} bg-red-500 text-white`;
      case 2:
        return `${base} bg-orange-400 text-white`;
      case 1:
        return `${base} bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300`;
      default:
        return `${base} bg-neutral-100 text-neutral-600`;
    }
  }

  protected formatShortDueDate(value: string): string {
    return formatShortDueDate(value);
  }

  protected toggleCreateMilestoneForm(): void {
    const next = !this.showCreateMilestoneForm();
    this.showCreateMilestoneForm.set(next);
    if (next) {
      const project = this.dashboard();
      this.newMilestoneDueDate.set(project?.endDate ?? this.todayDateInputValue());
      this.newMilestoneName.set('');
    }
  }

  protected onNewMilestoneNameInput(event: Event): void {
    this.newMilestoneName.set((event.target as HTMLInputElement).value);
  }

  protected onNewMilestoneDueDateInput(event: Event): void {
    this.newMilestoneDueDate.set((event.target as HTMLInputElement).value);
  }

  protected async submitCreateMilestone(event: Event): Promise<void> {
    event.preventDefault();
    const name = this.newMilestoneName().trim();
    const dueDate = this.newMilestoneDueDate().trim();
    if (name === '' || dueDate === '') {
      return;
    }

    const saved = await this.projectStore.createMilestone(this.projectId(), { name, dueDate });
    if (saved) {
      this.showCreateMilestoneForm.set(false);
      this.newMilestoneName.set('');
    }
  }

  protected startMilestoneEdit(milestone: ProjectDashboardMilestone): void {
    this.editingMilestoneId.set(milestone.id);
    this.editMilestoneName.set(milestone.name);
    this.editMilestoneDueDate.set(milestone.dueDate);
  }

  protected cancelMilestoneEdit(): void {
    this.editingMilestoneId.set(null);
  }

  protected onEditMilestoneNameInput(event: Event): void {
    this.editMilestoneName.set((event.target as HTMLInputElement).value);
  }

  protected onEditMilestoneDueDateInput(event: Event): void {
    this.editMilestoneDueDate.set((event.target as HTMLInputElement).value);
  }

  protected async saveMilestoneEdit(event: Event, milestone: ProjectDashboardMilestone): Promise<void> {
    event.preventDefault();
    const name = this.editMilestoneName().trim();
    const dueDate = this.editMilestoneDueDate().trim();
    if (name === '' || dueDate === '') {
      return;
    }

    const saved = await this.projectStore.updateMilestone(this.projectId(), milestone.id, {
      name,
      dueDate,
      status: milestone.status as MilestoneStatus,
      completedAtUtc: milestone.completedAtUtc,
    });

    if (saved) {
      this.cancelMilestoneEdit();
    }
  }

  protected async completeMilestone(milestoneId: string): Promise<void> {
    await this.projectStore.completeMilestone(this.projectId(), milestoneId);
  }

  protected async deleteMilestone(milestoneId: string): Promise<void> {
    await this.projectStore.deleteMilestone(this.projectId(), milestoneId);
  }

  protected openCreateTaskDialog(_project: { milestones: ProjectDashboardMilestone[] }): void {
    this.createTaskDialogOpen.set(true);
  }

  protected onCreateTaskDialogOpenChange(open: boolean): void {
    this.createTaskDialogOpen.set(open);
  }

  protected onTaskCreated(): void {
    this.createTaskDialogOpen.set(false);
  }

  protected startTaskEdit(task: ProjectDashboardTask): void {
    this.editingTaskId.set(task.id);
    this.editTaskTitle.set(task.title);
    this.editTaskPriority.set(task.priority);
    this.editTaskDueDate.set(task.dueDate);
  }

  protected cancelTaskEdit(): void {
    this.editingTaskId.set(null);
  }

  protected onEditTaskTitleInput(event: Event): void {
    this.editTaskTitle.set((event.target as HTMLInputElement).value);
  }

  protected onEditTaskPriorityChange(event: Event): void {
    this.editTaskPriority.set(Number((event.target as HTMLSelectElement).value) as ProjectTaskPriority);
  }

  protected onEditTaskDueDateInput(event: Event): void {
    this.editTaskDueDate.set((event.target as HTMLInputElement).value);
  }

  protected async saveTaskEdit(event: Event, task: ProjectDashboardTask): Promise<void> {
    event.preventDefault();
    const title = this.editTaskTitle().trim();
    const dueDate = this.editTaskDueDate().trim();
    if (title === '' || dueDate === '') {
      return;
    }

    const saved = await this.projectStore.updateTask(this.projectId(), task.id, {
      title,
      assigneeId: task.assigneeId,
      priority: this.editTaskPriority(),
      dueDate,
    });

    if (saved) {
      this.cancelTaskEdit();
    }
  }

  protected async deleteTask(taskId: string): Promise<void> {
    await this.projectStore.deleteTask(this.projectId(), taskId);
  }

  protected async onTaskStatusChange(task: ProjectDashboardTask, event: Event): Promise<void> {
    const status = Number((event.target as HTMLSelectElement).value) as ProjectTaskStatus;
    if (status === task.status) {
      return;
    }

    await this.projectStore.changeTaskStatus(this.projectId(), task.id, status);
  }

  protected onTaskDragStart(event: DragEvent, taskId: string): void {
    this.draggedTaskId.set(taskId);
    if (event.dataTransfer !== null) {
      event.dataTransfer.setData('text/plain', taskId);
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  protected onTaskDragEnd(): void {
    this.draggedTaskId.set(null);
  }

  protected onColumnDragOver(event: DragEvent): void {
    event.preventDefault();
    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move';
    }
  }

  protected async onColumnDrop(event: DragEvent, status: ProjectTaskStatus): Promise<void> {
    event.preventDefault();
    const taskId = event.dataTransfer?.getData('text/plain') ?? this.draggedTaskId();
    if (taskId === null || taskId.trim() === '') {
      return;
    }

    const project = this.dashboard();
    const task = project?.tasks.find((item) => item.id === taskId);
    if (task === undefined || task.status === status) {
      this.draggedTaskId.set(null);
      return;
    }

    await this.projectStore.changeTaskStatus(this.projectId(), taskId, status);
    this.draggedTaskId.set(null);
  }

  protected onRiskTitleInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.riskTitle.set(target.value);
  }

  protected onRiskDescriptionInput(event: Event): void {
    const target = event.target as HTMLTextAreaElement;
    this.riskDescription.set(target.value);
  }

  protected async submitRisk(event: Event): Promise<void> {
    event.preventDefault();
    const ownerId = this.userSession.getUser()?.id;
    if (ownerId === undefined || this.riskTitle().trim() === '') {
      return;
    }

    const saved = await this.projectStore.createProjectRisk(this.projectId(), {
      title: this.riskTitle().trim(),
      description: this.riskDescription().trim(),
      severity: 2,
      ownerId,
    });

    if (saved) {
      this.riskTitle.set('');
      this.riskDescription.set('');
      this.showRiskForm.set(false);
    }
  }

  private async loadProject(): Promise<void> {
    const projectId = this.projectId().trim();
    if (projectId === '') {
      return;
    }

    await this.projectStore.loadProjectDashboard(projectId);

    const project = this.dashboard();
    if (project === null) {
      return;
    }

    const clientRouteId = this.route.parent?.snapshot.paramMap.get('clientId') ?? '';
    if (clientRouteId !== '') {
      this.breadcrumbService.setDynamicTrail([
        {
          label: project.clientCompanyName,
          route: `/clients/${clientRouteId}`,
        },
        { label: project.name },
      ]);
      return;
    }

    this.breadcrumbService.setDynamicTrail([{ label: project.name }]);
  }

  private todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}

interface ProjectOverviewStatCard {
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

function buildProjectOverviewStatCards(
  project: ProjectDashboard,
  completedMilestones: number,
): ReadonlyArray<ProjectOverviewStatCard> {
  const milestoneTotal = project.milestones.length;
  const { taskSummary } = project;
  const budgetValue = formatProjectBudget(project.budget, project.currency);
  const timelineDays = projectDurationDays(project.startDate, project.endDate);

  const milestoneTrend = project.overdueMilestoneCount > 0
    ? {
        trendValue: String(project.overdueMilestoneCount),
        trendLabel: ' overdue',
        trendDirection: 'down' as const,
        footnote: '',
      }
    : {
        trendValue: '',
        trendLabel: '',
        trendDirection: 'up' as const,
        footnote: `${completedMilestones} of ${milestoneTotal} complete`,
      };

  const taskTrend: {
    readonly trendValue: string;
    readonly trendLabel: string;
    readonly trendDirection: 'up' | 'down' | 'neutral';
    readonly footnote: string;
  } = taskSummary.blocked > 0
    ? {
        trendValue: String(taskSummary.blocked),
        trendLabel: ' blocked',
        trendDirection: 'down',
        footnote: '',
      }
    : {
        trendValue: '',
        trendLabel: '',
        trendDirection:
          taskSummary.done === taskSummary.total && taskSummary.total > 0 ? 'up' : 'neutral',
        footnote: buildTaskFootnote(taskSummary),
      };

  return [
    {
      label: 'Timeline',
      value: formatTimelineRange(project.startDate, project.endDate),
      iconPath: 'M8 2v4m8-4v4M3 10h18M5 5h14a2 2 0 0 1 2 2v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z',
      accentColor: '#3b82f6',
      accentBg: '#dbeafe',
      sparkline: decorativeSparkline(timelineDays + 11),
      trendValue: '',
      trendLabel: '',
      trendDirection: 'neutral',
      footnote: formatTimelineDaysLeftFootnote(project.endDate),
    },
    {
      label: 'Budget',
      value: budgetValue,
      iconPath: 'M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H7',
      accentColor: '#a855f7',
      accentBg: '#f3e8ff',
      sparkline: decorativeSparkline(Math.round(project.budget) + 51),
      trendValue: '',
      trendLabel: '',
      trendDirection: 'neutral',
      footnote: `Planned in ${project.currency.trim() === '' ? 'USD' : project.currency}`,
    },
    {
      label: 'Milestones',
      value: `${completedMilestones} / ${milestoneTotal}`,
      iconPath: 'M9 11 12 14 22 4M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11',
      accentColor: '#14b8a6',
      accentBg: '#ccfbf1',
      sparkline: decorativeSparkline(completedMilestones + milestoneTotal + 23),
      trendValue: milestoneTrend.trendValue,
      trendLabel: milestoneTrend.trendLabel,
      trendDirection: milestoneTrend.trendDirection,
      footnote: milestoneTrend.footnote,
    },
    {
      label: 'Tasks',
      value: `${taskSummary.done} / ${taskSummary.total}`,
      iconPath: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2',
      accentColor: '#f97316',
      accentBg: '#ffedd5',
      sparkline: decorativeSparkline(taskSummary.done + taskSummary.total + 37),
      trendValue: taskTrend.trendValue,
      trendLabel: taskTrend.trendLabel,
      trendDirection: taskTrend.trendDirection,
      footnote: taskTrend.footnote,
    },
  ];
}

function buildTaskFootnote(taskSummary: ProjectDashboard['taskSummary']): string {
  if (taskSummary.total === 0) {
    return 'No tasks yet';
  }

  if (taskSummary.done === taskSummary.total) {
    return 'All tasks complete';
  }

  const openTasks = taskSummary.total - taskSummary.done;
  return `${openTasks} open task${openTasks === 1 ? '' : 's'}`;
}

function formatProjectBudget(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.trim() === '' ? 'USD' : currency,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

function formatTimelineRange(startDate: string, endDate: string): string {
  const start = formatOverviewDate(startDate);
  const end = formatOverviewDate(endDate);
  return `${start} – ${end}`;
}

function formatOverviewDate(value: string): string {
  const parsed = parseDateOnly(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
}

function formatLongDueDate(value: string): string {
  const parsed = parseDateOnly(value);
  if (Number.isNaN(parsed.getTime())) {
    return value.trim() === '' ? '—' : value;
  }

  return parsed.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function parseDateOnly(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
  if (match === null) {
    return new Date(value);
  }

  const year = Number.parseInt(match[1], 10);
  const month = Number.parseInt(match[2], 10);
  const day = Number.parseInt(match[3], 10);
  return new Date(year, month - 1, day);
}

function projectDurationDays(startDate: string, endDate: string): number {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    return 0;
  }

  return Math.max(1, Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatTimelineDaysLeftFootnote(endDate: string): string {
  const daysLeft = projectDaysRemaining(endDate);

  if (daysLeft > 0) {
    return `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`;
  }

  if (daysLeft === 0) {
    return 'Ends today';
  }

  const daysOverdue = Math.abs(daysLeft);
  return `Ended ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago`;
}

function projectDaysRemaining(endDate: string): number {
  const endDay = parseDateOnly(endDate);
  if (Number.isNaN(endDay.getTime())) {
    return 0;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  endDay.setHours(0, 0, 0, 0);

  return Math.round((endDay.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

const MILESTONE_TAG_CLASSES = [
  'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400',
  'bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400',
  'bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400',
  'bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400',
  'bg-rose-100 text-rose-700 dark:bg-rose-500/15 dark:text-rose-400',
] as const;

function milestoneTagClassForId(milestoneId: string): string {
  let hash = 0;
  for (let index = 0; index < milestoneId.length; index += 1) {
    hash = (hash + milestoneId.charCodeAt(index)) % MILESTONE_TAG_CLASSES.length;
  }

  return MILESTONE_TAG_CLASSES[hash] ?? MILESTONE_TAG_CLASSES[0];
}

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter((part) => part !== '');
  if (parts.length === 0) {
    return '?';
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
}

function formatShortDueDate(value: string): string {
  const parsed = parseDateOnly(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });
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
