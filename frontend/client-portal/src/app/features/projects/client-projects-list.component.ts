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
import { EmptyStateComponent } from '@/components/ui/empty-state.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'In progress',
  3: 'On hold',
  4: 'Completed',
  5: 'Cancelled',
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
  imports: [RouterLink, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="pb-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Projects</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Track milestone progress and recent activity across your projects.
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
          message="When your business adds projects for you, they will appear here with progress and updates."
        />
      } @else {
        <section class="grid grid-cols-1 gap-4 xl:grid-cols-2" aria-label="Project cards">
          @for (project of projects(); track project.id) {
            <article class="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
              <div class="border-b border-border/70 p-5">
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <h2 class="truncate text-base font-semibold">
                      <a
                        [routerLink]="['/projects', project.id]"
                        class="hover:text-primary hover:underline underline-offset-4"
                      >
                        {{ project.name }}
                      </a>
                    </h2>
                    <p class="mt-1 text-sm text-muted-foreground">
                      {{ formatDate(project.startDate) }} – {{ formatDate(project.endDate) }}
                    </p>
                  </div>
                  <ui-status-badge [status]="statusLabel(project.status)" />
                </div>
              </div>

              <div class="space-y-4 p-5">
                <div class="space-y-2">
                  <div class="flex items-center justify-between text-xs text-muted-foreground">
                    <span class="font-medium uppercase tracking-wider">Milestone progress</span>
                    <span>
                      {{ project.milestoneProgress.completedCount }} /
                      {{ project.milestoneProgress.totalCount }}
                    </span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      class="h-full rounded-full bg-foreground transition-all"
                      [style.width.%]="project.milestoneProgress.progressPercent"
                    ></div>
                  </div>
                </div>

                <div class="space-y-2">
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Recent activity
                  </p>
                  @if (project.recentActivity.length === 0) {
                    <p class="text-sm text-muted-foreground">No recent activity on this project.</p>
                  } @else {
                    <ul class="space-y-2">
                      @for (item of project.recentActivity; track item.occurredAtUtc + item.description) {
                        <li class="rounded-lg border border-border/50 bg-muted/20 px-3 py-2.5">
                          <div class="flex items-start justify-between gap-3">
                            <p class="text-sm text-foreground">{{ item.description }}</p>
                            <span class="shrink-0 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
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
                  class="inline-flex text-sm font-medium text-primary hover:underline"
                >
                  View project details →
                </a>
              </div>
            </article>
          }
        </section>
      }
    </main>
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
