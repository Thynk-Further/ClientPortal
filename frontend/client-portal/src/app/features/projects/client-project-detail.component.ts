import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalProjectDetail,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

type ProjectTab = 'milestones' | 'tasks' | 'documents' | 'messages' | 'requests';

interface TabDefinition {
  readonly key: ProjectTab;
  readonly label: string;
}

const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'In progress',
  3: 'On hold',
  4: 'Completed',
  5: 'Cancelled',
};

const PROJECT_STATUS_CLASSES: Record<number, string> = {
  1: 'bg-sky-500/10 text-sky-700 dark:text-sky-300',
  2: 'bg-primary/10 text-primary',
  3: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  4: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  5: 'bg-muted text-muted-foreground',
};

const MILESTONE_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'Completed',
};

const TASK_STATUS_LABELS: Record<number, string> = {
  1: 'To do',
  2: 'In progress',
  3: 'Blocked',
  4: 'Done',
};

const TASK_PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const REQUEST_STATUS_LABELS: Record<number, string> = {
  1: 'Submitted',
  2: 'In review',
  3: 'Approved',
  4: 'Rejected',
  5: 'Completed',
};

const REQUEST_PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

@Component({
  selector: 'app-client-project-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <a
          routerLink="/projects"
          class="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Back to projects
        </a>
      </div>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading project...</p>
      } @else if (project(); as detail) {
        <header class="space-y-2">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0 space-y-1">
              <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">{{ detail.name }}</h1>
              @if (detail.description.trim() !== '') {
                <p class="text-sm text-muted-foreground">{{ detail.description }}</p>
              }
              <p class="text-sm text-muted-foreground">
                {{ formatDate(detail.startDate) }} – {{ formatDate(detail.endDate) }}
              </p>
            </div>
            <span
              class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="statusClass(detail.status)"
            >
              {{ statusLabel(detail.status) }}
            </span>
          </div>

          <div class="max-w-md space-y-2">
            <div class="flex items-center justify-between text-xs text-muted-foreground">
              <span>Milestone progress</span>
              <span>
                {{ detail.milestoneProgress.completedCount }} /
                {{ detail.milestoneProgress.totalCount }}
              </span>
            </div>
            <div class="h-2 overflow-hidden rounded-full bg-muted">
              <div
                class="h-full rounded-full bg-primary transition-all"
                [style.width.%]="detail.milestoneProgress.progressPercent"
              ></div>
            </div>
          </div>
        </header>

        <section class="rounded-xl border border-border/70 bg-card p-2" aria-label="Project sections">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-5">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm font-medium transition-colors"
                [class.bg-primary]="activeTab() === tab.key"
                [class.text-primary-foreground]="activeTab() === tab.key"
                [class.text-muted-foreground]="activeTab() !== tab.key"
                [class.hover:bg-muted]="activeTab() !== tab.key"
                (click)="activeTab.set(tab.key)"
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </section>

        @switch (activeTab()) {
          @case ('milestones') {
            <ui-card>
              <ui-card-header>
                <ui-card-title>Milestones</ui-card-title>
                <ui-card-description>Delivery phases and completion timeline.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (detail.milestones.length === 0) {
                  <p class="text-sm text-muted-foreground">No milestones defined yet.</p>
                } @else {
                  <ol class="relative space-y-6 border-l border-border pl-6">
                    @for (milestone of detail.milestones; track milestone.id) {
                      <li class="relative">
                        <span
                          class="absolute -left-[1.6rem] top-1 grid h-3 w-3 rounded-full ring-4 ring-background"
                          [class.bg-primary]="milestone.status === 2"
                          [class.bg-muted-foreground]="milestone.status !== 2"
                        ></span>
                        <div class="space-y-1">
                          <div class="flex flex-wrap items-center gap-2">
                            <p class="text-sm font-medium text-foreground">{{ milestone.name }}</p>
                            <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {{ milestoneStatusLabel(milestone.status) }}
                            </span>
                          </div>
                          <p class="text-xs text-muted-foreground">Due {{ formatDate(milestone.dueDate) }}</p>
                          @if (milestone.completedAtUtc) {
                            <p class="text-xs text-muted-foreground">
                              Completed {{ formatDateTime(milestone.completedAtUtc) }}
                            </p>
                          }
                        </div>
                      </li>
                    }
                  </ol>
                }
              </ui-card-content>
            </ui-card>
          }

          @case ('tasks') {
            <ui-card>
              <ui-card-header>
                <ui-card-title>Tasks</ui-card-title>
                <ui-card-description>Read-only view of project tasks and their current status.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (detail.tasks.length === 0) {
                  <p class="text-sm text-muted-foreground">No tasks on this project yet.</p>
                } @else {
                  <div class="overflow-x-auto">
                    <table class="w-full min-w-[32rem] text-left text-sm">
                      <thead class="border-b border-border text-xs uppercase text-muted-foreground">
                        <tr>
                          <th class="px-3 py-2 font-medium">Task</th>
                          <th class="px-3 py-2 font-medium">Status</th>
                          <th class="px-3 py-2 font-medium">Priority</th>
                          <th class="px-3 py-2 font-medium">Due</th>
                        </tr>
                      </thead>
                      <tbody>
                        @for (task of detail.tasks; track task.id) {
                          <tr class="border-b border-border/60 last:border-0">
                            <td class="px-3 py-3 font-medium text-foreground">{{ task.title }}</td>
                            <td class="px-3 py-3 text-muted-foreground">{{ taskStatusLabel(task.status) }}</td>
                            <td class="px-3 py-3 text-muted-foreground">{{ taskPriorityLabel(task.priority) }}</td>
                            <td class="px-3 py-3 text-muted-foreground">{{ formatDate(task.dueDate) }}</td>
                          </tr>
                        }
                      </tbody>
                    </table>
                  </div>
                }
              </ui-card-content>
            </ui-card>
          }

          @case ('documents') {
            <ui-card>
              <ui-card-header>
                <ui-card-title>Documents</ui-card-title>
                <ui-card-description>Contracts and files shared with you for this engagement.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (detail.documents.length === 0) {
                  <p class="text-sm text-muted-foreground">No documents available yet.</p>
                } @else {
                  <ul class="space-y-3">
                    @for (document of detail.documents; track document.id) {
                      <li class="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-foreground">{{ document.name }}</p>
                          <p class="text-xs capitalize text-muted-foreground">{{ document.type }} · {{ document.status }}</p>
                        </div>
                        <p class="shrink-0 text-xs text-muted-foreground">{{ formatDateTime(document.updatedAtUtc) }}</p>
                      </li>
                    }
                  </ul>
                }
              </ui-card-content>
            </ui-card>
          }

          @case ('messages') {
            <ui-card>
              <ui-card-header>
                <ui-card-title>Messages</ui-card-title>
                <ui-card-description>Conversation threads linked to this project.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (detail.messageThreads.length === 0) {
                  <p class="text-sm text-muted-foreground">No message threads for this project yet.</p>
                } @else {
                  <ul class="space-y-3">
                    @for (thread of detail.messageThreads; track thread.id) {
                      <li class="flex items-start justify-between gap-3 rounded-lg border border-border/60 px-3 py-2.5">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium text-foreground">{{ thread.subject }}</p>
                          <p class="text-xs text-muted-foreground">Last message {{ formatDateTime(thread.lastMessageAt) }}</p>
                        </div>
                        @if (thread.unreadCount > 0) {
                          <span class="shrink-0 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
                            {{ thread.unreadCount }} unread
                          </span>
                        }
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
                <ui-card-title>Requests</ui-card-title>
                <ui-card-description>Change requests and support items for this project.</ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (detail.requests.length === 0) {
                  <p class="text-sm text-muted-foreground">No requests submitted for this project.</p>
                } @else {
                  <ul class="space-y-3">
                    @for (request of detail.requests; track request.id) {
                      <li class="rounded-lg border border-border/60 px-3 py-2.5">
                        <div class="flex flex-wrap items-start justify-between gap-2">
                          <p class="text-sm font-medium text-foreground">{{ request.title }}</p>
                          <div class="flex flex-wrap gap-2">
                            <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {{ requestStatusLabel(request.status) }}
                            </span>
                            <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                              {{ requestPriorityLabel(request.priority) }}
                            </span>
                          </div>
                        </div>
                        @if (request.description.trim() !== '') {
                          <p class="mt-2 text-sm text-muted-foreground">{{ request.description }}</p>
                        }
                        <p class="mt-2 text-xs text-muted-foreground">
                          Submitted {{ formatDateTime(request.createdAtUtc) }}
                        </p>
                      </li>
                    }
                  </ul>
                }
              </ui-card-content>
            </ui-card>
          }
        }
      }
    </div>
  `,
})
export class ClientProjectDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly tabs: ReadonlyArray<TabDefinition> = [
    { key: 'milestones', label: 'Milestones' },
    { key: 'tasks', label: 'Tasks' },
    { key: 'documents', label: 'Documents' },
    { key: 'messages', label: 'Messages' },
    { key: 'requests', label: 'Requests' },
  ];

  protected readonly project = signal<ClientPortalProjectDetail | null>(null);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly activeTab = signal<ProjectTab>('milestones');

  async ngOnInit(): Promise<void> {
    const projectId = this.route.snapshot.paramMap.get('projectId')?.trim() ?? '';
    if (projectId === '') {
      this.errorMessage.set('Project id is missing.');
      this.isLoading.set(false);
      return;
    }

    try {
      const detail = await firstValueFrom(this.clientPortalApi.getProject(projectId));
      this.project.set(detail);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load project.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  protected statusLabel(status: number): string {
    return PROJECT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusClass(status: number): string {
    return PROJECT_STATUS_CLASSES[status] ?? 'bg-muted text-muted-foreground';
  }

  protected milestoneStatusLabel(status: number): string {
    return MILESTONE_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected taskStatusLabel(status: number): string {
    return TASK_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected taskPriorityLabel(priority: number): string {
    return TASK_PRIORITY_LABELS[priority] ?? 'Unknown';
  }

  protected requestStatusLabel(status: number): string {
    return REQUEST_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected requestPriorityLabel(priority: number): string {
    return REQUEST_PRIORITY_LABELS[priority] ?? 'Unknown';
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
}
