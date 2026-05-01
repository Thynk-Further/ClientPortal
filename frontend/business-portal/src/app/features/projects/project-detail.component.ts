import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

type KanbanColumnKey = 'todo' | 'inProgress' | 'review' | 'done';

interface KanbanTask {
  readonly id: string;
  readonly title: string;
  readonly assignee: string;
  readonly priority: 'High' | 'Medium' | 'Low';
}

interface KanbanColumn {
  readonly key: KanbanColumnKey;
  readonly title: string;
  readonly tasks: ReadonlyArray<KanbanTask>;
}

@Component({
  selector: 'app-project-detail',
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
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Project Detail</h1>
              <p class="text-sm text-muted-foreground">
                Kanban execution board for
                <span class="font-medium">{{ projectId() }}</span>.
              </p>
            </div>
            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/projects']"
            >
              Back to projects
            </a>
          </div>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Kanban Board</ui-card-title>
            <ui-card-description>
              Visualize active tasks by stage to identify delivery bottlenecks early.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <div class="grid grid-cols-1 gap-4 xl:grid-cols-4">
              @for (column of columns; track column.key) {
                <section class="rounded-xl border bg-background p-3">
                  <div class="mb-3 flex items-center justify-between">
                    <h2 class="text-sm font-semibold">{{ column.title }}</h2>
                    <span class="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {{ column.tasks.length }}
                    </span>
                  </div>

                  <div class="space-y-3">
                    @for (task of column.tasks; track task.id) {
                      <article class="rounded-lg border bg-card p-3 shadow-sm">
                        <p class="text-sm font-medium">{{ task.title }}</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          Assignee: {{ task.assignee }}
                        </p>
                        <div class="mt-2">
                          <ui-status-badge [status]="task.priority" />
                        </div>
                      </article>
                    }
                  </div>
                </section>
              }
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ProjectDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly projectId = computed(
    () => this.route.snapshot.paramMap.get('projectId') ?? 'unknown-project',
  );

  protected readonly columns: ReadonlyArray<KanbanColumn> = [
    {
      key: 'todo',
      title: 'To Do',
      tasks: [
        {
          id: 'task-001',
          title: 'Finalize integration test scenarios',
          assignee: 'Lerato M.',
          priority: 'High',
        },
        {
          id: 'task-002',
          title: 'Draft onboarding checklist updates',
          assignee: 'Kai N.',
          priority: 'Medium',
        },
      ],
    },
    {
      key: 'inProgress',
      title: 'In Progress',
      tasks: [
        {
          id: 'task-003',
          title: 'Implement billing API retry strategy',
          assignee: 'Amina S.',
          priority: 'High',
        },
      ],
    },
    {
      key: 'review',
      title: 'Review',
      tasks: [
        {
          id: 'task-004',
          title: 'Validate tenant header propagation',
          assignee: 'Jonas T.',
          priority: 'Medium',
        },
      ],
    },
    {
      key: 'done',
      title: 'Done',
      tasks: [
        {
          id: 'task-005',
          title: 'Create base project navigation shell',
          assignee: 'Kabelo R.',
          priority: 'Low',
        },
      ],
    },
  ];
}
