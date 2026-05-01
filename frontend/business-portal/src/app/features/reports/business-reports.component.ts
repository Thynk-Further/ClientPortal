import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

interface FinancialPoint {
  readonly month: string;
  readonly revenueK: number;
  readonly expensesK: number;
}

interface ProjectStatusPoint {
  readonly status: string;
  readonly count: number;
  readonly colorClass: string;
}

interface ClientActivityPoint {
  readonly client: string;
  readonly activity: string;
  readonly timestamp: string;
}

@Component({
  selector: 'app-business-reports',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Reports</h1>
          <p class="text-sm text-muted-foreground">
            Financial summary charts, project status overview, and client activity insights.
          </p>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Financial Summary</ui-card-title>
            <ui-card-description>
              Revenue versus expenses trend (in thousands) for the last six months.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <div class="space-y-3">
              @for (point of financialSeries; track point.month) {
                <div class="grid grid-cols-[56px_1fr] items-center gap-3">
                  <span class="text-xs text-muted-foreground">{{ point.month }}</span>
                  <div class="space-y-1">
                    <div class="flex items-center gap-2">
                      <span class="w-14 text-[11px] text-muted-foreground">Revenue</span>
                      <div class="h-2 flex-1 rounded-full bg-muted">
                        <div
                          class="h-2 rounded-full bg-emerald-500"
                          [style.width.%]="point.revenueK"
                        ></div>
                      </div>
                      <span class="w-12 text-right text-xs">&#36;{{ point.revenueK }}k</span>
                    </div>
                    <div class="flex items-center gap-2">
                      <span class="w-14 text-[11px] text-muted-foreground">Expenses</span>
                      <div class="h-2 flex-1 rounded-full bg-muted">
                        <div
                          class="h-2 rounded-full bg-amber-500"
                          [style.width.%]="point.expensesK"
                        ></div>
                      </div>
                      <span class="w-12 text-right text-xs">&#36;{{ point.expensesK }}k</span>
                    </div>
                  </div>
                </div>
              }
            </div>
          </ui-card-content>
        </ui-card>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Project Status Overview</ui-card-title>
              <ui-card-description>
                Distribution of projects by current delivery status.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-3">
                @for (status of projectStatusSeries; track status.status) {
                  <div class="space-y-1">
                    <div class="flex items-center justify-between text-sm">
                      <span>{{ status.status }}</span>
                      <span class="text-muted-foreground">{{ status.count }}</span>
                    </div>
                    <div class="h-2 rounded-full bg-muted">
                      <div
                        class="h-2 rounded-full"
                        [class]="status.colorClass"
                        [style.width.%]="status.count * 8"
                      ></div>
                    </div>
                  </div>
                }
              </div>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Client Activity</ui-card-title>
              <ui-card-description>
                Recent high-signal client interactions from operations workflows.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <ul class="space-y-3">
                @for (item of clientActivitySeries; track item.client + item.timestamp) {
                  <li class="rounded-lg border p-3">
                    <p class="text-sm font-medium">{{ item.client }}</p>
                    <p class="mt-1 text-sm">{{ item.activity }}</p>
                    <p class="mt-1 text-xs text-muted-foreground">{{ item.timestamp }}</p>
                  </li>
                }
              </ul>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class BusinessReportsComponent {
  protected readonly financialSeries: ReadonlyArray<FinancialPoint> = [
    { month: 'Jan', revenueK: 64, expensesK: 38 },
    { month: 'Feb', revenueK: 58, expensesK: 35 },
    { month: 'Mar', revenueK: 72, expensesK: 41 },
    { month: 'Apr', revenueK: 79, expensesK: 44 },
    { month: 'May', revenueK: 84, expensesK: 46 },
    { month: 'Jun', revenueK: 88, expensesK: 48 },
  ];

  protected readonly projectStatusSeries: ReadonlyArray<ProjectStatusPoint> = [
    { status: 'Active', count: 12, colorClass: 'bg-blue-500' },
    { status: 'At Risk', count: 4, colorClass: 'bg-amber-500' },
    { status: 'Blocked', count: 2, colorClass: 'bg-red-500' },
    { status: 'Completed', count: 9, colorClass: 'bg-emerald-500' },
  ];

  protected readonly clientActivitySeries: ReadonlyArray<ClientActivityPoint> = [
    {
      client: 'Contoso Architects',
      activity: 'Accepted quote Q-2026-012 and scheduled kickoff meeting.',
      timestamp: 'Today 15:10',
    },
    {
      client: 'Northwind Retail',
      activity: 'Uploaded revised SOW document and requested invoice adjustment.',
      timestamp: 'Today 12:45',
    },
    {
      client: 'Fabrikam Manufacturing',
      activity: 'Resolved overdue invoice and moved project milestone to review.',
      timestamp: 'Yesterday 17:20',
    },
  ];
}
