import { ChangeDetectionStrategy, Component, OnInit, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { ProjectStatus, ProjectSummary } from '@/app/core/api/services/project-api.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import {
  DataTableColumn,
  DataTableComponent,
  DataTableRow,
} from '@/components/ui/data-table.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import { ProjectHealthBadgeComponent } from './project-health-badge.component';

interface ProjectRow extends DataTableRow {
  readonly id: string;
  readonly name: string;
  readonly client: string;
  readonly status: string;
  readonly health: string;
  readonly endDate: string;
  readonly clientId: string;
}

@Component({
  selector: 'app-projects-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    DataTableComponent,
    InputComponent,
    SelectComponent,
    ProjectHealthBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 class="text-2xl font-semibold tracking-tight">Projects</h1>
            <p class="text-sm text-muted-foreground">
              Track delivery across all clients from one place.
            </p>
          </div>
          <a
            class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
            routerLink="/projects/my-tasks"
          >
            My Tasks
          </a>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>All projects</ui-card-title>
            <ui-card-description>Filter by name, client, or status.</ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <form class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]" [formGroup]="filterForm">
              <ui-input type="search" placeholder="Search projects or clients..." formControlName="search" />
              <ui-select [options]="statusOptions" placeholder="All statuses" formControlName="status" />
              <ui-button variant="outline" label="Apply" (clicked)="applyFilters()" />
            </form>

            @if (projectStore.error(); as error) {
              <p class="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ error }}
              </p>
            }

            <ui-data-table
              [columns]="columns"
              [rows]="rows()"
              rowTrackByKey="id"
              emptyStateMessage="No projects available."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />

            <div class="mt-4 flex flex-wrap gap-2">
              @for (project of projectStore.projects(); track project.id) {
                <a
                  class="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-xs hover:bg-muted"
                  [routerLink]="projectLink(project)"
                >
                  <span>{{ project.name }}</span>
                  <app-project-health-badge [health]="project.health" />
                </a>
              }
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ProjectsListComponent implements OnInit {
  protected readonly projectStore = inject(ProjectStore);
  private readonly formBuilder = inject(FormBuilder);

  protected readonly filterForm = this.formBuilder.nonNullable.group({
    search: '',
    status: '',
  });

  protected readonly statusOptions: SelectOption[] = [
    { label: 'All statuses', value: '' },
    { label: 'Planned', value: '1' },
    { label: 'In Progress', value: '2' },
    { label: 'On Hold', value: '3' },
    { label: 'Completed', value: '4' },
    { label: 'Cancelled', value: '5' },
  ];

  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'name', header: 'Project', sortable: true },
    { key: 'client', header: 'Client', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'health', header: 'Health', sortable: true },
    { key: 'endDate', header: 'End Date', sortable: true },
  ];

  protected readonly rows = computed(() =>
    this.projectStore.projects().map((project) => this.toRow(project)),
  );

  ngOnInit(): void {
    void this.applyFilters();
  }

  protected applyFilters(): void {
    const statusValue = this.filterForm.controls.status.value;
    const status = statusValue === '' ? undefined : (Number.parseInt(statusValue, 10) as ProjectStatus);
    void this.projectStore.loadProjects({
      search: this.filterForm.controls.search.value.trim() || undefined,
      status,
      page: 1,
      pageSize: 50,
    });
  }

  protected projectLink(project: ProjectSummary): string[] {
    return ['/clients', project.clientId, 'projects', project.id];
  }

  private toRow(project: ProjectSummary): ProjectRow {
    return {
      id: project.id,
      name: project.name,
      client: project.clientCompanyName,
      status: formatProjectStatus(project.status),
      health: formatHealth(project.health),
      endDate: project.endDate,
      clientId: project.clientId,
    };
  }
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

function formatHealth(health: number): string {
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
