import { DecimalPipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ProjectApiService,
  ProjectDashboard,
} from '@/app/core/api/services/project-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '@/components/ui/dialog.component';
import { ButtonComponent } from '@/components/ui/button.component';

@Component({
  selector: 'app-project-view-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DecimalPipe,
    DialogComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogContentComponent,
    DialogFooterComponent,
    ButtonComponent,
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-2xl"
      ariaLabel="Project details"
      (openChange)="onOpenChange($event)"
    >
      @if (isLoading()) {
        <ui-dialog-header>
          <ui-dialog-title>Project details</ui-dialog-title>
          <ui-dialog-description>Loading project information...</ui-dialog-description>
        </ui-dialog-header>
      } @else if (error() !== null) {
        <ui-dialog-header>
          <ui-dialog-title>Project details</ui-dialog-title>
          <ui-dialog-description class="text-destructive">{{ error() }}</ui-dialog-description>
        </ui-dialog-header>
        <ui-dialog-footer>
          <ui-button variant="outline" label="Close" (clicked)="close()" />
        </ui-dialog-footer>
      } @else if (project(); as details) {
        <ui-dialog-header>
          <ui-dialog-title>{{ details.name }}</ui-dialog-title>
          <ui-dialog-description>{{ details.clientCompanyName }}</ui-dialog-description>
        </ui-dialog-header>

        <ui-dialog-content class="space-y-5">
          <div class="space-y-1.5">
            <h3 class="text-sm font-medium text-foreground">Description</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {{ details.description.trim() === '' ? 'No description provided.' : details.description }}
            </p>
          </div>

          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
              <dd class="text-sm text-foreground">{{ formatProjectStatus(details.status) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Budget</dt>
              <dd class="text-sm font-medium text-foreground">
                {{ details.budget | number: '1.2-2' }} {{ details.currency }}
              </dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Start date</dt>
              <dd class="text-sm text-foreground">{{ formatDate(details.startDate) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">End date</dt>
              <dd class="text-sm text-foreground">{{ formatDate(details.endDate) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Milestones</dt>
              <dd class="text-sm text-foreground">
                {{ completedMilestones(details) }} / {{ details.milestones.length }} complete
                @if (details.overdueMilestoneCount > 0) {
                  <span class="text-destructive">({{ details.overdueMilestoneCount }} overdue)</span>
                }
              </dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Tasks</dt>
              <dd class="text-sm text-foreground">
                {{ details.taskSummary.done }} done · {{ details.taskSummary.inProgress }} in progress ·
                {{ details.taskSummary.blocked }} blocked
              </dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Open risks</dt>
              <dd class="text-sm text-foreground">{{ details.openRiskCount }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client requests</dt>
              <dd class="text-sm text-foreground">{{ details.requests.length }}</dd>
            </div>
          </dl>
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button variant="outline" label="Close" (clicked)="close()" />
          <ui-button label="Open workspace" (clicked)="openWorkspace.emit(details)" />
        </ui-dialog-footer>
      }
    </ui-dialog>
  `,
})
export class ProjectViewDialogComponent {
  private readonly projectApiService = inject(ProjectApiService);

  readonly open = input(false);
  readonly projectId = input<string | null>(null);

  readonly openChange = output<boolean>();
  readonly openWorkspace = output<ProjectDashboard>();

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly project = signal<ProjectDashboard | null>(null);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const projectId = this.projectId();

      if (!isOpen || projectId === null || projectId.trim() === '') {
        this.resetState();
        return;
      }

      void this.loadProject(projectId);
    });
  }

  protected onOpenChange(nextOpen: boolean): void {
    this.openChange.emit(nextOpen);
    if (!nextOpen) {
      this.resetState();
    }
  }

  protected close(): void {
    this.openChange.emit(false);
    this.resetState();
  }

  protected formatProjectStatus(status: ProjectDashboard['status']): string {
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

  protected formatDate(value: string): string {
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

  protected completedMilestones(details: ProjectDashboard): number {
    return details.milestones.filter((milestone) => milestone.status === 2).length;
  }

  private async loadProject(projectId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.project.set(null);

    try {
      const dashboard = await firstValueFrom(this.projectApiService.getProjectDashboard(projectId));
      this.project.set(dashboard);
    } catch (loadError) {
      this.error.set(readHttpErrorMessage(loadError, 'Unable to load project details.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetState(): void {
    this.isLoading.set(false);
    this.error.set(null);
    this.project.set(null);
  }
}
