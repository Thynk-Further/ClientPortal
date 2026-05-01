import { ChangeDetectionStrategy, Component } from '@angular/core';

import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { StatCardComponent } from '@/components/ui/stat-card.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

interface DashboardStat {
  readonly label: string;
  readonly value: string;
  readonly trendValue: string;
  readonly trendLabel: string;
  readonly trendDirection: 'up' | 'down';
}

interface RecentActivityItem {
  readonly id: string;
  readonly title: string;
  readonly description: string;
  readonly status: string;
  readonly timestamp: string;
}

@Component({
  selector: 'app-business-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    StatCardComponent,
    StatusBadgeComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Business Dashboard</h1>
          <p class="text-sm text-muted-foreground">
            Portfolio health, billing risk, and next meetings in one place.
          </p>
        </header>

        <section
          class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
          aria-label="Summary metrics"
        >
          @for (stat of stats; track stat.label) {
            <ui-stat-card
              [label]="stat.label"
              [value]="stat.value"
              [trendValue]="stat.trendValue"
              [trendLabel]="stat.trendLabel"
              [trendDirection]="stat.trendDirection"
            />
          }
        </section>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Recent activity</ui-card-title>
            <ui-card-description>
              Latest operational updates across clients, invoices, and meetings.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <ul class="space-y-3">
              @for (item of recentActivity; track item.id) {
                <li
                  class="flex flex-col gap-2 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div class="space-y-1">
                    <p class="font-medium">{{ item.title }}</p>
                    <p class="text-sm text-muted-foreground">{{ item.description }}</p>
                  </div>

                  <div class="flex items-center gap-3">
                    <span class="text-xs text-muted-foreground">{{ item.timestamp }}</span>
                    <ui-status-badge [status]="item.status" />
                  </div>
                </li>
              }
            </ul>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class BusinessDashboardComponent {
  protected readonly stats: ReadonlyArray<DashboardStat> = [
    {
      label: 'Active clients',
      value: '48',
      trendValue: '6%',
      trendLabel: 'vs last month',
      trendDirection: 'up',
    },
    {
      label: 'Open invoices',
      value: '19',
      trendValue: '2',
      trendLabel: 'new this week',
      trendDirection: 'up',
    },
    {
      label: 'Overdue amount',
      value: '$14,230',
      trendValue: '4%',
      trendLabel: 'improved collection rate',
      trendDirection: 'down',
    },
    {
      label: 'Upcoming meetings',
      value: '11',
      trendValue: '3',
      trendLabel: 'scheduled for today',
      trendDirection: 'up',
    },
  ];

  protected readonly recentActivity: ReadonlyArray<RecentActivityItem> = [
    {
      id: 'activity-1',
      title: 'Invoice INV-2026-041 marked as paid',
      description: 'Contoso Architects settled a $2,400 invoice.',
      status: 'Paid',
      timestamp: '10 minutes ago',
    },
    {
      id: 'activity-2',
      title: 'Project kickoff meeting confirmed',
      description: 'Northwind Retail kickoff moved to Monday 09:00.',
      status: 'Approved',
      timestamp: '35 minutes ago',
    },
    {
      id: 'activity-3',
      title: 'Payment reminder sent',
      description: 'Reminder issued for two invoices due in 3 days.',
      status: 'Sent',
      timestamp: '1 hour ago',
    },
    {
      id: 'activity-4',
      title: 'Contract renewal at risk',
      description: 'Fabrikam account flagged because of pending legal review.',
      status: 'Pending',
      timestamp: '2 hours ago',
    },
  ];
}
