import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

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

interface ProjectRow extends DataTableRow {
  readonly id: string;
  readonly name: string;
  readonly client: string;
  readonly status: 'Active' | 'On Hold' | 'Completed';
  readonly dueDate: string;
  readonly owner: string;
}

@Component({
  selector: 'app-projects-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    DataTableComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Projects</ui-card-title>
            <ui-card-description>
              Track delivery timelines and open project workstreams across all clients.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <p class="text-sm text-muted-foreground">
                Open a project to view detailed Kanban task execution.
              </p>
              <ui-button label="Create Project" variant="outline" />
            </div>

            <ui-data-table
              [columns]="columns"
              [rows]="projects"
              rowTrackByKey="id"
              emptyStateMessage="No projects available."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />

            <div class="mt-4 rounded-lg border border-dashed p-3">
              <p class="text-xs text-muted-foreground">Open project detail:</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (project of projects; track project.id) {
                  <a
                    class="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    [routerLink]="['/projects', project.id]"
                  >
                    {{ project.name }}
                  </a>
                }
              </div>
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ProjectsListComponent {
  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'name', header: 'Project', sortable: true },
    { key: 'client', header: 'Client', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'dueDate', header: 'Due Date', sortable: true },
    { key: 'owner', header: 'Owner', sortable: true },
  ];

  protected readonly projects: ReadonlyArray<ProjectRow> = [
    {
      id: 'project-101',
      name: 'Portal Redesign',
      client: 'Contoso Architects',
      status: 'Active',
      dueDate: '2026-06-12',
      owner: 'Lerato M.',
    },
    {
      id: 'project-102',
      name: 'Invoice Automation',
      client: 'Northwind Retail',
      status: 'On Hold',
      dueDate: '2026-06-28',
      owner: 'Kai N.',
    },
    {
      id: 'project-103',
      name: 'Security Hardening',
      client: 'Fabrikam Manufacturing',
      status: 'Active',
      dueDate: '2026-05-30',
      owner: 'Amina S.',
    },
    {
      id: 'project-104',
      name: 'Data Migration',
      client: 'Blue Yonder Logistics',
      status: 'Completed',
      dueDate: '2026-04-20',
      owner: 'Jonas T.',
    },
  ];
}
