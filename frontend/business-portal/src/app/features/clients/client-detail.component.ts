import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

type ClientDetailTab =
  | 'overview'
  | 'projects'
  | 'invoices'
  | 'documents'
  | 'messages'
  | 'requests';

interface TabDefinition {
  readonly key: ClientDetailTab;
  readonly label: string;
  readonly description: string;
}

@Component({
  selector: 'app-client-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
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
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Client Detail</h1>
              <p class="text-sm text-muted-foreground">
                Review account context for <span class="font-medium">{{ clientId() }}</span>
                across operations and communication workflows.
              </p>
            </div>

            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/clients']"
            >
              Back to clients
            </a>
          </div>
        </header>

        <section class="rounded-xl border bg-card p-2" aria-label="Client detail tabs">
          <div class="grid grid-cols-2 gap-2 md:grid-cols-6">
            @for (tab of tabs; track tab.key) {
              <button
                type="button"
                class="rounded-md px-3 py-2 text-sm transition-colors"
                [class]="tab.key === activeTab() ? activeTabClasses : inactiveTabClasses"
                (click)="setActiveTab(tab.key)"
              >
                {{ tab.label }}
              </button>
            }
          </div>
        </section>

        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ activeTabDefinition().label }}</ui-card-title>
            <ui-card-description>{{ activeTabDefinition().description }}</ui-card-description>
          </ui-card-header>

          <ui-card-content>
            @switch (activeTab()) {
              @case ('overview') {
                <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <article class="rounded-lg border p-3">
                    <p class="text-xs text-muted-foreground">Account Status</p>
                    <p class="text-lg font-semibold">Active</p>
                  </article>
                  <article class="rounded-lg border p-3">
                    <p class="text-xs text-muted-foreground">Current Projects</p>
                    <p class="text-lg font-semibold">4</p>
                  </article>
                  <article class="rounded-lg border p-3">
                    <p class="text-xs text-muted-foreground">Outstanding Balance</p>
                    <p class="text-lg font-semibold">$5,280</p>
                  </article>
                </div>
              }
              @case ('projects') {
                <ul class="space-y-2 text-sm">
                  <li class="rounded-md border p-3">Website redesign - In Progress</li>
                  <li class="rounded-md border p-3">Mobile app v2 - Planning</li>
                  <li class="rounded-md border p-3">SLA refresh - Pending approval</li>
                </ul>
              }
              @case ('invoices') {
                <ul class="space-y-2 text-sm">
                  <li class="rounded-md border p-3">INV-2026-042 | $2,100 | Due in 5 days</li>
                  <li class="rounded-md border p-3">INV-2026-036 | $1,480 | Paid</li>
                  <li class="rounded-md border p-3">INV-2026-030 | $3,800 | Overdue by 4 days</li>
                </ul>
              }
              @case ('documents') {
                <ul class="space-y-2 text-sm">
                  <li class="rounded-md border p-3">Master Services Agreement.pdf</li>
                  <li class="rounded-md border p-3">Q2 Statement of Work.docx</li>
                  <li class="rounded-md border p-3">Security Questionnaire.xlsx</li>
                </ul>
              }
              @case ('messages') {
                <ul class="space-y-2 text-sm">
                  <li class="rounded-md border p-3">Today 10:40 - Follow-up on invoice timeline</li>
                  <li class="rounded-md border p-3">Yesterday 16:20 - Project scope clarification</li>
                  <li class="rounded-md border p-3">Yesterday 11:05 - Meeting notes shared</li>
                </ul>
              }
              @case ('requests') {
                <ul class="space-y-2 text-sm">
                  <li class="rounded-md border p-3">Access request for new procurement user</li>
                  <li class="rounded-md border p-3">Feature request: multi-currency invoices</li>
                  <li class="rounded-md border p-3">Support request: export historical statements</li>
                </ul>
              }
            }
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ClientDetailComponent {
  private readonly route = inject(ActivatedRoute);

  protected readonly clientId = computed(
    () => this.route.snapshot.paramMap.get('clientId') ?? 'unknown-client',
  );

  protected readonly tabs: ReadonlyArray<TabDefinition> = [
    {
      key: 'overview',
      label: 'Overview',
      description: 'High-level client metrics and relationship health indicators.',
    },
    {
      key: 'projects',
      label: 'Projects',
      description: 'Current and upcoming project work for this client account.',
    },
    {
      key: 'invoices',
      label: 'Invoices',
      description: 'Billing status, due dates, and payment collection visibility.',
    },
    {
      key: 'documents',
      label: 'Documents',
      description: 'Contracts, statements of work, and shared compliance artifacts.',
    },
    {
      key: 'messages',
      label: 'Messages',
      description: 'Recent communication timeline for internal and client-facing updates.',
    },
    {
      key: 'requests',
      label: 'Requests',
      description: 'Open support, access, and feature requests requiring follow-up.',
    },
  ];

  protected readonly activeTab = signal<ClientDetailTab>('overview');
  protected readonly activeTabDefinition = computed(
    () => this.tabs.find((tab) => tab.key === this.activeTab()) ?? this.tabs[0],
  );

  protected readonly activeTabClasses =
    'bg-primary text-primary-foreground border border-primary';
  protected readonly inactiveTabClasses =
    'bg-background text-foreground border border-input hover:bg-muted';

  protected setActiveTab(tab: ClientDetailTab): void {
    this.activeTab.set(tab);
  }
}
