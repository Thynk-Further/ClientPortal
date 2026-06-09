import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { UserSessionService } from '@/app/core/auth/user-session.service';
import {
  MilestoneStatus,
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
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
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
    DecimalPipe,
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    StatusBadgeComponent,
    ProjectHealthBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-2">
          <nav class="text-sm text-muted-foreground">
            <a class="hover:underline" [routerLink]="['/clients']">Clients</a>
            @if (clientId() !== '') {
              <span> / </span>
              <a
                class="hover:underline"
                [routerLink]="['/clients', clientId()]"
                [queryParams]="{ tab: 'projects' }"
              >
                {{ dashboard()?.clientCompanyName ?? 'Client' }}
              </a>
            }
            <span> / </span>
            <span class="text-foreground">{{ dashboard()?.name ?? 'Project' }}</span>
          </nav>

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

        <section class="rounded-xl border bg-card p-2" aria-label="Project tabs">
          <div class="flex flex-wrap gap-2">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm transition-colors"
                [class]="tab.key === activeTab() ? activeTabClasses : inactiveTabClasses"
                (click)="activeTab.set(tab.key)"
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
              <div class="grid grid-cols-1 gap-4 md:grid-cols-4">
                <ui-card>
                  <ui-card-header><ui-card-title class="text-base">Timeline</ui-card-title></ui-card-header>
                  <ui-card-content class="text-sm">
                    {{ project.startDate }} → {{ project.endDate }}
                  </ui-card-content>
                </ui-card>
                <ui-card>
                  <ui-card-header><ui-card-title class="text-base">Budget</ui-card-title></ui-card-header>
                  <ui-card-content class="text-sm">
                    {{ project.budget | number: '1.2-2' }} {{ project.currency }}
                  </ui-card-content>
                </ui-card>
                <ui-card>
                  <ui-card-header><ui-card-title class="text-base">Milestones</ui-card-title></ui-card-header>
                  <ui-card-content class="text-sm">
                    {{ completedMilestones() }} / {{ project.milestones.length }} complete
                    @if (project.overdueMilestoneCount > 0) {
                      <span class="text-destructive"> · {{ project.overdueMilestoneCount }} overdue</span>
                    }
                  </ui-card-content>
                </ui-card>
                <ui-card>
                  <ui-card-header><ui-card-title class="text-base">Tasks</ui-card-title></ui-card-header>
                  <ui-card-content class="text-sm">
                    {{ project.taskSummary.done }} / {{ project.taskSummary.total }} done
                    @if (project.taskSummary.blocked > 0) {
                      <span class="text-amber-700"> · {{ project.taskSummary.blocked }} blocked</span>
                    }
                  </ui-card-content>
                </ui-card>
              </div>
            }
            @case ('milestones') {
              <ui-card>
                <ui-card-header>
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <div>
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
                                <p class="text-muted-foreground">Due {{ milestone.dueDate }}</p>
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
                    <div>
                      <ui-card-title>Board</ui-card-title>
                      <ui-card-description>
                        Drag cards between columns or change status from the card menu.
                      </ui-card-description>
                    </div>
                    <ui-button
                      variant="outline"
                      [label]="showCreateTaskForm() ? 'Cancel' : 'Add task'"
                      [disabled]="project.milestones.length === 0"
                      (clicked)="toggleCreateTaskForm(project)"
                    />
                  </div>
                </ui-card-header>
                <ui-card-content class="space-y-4">
                  @if (project.milestones.length === 0) {
                    <p class="text-sm text-amber-700">
                      Add at least one milestone before creating tasks.
                    </p>
                  }

                  @if (showCreateTaskForm()) {
                    <form class="grid gap-3 rounded-md border p-3 md:grid-cols-2" (submit)="submitCreateTask($event)">
                      <input
                        class="rounded-md border px-3 py-2 text-sm md:col-span-2"
                        placeholder="Task title"
                        required
                        [value]="newTaskTitle()"
                        (input)="onNewTaskTitleInput($event)"
                      />
                      <select
                        class="rounded-md border px-3 py-2 text-sm"
                        required
                        [value]="newTaskMilestoneId()"
                        (change)="onNewTaskMilestoneChange($event)"
                      >
                        @for (milestone of project.milestones; track milestone.id) {
                          <option [value]="milestone.id">{{ milestone.name }}</option>
                        }
                      </select>
                      <select
                        class="rounded-md border px-3 py-2 text-sm"
                        [value]="newTaskPriority()"
                        (change)="onNewTaskPriorityChange($event)"
                      >
                        <option [value]="1">Low priority</option>
                        <option [value]="2">Medium priority</option>
                        <option [value]="3">High priority</option>
                        <option [value]="4">Critical priority</option>
                      </select>
                      <input
                        type="date"
                        class="rounded-md border px-3 py-2 text-sm"
                        required
                        [value]="newTaskDueDate()"
                        (input)="onNewTaskDueDateInput($event)"
                      />
                      <p class="text-xs text-muted-foreground md:col-span-2">
                        Assigned to {{ currentAssigneeLabel() }}
                      </p>
                      <div class="md:col-span-2">
                        <ui-button type="submit" label="Save task" />
                      </div>
                    </form>
                  }

                  <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
                    @for (column of kanbanColumns; track column.status) {
                      <section
                        class="rounded-xl border bg-background p-3"
                        (dragover)="onColumnDragOver($event)"
                        (drop)="onColumnDrop($event, column.status)"
                      >
                        <div class="mb-3 flex items-center justify-between">
                          <h2 class="text-sm font-semibold">{{ column.title }}</h2>
                          <span class="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {{ tasksForColumn(column.status).length }}
                          </span>
                        </div>
                        <ul class="min-h-24 space-y-2">
                          @for (task of tasksForColumn(column.status); track task.id) {
                            <li
                              class="rounded-lg border bg-card p-3 text-sm shadow-sm"
                              draggable="true"
                              (dragstart)="onTaskDragStart($event, task.id)"
                              (dragend)="onTaskDragEnd()"
                              [class.opacity-60]="draggedTaskId() === task.id"
                            >
                              @if (editingTaskId() === task.id) {
                                <form class="space-y-2" (submit)="saveTaskEdit($event, task)">
                                  <input
                                    class="w-full rounded-md border px-2 py-1.5 text-sm"
                                    required
                                    [value]="editTaskTitle()"
                                    (input)="onEditTaskTitleInput($event)"
                                  />
                                  <select
                                    class="w-full rounded-md border px-2 py-1.5 text-sm"
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
                                    class="w-full rounded-md border px-2 py-1.5 text-sm"
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
                                <p class="font-medium">{{ task.title }}</p>
                                <p class="mt-1 text-xs text-muted-foreground">
                                  {{ milestoneName(project, task.milestoneId) }} · Due {{ task.dueDate }}
                                </p>
                                <p class="mt-1 text-xs text-muted-foreground">
                                  {{ formatPriority(task.priority) }} · {{ assigneeLabel(task.assigneeId) }}
                                </p>
                                <div class="mt-3 flex flex-wrap items-center gap-2">
                                  <select
                                    class="rounded-md border px-2 py-1 text-xs"
                                    [value]="task.status"
                                    (change)="onTaskStatusChange(task, $event)"
                                  >
                                    @for (columnOption of kanbanColumns; track columnOption.status) {
                                      <option [value]="columnOption.status">{{ columnOption.title }}</option>
                                    }
                                  </select>
                                  <ui-button variant="outline" label="Edit" (clicked)="startTaskEdit(task)" />
                                  <ui-button variant="outline" label="Delete" (clicked)="deleteTask(task.id)" />
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

  protected readonly showCreateTaskForm = signal(false);
  protected readonly newTaskTitle = signal('');
  protected readonly newTaskMilestoneId = signal('');
  protected readonly newTaskPriority = signal<ProjectTaskPriority>(2);
  protected readonly newTaskDueDate = signal('');
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

  protected readonly completedMilestones = computed(() => {
    const project = this.dashboard();
    if (project === null) {
      return 0;
    }

    return project.milestones.filter((milestone) => milestone.status === 2).length;
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
      return 'Assigned to you';
    }

    return 'Assigned';
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

  protected toggleCreateTaskForm(project: { milestones: ProjectDashboardMilestone[]; endDate: string }): void {
    const next = !this.showCreateTaskForm();
    this.showCreateTaskForm.set(next);
    if (next) {
      this.newTaskTitle.set('');
      this.newTaskMilestoneId.set(project.milestones[0]?.id ?? '');
      this.newTaskPriority.set(2);
      this.newTaskDueDate.set(project.endDate);
    }
  }

  protected onNewTaskTitleInput(event: Event): void {
    this.newTaskTitle.set((event.target as HTMLInputElement).value);
  }

  protected onNewTaskMilestoneChange(event: Event): void {
    this.newTaskMilestoneId.set((event.target as HTMLSelectElement).value);
  }

  protected onNewTaskPriorityChange(event: Event): void {
    this.newTaskPriority.set(Number((event.target as HTMLSelectElement).value) as ProjectTaskPriority);
  }

  protected onNewTaskDueDateInput(event: Event): void {
    this.newTaskDueDate.set((event.target as HTMLInputElement).value);
  }

  protected async submitCreateTask(event: Event): Promise<void> {
    event.preventDefault();
    const assigneeId = this.userSession.getUser()?.id;
    const title = this.newTaskTitle().trim();
    const milestoneId = this.newTaskMilestoneId().trim();
    const dueDate = this.newTaskDueDate().trim();
    if (assigneeId === undefined || title === '' || milestoneId === '' || dueDate === '') {
      return;
    }

    const saved = await this.projectStore.createTask(this.projectId(), {
      milestoneId,
      title,
      assigneeId,
      priority: this.newTaskPriority(),
      dueDate,
    });

    if (saved) {
      this.showCreateTaskForm.set(false);
      this.newTaskTitle.set('');
    }
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
  }

  private todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
