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
  ClientPortalDashboard,
  ClientPortalMeetingCard,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { StatCardComponent } from '@/components/ui/stat-card.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'In progress',
  3: 'On hold',
  4: 'Completed',
  5: 'Cancelled',
};

const INVOICE_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Sent',
  3: 'Viewed',
  4: 'Partially paid',
  5: 'Paid',
  6: 'Overdue',
  7: 'Cancelled',
};

@Component({
  selector: 'app-client-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatCardComponent, StatusBadgeComponent],
  template: `
    <main class="space-y-6 p-5 sm:p-8">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Dashboard</h1>
        <p class="text-sm text-muted-foreground">
          @if (dashboard(); as data) {
            Hello {{ data.greetingName }}, here is an overview of your workspace.
          } @else {
            Loading your workspace overview...
          }
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (dashboard(); as data) {
        <section class="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Summary">
          <ui-stat-card
            label="Active projects"
            [value]="data.activeProjects.length"
            iconPath="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"
            accentColor="#2563eb"
            accentBg="rgba(37, 99, 235, 0.12)"
            [footnote]="data.activeProjects.length === 1 ? '1 project in progress' : data.activeProjects.length + ' projects in progress'"
          />

          <ui-stat-card
            label="Outstanding invoices"
            [value]="formatCurrency(data.outstandingInvoices.totalOutstanding, data.outstandingInvoices.currency)"
            iconPath="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Zm0 2 5 5h-5V4ZM8 13h8m-8 4h5"
            accentColor="#d97706"
            accentBg="rgba(217, 119, 6, 0.12)"
            [footnote]="invoiceFootnote(data.outstandingInvoices.openCount, data.outstandingInvoices.overdueCount)"
          />

          <ui-stat-card
            label="Upcoming meetings"
            [value]="data.upcomingMeetings.length"
            iconPath="M8 2v4m8-4v4M3 10h18M5 6h14a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"
            accentColor="#059669"
            accentBg="rgba(5, 150, 105, 0.12)"
            [footnote]="nextMeetingFootnote(data.upcomingMeetings)"
          />

          <ui-stat-card
            label="Unread messages"
            [value]="data.messages.unreadCount"
            iconPath="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"
            accentColor="#7c3aed"
            accentBg="rgba(124, 58, 237, 0.12)"
            [footnote]="data.messages.totalThreads + ' conversation threads'"
          />
        </section>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">Active projects</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Projects currently in progress</p>
              </div>
              <a routerLink="/projects" class="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            @if (data.activeProjects.length === 0) {
              <p class="text-sm text-muted-foreground">No active projects right now.</p>
            } @else {
              <ul class="space-y-3">
                @for (project of data.activeProjects; track project.id) {
                  <li class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <div class="flex">
                      <div class="w-1 shrink-0 bg-blue-500"></div>
                      <div class="flex flex-1 items-start justify-between gap-3 p-4">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium">{{ project.name }}</p>
                          <p class="mt-1 text-xs text-muted-foreground">Due {{ formatDate(project.endDate) }}</p>
                        </div>
                        <ui-status-badge [status]="projectStatusLabel(project.status)" />
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">Outstanding invoices</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Open balances requiring attention</p>
              </div>
              <a routerLink="/invoices" class="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            @if (data.outstandingInvoices.recentOpenInvoices.length === 0) {
              <p class="text-sm text-muted-foreground">You have no open invoices.</p>
            } @else {
              <ul class="space-y-3">
                @for (invoice of data.outstandingInvoices.recentOpenInvoices; track invoice.id) {
                  <li class="overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md">
                    <div class="flex">
                      <div class="w-1 shrink-0 bg-amber-500"></div>
                      <div class="flex flex-1 items-start justify-between gap-3 p-4">
                        <div class="min-w-0">
                          <p class="truncate text-sm font-medium">{{ invoice.invoiceNumber }}</p>
                          <p class="mt-1 text-xs text-muted-foreground">Due {{ formatDate(invoice.dueDate) }}</p>
                        </div>
                        <div class="text-right">
                          <p class="text-sm font-semibold">
                            {{ formatCurrency(invoice.outstandingAmount, invoice.currency) }}
                          </p>
                          <div class="mt-1 flex justify-end">
                            <ui-status-badge [status]="invoiceStatusLabel(invoice.status)" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </li>
                }
              </ul>
            }
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">Recent documents</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Files and contracts shared with you</p>
              </div>
              <a routerLink="/documents" class="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            @if (data.recentDocuments.length === 0) {
              <p class="text-sm text-muted-foreground">No documents shared yet.</p>
            } @else {
              <ul class="space-y-3">
                @for (document of data.recentDocuments; track document.id) {
                  <li class="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div class="min-w-0">
                      <p class="truncate text-sm font-medium">{{ document.name }}</p>
                      <p class="mt-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {{ document.type }}
                      </p>
                    </div>
                    <p class="shrink-0 text-xs text-muted-foreground">{{ formatDateTime(document.updatedAtUtc) }}</p>
                  </li>
                }
              </ul>
            }
          </article>

          <article class="rounded-2xl border border-border/70 bg-card p-5 shadow-sm sm:p-6">
            <div class="mb-5 flex items-center justify-between gap-3">
              <div>
                <h2 class="text-base font-semibold">Upcoming meetings</h2>
                <p class="mt-0.5 text-sm text-muted-foreground">Scheduled sessions with your team</p>
              </div>
              <a routerLink="/meetings" class="text-sm font-medium text-primary hover:underline">
                View all
              </a>
            </div>

            @if (data.upcomingMeetings.length === 0) {
              <p class="text-sm text-muted-foreground">No meetings scheduled.</p>
            } @else {
              <ul class="space-y-3">
                @for (meeting of data.upcomingMeetings; track meeting.id) {
                  <li class="rounded-xl border border-border/50 bg-muted/20 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate text-sm font-medium">{{ meeting.title }}</p>
                        <p class="mt-1 text-xs text-muted-foreground">
                          {{ formatDateTime(meeting.scheduledAt) }} · {{ meeting.durationMinutes }} min
                        </p>
                      </div>
                      @if (meeting.meetingUrl.trim() !== '') {
                        <a
                          [href]="meeting.meetingUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex h-8 shrink-0 items-center rounded-lg bg-foreground px-3 text-xs font-medium text-background transition-colors hover:bg-foreground/90"
                        >
                          Join
                        </a>
                      }
                    </div>
                  </li>
                }
              </ul>
            }
          </article>
        </section>
      }
    </main>
  `,
})
export class ClientDashboardComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly dashboard = signal<ClientPortalDashboard | null>(null);
  protected readonly errorMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    try {
      const data = await firstValueFrom(this.clientPortalApi.getDashboard());
      this.dashboard.set(data);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load dashboard.'));
    }
  }

  protected formatCurrency(amount: number, currency: string): string {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: currency || 'ZAR',
        maximumFractionDigits: 2,
      }).format(amount);
    } catch {
      return `${amount.toFixed(2)} ${currency}`;
    }
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

  protected projectStatusLabel(status: number): string {
    return PROJECT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected invoiceStatusLabel(status: number): string {
    return INVOICE_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected invoiceFootnote(openCount: number, overdueCount: number): string {
    if (openCount === 0) {
      return 'All invoices are settled';
    }

    if (overdueCount > 0) {
      return `${overdueCount} overdue of ${openCount} open`;
    }

    return `${openCount} open invoice${openCount === 1 ? '' : 's'}`;
  }

  protected nextMeetingFootnote(meetings: readonly ClientPortalMeetingCard[]): string {
    if (meetings.length === 0) {
      return 'Nothing scheduled';
    }

    const next = meetings[0];
    return `Next: ${this.formatDateTime(next.scheduledAt)}`;
  }
}
