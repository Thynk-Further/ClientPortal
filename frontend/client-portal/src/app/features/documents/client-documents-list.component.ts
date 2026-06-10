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
  ClientPortalDocumentListItem,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

const CONTRACT_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Awaiting signature',
  3: 'Signed',
  4: 'Expired',
  5: 'Cancelled',
};

const CONTRACT_STATUS_CLASSES: Record<number, string> = {
  1: 'bg-muted text-muted-foreground',
  2: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
  3: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  4: 'bg-muted text-muted-foreground',
  5: 'bg-muted text-muted-foreground',
};

@Component({
  selector: 'app-client-documents-list',
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
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Documents</h1>
        <p class="text-sm text-muted-foreground">
          View, download, and sign contracts shared with your account.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading documents...</p>
      } @else if (documents().length === 0) {
        <ui-card class="border-dashed">
          <ui-card-header>
            <ui-card-title>No documents yet</ui-card-title>
            <ui-card-description>
              When contracts or files are shared with you, they will appear here.
            </ui-card-description>
          </ui-card-header>
        </ui-card>
      } @else {
        <section class="space-y-3" aria-label="Document list">
          @for (document of documents(); track document.id) {
            <ui-card class="transition-shadow hover:shadow-md">
              <ui-card-content class="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-1">
                  <p class="font-medium text-foreground">
                    <a
                      [routerLink]="['/documents', document.id]"
                      class="hover:text-primary hover:underline underline-offset-4"
                    >
                      {{ document.name }}
                    </a>
                  </p>
                  <p class="text-sm capitalize text-muted-foreground">{{ document.kind }}</p>
                </div>

                <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                  @if (document.requiresSignature) {
                    <span class="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Signature required
                    </span>
                  }
                  <span
                    class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
                    [class]="statusClass(document.status)"
                  >
                    {{ statusLabel(document.status) }}
                  </span>
                  <p class="text-xs text-muted-foreground">
                    Updated {{ formatDate(document.updatedAtUtc) }}
                  </p>
                </div>
              </ui-card-content>
            </ui-card>
          }
        </section>
      }
    </div>
  `,
})
export class ClientDocumentsListComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly documents = signal<ClientPortalDocumentListItem[]>([]);

  async ngOnInit(): Promise<void> {
    await this.loadDocuments();
  }

  protected statusLabel(status: number): string {
    return CONTRACT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusClass(status: number): string {
    return CONTRACT_STATUS_CLASSES[status] ?? CONTRACT_STATUS_CLASSES[1];
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  }

  private async loadDocuments(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getDocuments());
      this.documents.set(result.documents);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load documents.'));
    } finally {
      this.isLoading.set(false);
    }
  }
}
