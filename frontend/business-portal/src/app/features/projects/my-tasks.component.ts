import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { ProjectStore } from '@/app/core/stores/project.store';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    StatusBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-5xl space-y-6">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">My Tasks</h1>
            <p class="text-sm text-muted-foreground">
              Open tasks assigned to you across all clients.
            </p>
          </div>
          <a
            class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            routerLink="/projects"
          >
            All projects
          </a>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Task inbox</ui-card-title>
            <ui-card-description>{{ projectStore.myTasksTotalCount() }} open task(s)</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (projectStore.error(); as error) {
              <p class="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ error }}
              </p>
            }

            @if (projectStore.isLoading()) {
              <p class="text-sm text-muted-foreground">Loading tasks...</p>
            } @else if (groupedTasks().length === 0) {
              <p class="text-sm text-muted-foreground">No open tasks assigned to you.</p>
            } @else {
              <div class="space-y-6">
                @for (group of groupedTasks(); track group.label) {
                  <section>
                    <h2 class="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {{ group.label }}
                    </h2>
                    <ul class="space-y-2">
                      @for (task of group.tasks; track task.id) {
                        <li class="rounded-md border p-3 text-sm">
                          <div class="flex flex-wrap items-center justify-between gap-2">
                            <a
                              class="font-medium hover:underline"
                              [routerLink]="['/clients', task.clientId, 'projects', task.projectId]"
                            >
                              {{ task.title }}
                            </a>
                            <ui-status-badge [status]="formatTaskStatus(task.status)" />
                          </div>
                          <p class="mt-1 text-muted-foreground">
                            {{ task.clientCompanyName }} · {{ task.projectName }} · Due {{ task.dueDate }}
                          </p>
                        </li>
                      }
                    </ul>
                  </section>
                }
              </div>
            }
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class MyTasksComponent implements OnInit {
  protected readonly projectStore = inject(ProjectStore);

  protected readonly groupedTasks = computed(() => {
    const tasks = this.projectStore.myTasks();
    const today = new Date().toISOString().slice(0, 10);
    const overdue = tasks.filter((task) => task.dueDate < today);
    const upcoming = tasks.filter((task) => task.dueDate >= today);

    return [
      { label: 'Overdue', tasks: overdue },
      { label: 'Upcoming', tasks: upcoming },
    ].filter((group) => group.tasks.length > 0);
  });

  ngOnInit(): void {
    void this.projectStore.loadMyTasks();
  }

  protected formatTaskStatus(status: number): string {
    switch (status) {
      case 1:
        return 'To Do';
      case 2:
        return 'In Progress';
      case 3:
        return 'Blocked';
      case 4:
        return 'Done';
      default:
        return 'Unknown';
    }
  }
}
