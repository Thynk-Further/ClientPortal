import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
} from '@angular/core';
import { Router } from '@angular/router';

import {
  ProjectAnalytics,
  ProjectHealth,
  ProjectStatus,
} from '@/app/core/api/services/project-api.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ProjectHealthBadgeComponent } from './project-health-badge.component';

interface BreakdownBar {
  readonly label: string;
  readonly count: number;
  readonly percent: number;
  readonly barClass: string;
}

@Component({
  selector: 'app-project-analytics',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ProjectHealthBadgeComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <header class="pb-5">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Project Analytics</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Portfolio-wide delivery metrics across status, health, tasks, and budget.
        </p>
      </header>

      @if (projectStore.analyticsError(); as error) {
        <p class="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ error }}
        </p>
      }

      @if (projectStore.analyticsLoading()) {
        <p class="py-16 text-center text-sm text-muted-foreground">Loading project analytics...</p>
      } @else if (analytics(); as data) {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary metrics">
          @for (stat of summaryStats(data); track stat.label) {
            <article class="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
              <p class="text-sm font-medium text-muted-foreground">{{ stat.label }}</p>
              <p class="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-foreground">
                {{ stat.value }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">{{ stat.hint }}</p>
            </article>
          }
        </section>

        <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Status breakdown</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Projects by delivery status.</p>
            <div class="mt-5 space-y-3">
              @for (item of statusBars(data); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="text-muted-foreground">{{ item.count }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Health breakdown</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Computed portfolio health indicators.</p>
            <div class="mt-5 space-y-3">
              @for (item of healthBars(data); track item.label) {
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between text-sm">
                    <span class="font-medium text-foreground">{{ item.label }}</span>
                    <span class="text-muted-foreground">{{ item.count }}</span>
                  </div>
                  <div class="h-2 overflow-hidden rounded-full bg-muted">
                    <div class="h-full rounded-full transition-all" [class]="item.barClass" [style.width.%]="item.percent"></div>
                  </div>
                </div>
              }
            </div>
          </article>
        </section>

        <section class="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Task pipeline</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Aggregated tasks across all projects.</p>
            <dl class="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div class="rounded-xl border border-border/60 bg-muted/20 p-3">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">To Do</dt>
                <dd class="mt-1 text-2xl font-semibold text-foreground">{{ data.taskSummary.todo }}</dd>
              </div>
              <div class="rounded-xl border border-border/60 bg-muted/20 p-3">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">In Progress</dt>
                <dd class="mt-1 text-2xl font-semibold text-foreground">{{ data.taskSummary.inProgress }}</dd>
              </div>
              <div class="rounded-xl border border-border/60 bg-muted/20 p-3">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Blocked</dt>
                <dd class="mt-1 text-2xl font-semibold text-foreground">{{ data.taskSummary.blocked }}</dd>
              </div>
              <div class="rounded-xl border border-border/60 bg-muted/20 p-3">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Done</dt>
                <dd class="mt-1 text-2xl font-semibold text-foreground">{{ data.taskSummary.done }}</dd>
              </div>
            </dl>
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <h2 class="text-base font-semibold text-foreground">Budget by currency</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">Total planned budget grouped by currency.</p>
            @if (data.budgetByCurrency.length === 0) {
              <p class="mt-5 text-sm text-muted-foreground">No project budgets recorded yet.</p>
            } @else {
              <div class="mt-5 space-y-3">
                @for (budget of data.budgetByCurrency; track budget.currency) {
                  <div class="flex items-center justify-between rounded-xl border border-border/60 px-3 py-2.5 text-sm">
                    <div>
                      <p class="font-medium text-foreground">{{ budget.currency }}</p>
                      <p class="text-xs text-muted-foreground">{{ budget.projectCount }} project(s)</p>
                    </div>
                    <p class="font-semibold text-foreground">{{ formatBudget(budget.totalBudget, budget.currency) }}</p>
                  </div>
                }
              </div>
            }
          </article>
        </section>

        <article class="mt-6 overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm">
          <div class="border-b border-border/70 px-5 py-4 sm:px-6">
            <h2 class="text-base font-semibold text-foreground">At-risk projects</h2>
            <p class="mt-0.5 text-sm text-muted-foreground">
              Projects with amber or red health based on milestones, tasks, and risks.
            </p>
          </div>

          @if (data.atRiskProjects.length === 0) {
            <p class="px-5 py-10 text-center text-sm text-muted-foreground sm:px-6">
              No at-risk projects right now.
            </p>
          } @else {
            <div class="overflow-x-auto">
              <table class="w-full min-w-[720px] text-sm">
                <thead>
                  <tr class="border-b border-border/70 text-left text-muted-foreground">
                    <th class="px-5 py-3 font-medium sm:px-6">Project</th>
                    <th class="px-3 py-3 font-medium">Client</th>
                    <th class="px-3 py-3 font-medium">Status</th>
                    <th class="px-3 py-3 font-medium">Health</th>
                    <th class="px-3 py-3 font-medium">Overdue milestones</th>
                    <th class="px-3 py-3 font-medium">Open risks</th>
                  </tr>
                </thead>
                <tbody>
                  @for (project of data.atRiskProjects; track project.id) {
                    <tr
                      class="cursor-pointer border-b border-border/50 transition-colors hover:bg-muted/30"
                      (click)="openProject(project.id)"
                    >
                      <td class="px-5 py-3.5 font-medium text-foreground sm:px-6">{{ project.name }}</td>
                      <td class="px-3 py-3.5 text-muted-foreground">{{ project.clientCompanyName }}</td>
                      <td class="px-3 py-3.5">
                        <span [class]="projectStatusClass(project.status)">
                          {{ formatProjectStatus(project.status) }}
                        </span>
                      </td>
                      <td class="px-3 py-3.5">
                        <app-project-health-badge [health]="project.health" />
                      </td>
                      <td class="px-3 py-3.5 text-foreground">{{ project.overdueMilestoneCount }}</td>
                      <td class="px-3 py-3.5 text-foreground">{{ project.openRiskCount }}</td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </article>
      }
    </div>
  `,
})
export class ProjectAnalyticsComponent implements OnInit {
  private readonly router = inject(Router);

  protected readonly projectStore = inject(ProjectStore);

  protected readonly analytics = computed(() => this.projectStore.analytics());

  ngOnInit(): void {
    void this.projectStore.loadProjectAnalytics();
  }

  protected summaryStats(data: ProjectAnalytics): ReadonlyArray<{
    readonly label: string;
    readonly value: string;
    readonly hint: string;
  }> {
    return [
      {
        label: 'Total projects',
        value: String(data.totalProjects),
        hint: 'Across all clients',
      },
      {
        label: 'Open tasks',
        value: String(data.taskSummary.total - data.taskSummary.done),
        hint: `${data.taskSummary.total} total tasks`,
      },
      {
        label: 'Overdue milestones',
        value: String(data.overdueMilestoneCount),
        hint: `${data.overdueTaskCount} overdue tasks`,
      },
      {
        label: 'Open risks',
        value: String(data.openRiskCount),
        hint: 'Requiring attention',
      },
    ];
  }

  protected statusBars(data: ProjectAnalytics): ReadonlyArray<BreakdownBar> {
    return buildBreakdownBars(
      data.statusBreakdown.map((item) => ({
        label: formatProjectStatus(item.status),
        count: item.count,
        barClass: statusBarClass(item.status),
      })),
      data.totalProjects,
    );
  }

  protected healthBars(data: ProjectAnalytics): ReadonlyArray<BreakdownBar> {
    return buildBreakdownBars(
      data.healthBreakdown.map((item) => ({
        label: formatHealthLabel(item.health),
        count: item.count,
        barClass: healthBarClass(item.health),
      })),
      data.totalProjects,
    );
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

  protected formatProjectStatus(status: ProjectStatus): string {
    return formatProjectStatus(status);
  }

  protected projectStatusClass(status: ProjectStatus): string {
    const base = 'inline-flex rounded-md px-2.5 py-1 text-xs font-medium';
    switch (status) {
      case 1:
        return `${base} bg-orange-100 text-orange-700`;
      case 2:
        return `${base} bg-emerald-100 text-emerald-700`;
      case 3:
        return `${base} bg-amber-100 text-amber-800`;
      case 4:
        return `${base} bg-blue-100 text-blue-700`;
      case 5:
        return `${base} bg-neutral-100 text-neutral-600`;
      default:
        return `${base} bg-neutral-100 text-neutral-600`;
    }
  }

  protected openProject(projectId: string): void {
    void this.router.navigate(['/projects', projectId]);
  }
}

function buildBreakdownBars(
  items: ReadonlyArray<{ label: string; count: number; barClass: string }>,
  total: number,
): ReadonlyArray<BreakdownBar> {
  const denominator = total > 0 ? total : 1;
  return items.map((item) => ({
    label: item.label,
    count: item.count,
    percent: Math.round((item.count / denominator) * 100),
    barClass: item.barClass,
  }));
}

function formatProjectStatus(status: ProjectStatus): string {
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

function formatHealthLabel(health: ProjectHealth): string {
  switch (health) {
    case 1:
      return 'Green';
    case 2:
      return 'Amber';
    case 3:
      return 'Red';
    default:
      return 'Unknown';
  }
}

function statusBarClass(status: ProjectStatus): string {
  switch (status) {
    case 1:
      return 'bg-orange-500';
    case 2:
      return 'bg-emerald-500';
    case 3:
      return 'bg-amber-500';
    case 4:
      return 'bg-blue-500';
    case 5:
      return 'bg-neutral-400';
    default:
      return 'bg-neutral-400';
  }
}

function healthBarClass(health: ProjectHealth): string {
  switch (health) {
    case 1:
      return 'bg-emerald-500';
    case 2:
      return 'bg-amber-500';
    case 3:
      return 'bg-red-500';
    default:
      return 'bg-neutral-400';
  }
}
