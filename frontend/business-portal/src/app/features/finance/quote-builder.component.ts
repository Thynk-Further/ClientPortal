import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { QuoteApiService } from '@/app/core/api/services/quote-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

import {
  QuoteCreateDocumentComponent,
  QuoteCreateDocumentPayload,
} from './quote-create-document.component';

@Component({
  selector: 'app-quote-builder',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, StatusBadgeComponent, QuoteCreateDocumentComponent],
  template: `
    <div class="px-5 pb-10 sm:px-8">
      <a routerLink="/finance/quotes" class="inline-flex items-center gap-1 text-sm text-primary hover:underline">
        ← Back to quotes
      </a>

      <header class="mt-4 flex flex-wrap items-start justify-between gap-3">
        <div class="min-w-0">
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Create quote</h1>
          <p class="mt-1 text-sm text-muted-foreground">
            Prepare a formal quotation for an off-platform RFQ. Enter the recipient company and contact
            details manually.
          </p>
        </div>
        <ui-status-badge status="Draft" />
      </header>

      <div class="mt-6">
        <app-quote-create-document
          [canSubmit]="true"
          [isSaving]="isSaving()"
          (createQuote)="onCreateQuote($event)"
        />
      </div>
    </div>
  `,
})
export class QuoteBuilderComponent {
  private readonly toast = inject(ToastNotificationService);
  private readonly router = inject(Router);
  private readonly quoteApi = inject(QuoteApiService);

  protected readonly isSaving = signal(false);

  protected async onCreateQuote(payload: QuoteCreateDocumentPayload): Promise<void> {
    this.isSaving.set(true);

    try {
      const created = await firstValueFrom(
        this.quoteApi.createExternalQuote({
          quoteNumber: payload.quoteNumber,
          currency: payload.currency.toUpperCase(),
          dueDate: payload.dueDate,
          recipientCompanyName: payload.recipientCompanyName,
          recipientContactName: payload.recipientContactName,
          recipientEmail: payload.recipientEmail,
          recipientPhone: payload.recipientPhone,
          lineItems: payload.lineItems,
          notes: payload.notes,
        }),
      );

      this.toast.success('Quote created as draft.');
      await this.router.navigate(['/finance/quotes', created.id]);
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to create quote.'));
    } finally {
      this.isSaving.set(false);
    }
  }
}
