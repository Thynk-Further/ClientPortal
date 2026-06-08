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
  ProjectDashboardTask,
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
                  <ui-card-title>Milestones</ui-card-title>
                  <ui-card-description>Track phase delivery and mark milestones complete.</ui-card-description>
                </ui-card-header>
                <ui-card-content>
                  @if (project.milestones.length === 0) {
                    <p class="text-sm text-muted-foreground">No milestones yet.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (milestone of project.milestones; track milestone.id) {
                        <li class="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3 text-sm">
                          <div>
                            <p class="font-medium">{{ milestone.name }}</p>
                            <p class="text-muted-foreground">Due {{ milestone.dueDate }}</p>
                          </div>
                          <div class="flex items-center gap-2">
                            <ui-status-badge [status]="milestone.status === 2 ? 'Completed' : 'Planned'" />
                            @if (milestone.status !== 2) {
                              <ui-button
                                variant="outline"
                                label="Complete"
                                (clicked)="completeMilestone(milestone.id)"
                              />
                            }
                          </div>
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
                  <ui-card-title>Tasks</ui-card-title>
                  <ui-card-description>Click a task to advance its status.</ui-card-description>
                </ui-card-header>
                <ui-card-content>
                  <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
                    @for (column of kanbanColumns; track column.status) {
                      <section class="rounded-xl border bg-background p-3">
                        <div class="mb-3 flex items-center justify-between">
                          <h2 class="text-sm font-semibold">{{ column.title }}</h2>
                          <span class="rounded-full bg-muted px-2 py-0.5 text-xs">
                            {{ tasksForColumn(column.status).length }}
                          </span>
                        </div>
                        <ul class="space-y-2">
                          @for (task of tasksForColumn(column.status); track task.id) {
                            <li>
                              <button
                                type="button"
                                class="w-full rounded-lg border bg-card p-3 text-left text-sm hover:bg-muted/50"
                                (click)="advanceTask(task)"
                              >
                                <p class="font-medium">{{ task.title }}</p>
                                <p class="mt-1 text-xs text-muted-foreground">Due {{ task.dueDate }}</p>
                              </button>
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

  protected async completeMilestone(milestoneId: string): Promise<void> {
    await this.projectStore.completeMilestone(this.projectId(), milestoneId);
  }

  protected async advanceTask(task: ProjectDashboardTask): Promise<void> {
    const nextStatus = nextTaskStatus(task.status);
    await this.projectStore.changeTaskStatus(this.projectId(), task.id, nextStatus);
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
}

function nextTaskStatus(current: ProjectTaskStatus): ProjectTaskStatus {
  switch (current) {
    case 1:
      return 2;
    case 2:
      return 3;
    case 3:
      return 4;
    default:
      return 1;
  }
}
