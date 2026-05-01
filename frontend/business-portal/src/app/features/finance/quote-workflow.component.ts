import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

type QuoteStatus = 'Draft' | 'Sent' | 'Accepted' | 'Rejected';

@Component({
  selector: 'app-quote-workflow',
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
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <header class="space-y-1">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h1 class="text-2xl font-semibold tracking-tight">Quote Workflow</h1>
              <p class="text-sm text-muted-foreground">
                Send and process decision for
                <span class="font-medium">{{ quoteId() }}</span>.
              </p>
            </div>
            <a
              class="inline-flex h-9 items-center rounded-lg border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-muted"
              [routerLink]="['/finance/quotes']"
            >
              Back to quotes
            </a>
          </div>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Quote Status</ui-card-title>
            <ui-card-description>
              Current state of the client quote acceptance workflow.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Client</p>
                <p class="text-base font-semibold">Contoso Architects</p>
              </article>
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Total</p>
                <p class="text-base font-semibold">$6,420.00</p>
              </article>
              <article class="rounded-lg border p-3">
                <p class="text-xs text-muted-foreground">Status</p>
                <p class="text-base font-semibold">{{ status() }}</p>
              </article>
            </div>

            <div class="mt-4 flex flex-wrap items-center gap-2">
              <ui-button
                label="Send to Client"
                [disabled]="status() !== 'Draft'"
                (clicked)="onSend()"
              />
              <ui-button
                variant="secondary"
                label="Accept"
                [disabled]="status() !== 'Sent'"
                (clicked)="onAccept()"
              />
              <ui-button
                variant="destructive"
                label="Reject"
                [disabled]="status() !== 'Sent'"
                (clicked)="onReject()"
              />
            </div>

            <p class="mt-4 text-sm text-muted-foreground">
              Workflow policy: clients can only accept or reject once a quote is sent.
            </p>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class QuoteWorkflowComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastNotificationService);

  protected readonly quoteId = computed(
    () => this.route.snapshot.paramMap.get('quoteId') ?? 'unknown-quote',
  );

  protected readonly status = signal<QuoteStatus>('Draft');

  protected onSend(): void {
    this.status.set('Sent');
    this.toast.success('Quote sent to client.');
  }

  protected onAccept(): void {
    this.status.set('Accepted');
    this.toast.success('Quote accepted by client.');
  }

  protected onReject(): void {
    this.status.set('Rejected');
    this.toast.warning('Quote rejected by client.');
  }
}
