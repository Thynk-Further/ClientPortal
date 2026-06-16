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
import { EmptyStateComponent } from '@/components/ui/empty-state.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';

const CONTRACT_STATUS_LABELS: Record<number, string> = {
  1: 'Draft',
  2: 'Awaiting signature',
  3: 'Signed',
  4: 'Expired',
  5: 'Cancelled',
};

@Component({
  selector: 'app-client-documents-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, EmptyStateComponent, StatusBadgeComponent],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="pb-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Documents</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          View, download, and sign contracts shared with your account.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading documents...</p>
      } @else if (documents().length === 0) {
        <ui-empty-state
          title="No documents yet"
          message="When contracts or files are shared with you, they will appear here."
        />
      } @else {
        <section class="space-y-3" aria-label="Document list">
          @for (document of documents(); track document.id) {
            <a
              [routerLink]="['/documents', document.id]"
              class="group flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-shadow hover:shadow-md"
            >
              <div class="w-1 shrink-0 bg-violet-500"></div>
              <div class="flex flex-1 flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div class="min-w-0 space-y-1">
                  <p class="font-medium text-foreground group-hover:text-primary">
                    {{ document.name }}
                  </p>
                  <p class="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground capitalize">
                    {{ document.kind }}
                  </p>
                </div>

                <div class="flex flex-wrap items-center gap-3 sm:justify-end">
                  @if (document.requiresSignature) {
                    <span class="text-xs font-medium text-amber-700 dark:text-amber-300">
                      Signature required
                    </span>
                  }
                  <ui-status-badge [status]="statusLabel(document.status)" />
                  <p class="text-xs text-muted-foreground">
                    Updated {{ formatDate(document.updatedAtUtc) }}
                  </p>
                </div>
              </div>
            </a>
          }
        </section>
      }
    </main>
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
