import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
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
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

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

const ACTIVITY_TYPE_LABELS: Record<string, string> = {
  MilestoneCompleted: 'Milestone',
  TaskUpdated: 'Task',
  ClientRequestSubmitted: 'Request',
};

@Component({
  selector: 'app-client-projects-list',
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
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Projects</h1>
        <p class="text-sm text-muted-foreground">
          Track milestone progress and recent activity across your projects.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading projects...</p>
      } @else if (projects().length === 0) {
        <ui-card class="border-dashed">
          <ui-card-header>
            <ui-card-title>No projects yet</ui-card-title>
            <ui-card-description>
              When your business adds projects for you, they will appear here with progress and updates.
            </ui-card-description>
          </ui-card-header>
        </ui-card>
      } @else {
        <section class="grid grid-cols-1 gap-4 lg:grid-cols-2" aria-label="Project cards">
          @for (project of projects(); track project.id) {
            <ui-card class="transition-shadow hover:shadow-md">
              <ui-card-header class="gap-3">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <ui-card-title class="truncate text-lg">
                      <a
                        [routerLink]="['/projects', project.id]"
                        class="hover:text-primary hover:underline underline-offset-4"
                      >
                        {{ project.name }}
                      </a>
                    </ui-card-title>
                    <ui-card-description>
                      {{ formatDate(project.startDate) }} – {{ formatDate(project.endDate) }}
                    </ui-card-description>
                  </div>
                  <span
                    class="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(project.status)"
                  >
                    {{ statusLabel(project.status) }}
                  </span>
                </div>
              </ui-card-header>

              <ui-card-content class="space-y-4">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Milestone progress</span>
                    <span>
                      {{ project.milestoneProgress.completedCount }} /
                      {{ project.milestoneProgress.totalCount }} complete
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-primary transition-all"
                      [style.width.%]="project.milestoneProgress.progressPercent"
                    ></div>
                  </div>
                  <p class="text-xs text-muted-foreground">
                    {{ project.milestoneProgress.progressPercent }}% of milestones completed
                  </p>
                </div>

                <div class="space-y-2">
                  <p class="text-sm font-medium text-foreground">Recent activity</p>
                  @if (project.recentActivity.length === 0) {
                    <p class="text-sm text-muted-foreground">No recent activity on this project.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (item of project.recentActivity; track item.occurredAtUtc + item.description) {
                        <li class="rounded-lg border border-border/60 px-3 py-2">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm text-foreground">{{ item.description }}</p>
                            <span class="shrink-0 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              {{ activityTypeLabel(item.type) }}
                            </span>
                          </div>
                          <p class="mt-1 text-xs text-muted-foreground">
                            {{ formatDateTime(item.occurredAtUtc) }}
                          </p>
                        </li>
                      }
                    </ul>
                  }
                </div>

                <a
                  [routerLink]="['/projects', project.id]"
                  class="inline-flex text-sm font-medium text-primary underline-offset-4 hover:underline"
                >
                  View project details
                </a>
              </ui-card-content>
            </ui-card>
          }
        </section>
      }
    </div>
  `,
})
export class ClientProjectsListComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly projects = signal<ClientPortalProjectListItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);

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

  protected statusClass(status: number): string {
    return PROJECT_STATUS_CLASSES[status] ?? 'bg-muted text-muted-foreground';
  }

  protected activityTypeLabel(type: string): string {
    return ACTIVITY_TYPE_LABELS[type] ?? 'Update';
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
