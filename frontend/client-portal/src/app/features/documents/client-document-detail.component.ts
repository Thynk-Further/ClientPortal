import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalDocumentDetail,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';

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
  selector: 'app-client-document-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
  ],
  template: `
    <div class="space-y-6">
      <div>
        <a
          routerLink="/documents"
          class="text-sm text-primary underline-offset-4 hover:underline"
        >
          ← Back to documents
        </a>
      </div>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (successMessage() !== null) {
        <p
          class="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {{ successMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading document...</p>
      } @else if (document(); as detail) {
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-2">
            <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">
              {{ detail.name }}
            </h1>
            <p class="text-sm capitalize text-muted-foreground">{{ detail.kind }}</p>
            <span
              class="inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium"
              [class]="statusClass(detail.status)"
            >
              {{ statusLabel(detail.status) }}
            </span>
          </div>

          @if (detail.canDownload) {
            <ui-button
              type="button"
              [disabled]="isDownloading()"
              (click)="downloadDocument(detail.id)"
            >
              {{ isDownloading() ? 'Preparing download...' : 'Download' }}
            </ui-button>
          }
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Details</ui-card-title>
          </ui-card-header>
          <ui-card-content class="space-y-2 text-sm">
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">Created</span>
              <span class="text-foreground">{{ formatDateTime(detail.createdAtUtc) }}</span>
            </div>
            <div class="flex justify-between gap-4">
              <span class="text-muted-foreground">Last updated</span>
              <span class="text-foreground">{{ formatDateTime(detail.updatedAtUtc) }}</span>
            </div>
            @if (detail.expiresAtUtc) {
              <div class="flex justify-between gap-4">
                <span class="text-muted-foreground">Expires</span>
                <span class="text-foreground">{{ formatDateTime(detail.expiresAtUtc) }}</span>
              </div>
            }
            @if (detail.signedAtUtc) {
              <div class="flex justify-between gap-4">
                <span class="text-muted-foreground">Signed</span>
                <span class="text-foreground">{{ formatDateTime(detail.signedAtUtc) }}</span>
              </div>
            }
            @if (detail.parties.length > 0) {
              <div class="space-y-1 pt-2">
                <p class="text-muted-foreground">Parties</p>
                <ul class="list-inside list-disc text-foreground">
                  @for (party of detail.parties; track party) {
                    <li>{{ party }}</li>
                  }
                </ul>
              </div>
            }
          </ui-card-content>
        </ui-card>

        @if (detail.requiresSignature) {
          <ui-card>
            <ui-card-header>
              <ui-card-title>Electronic signature</ui-card-title>
              <ui-card-description>
                Review the contract, enter your full legal name, and confirm your agreement to sign electronically.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form class="space-y-4" [formGroup]="signForm" (ngSubmit)="signDocument(detail.id)">
                <label class="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    formControlName="accepted"
                    class="mt-1"
                  />
                  <span>
                    I have read this contract and agree to sign it electronically. I understand this
                    constitutes a legally binding signature.
                  </span>
                </label>

                <div class="space-y-1">
                  <label class="text-sm font-medium text-foreground" for="signerName">
                    Full legal name
                  </label>
                  <ui-input
                    id="signerName"
                    formControlName="signerName"
                    placeholder="Enter your full name"
                  />
                </div>

                <ui-button
                  type="submit"
                  [disabled]="signForm.invalid || isSigning()"
                >
                  {{ isSigning() ? 'Signing...' : 'Sign contract' }}
                </ui-button>
              </form>
            </ui-card-content>
          </ui-card>
        }
      }
    </div>
  `,
})
export class ClientDocumentDetailComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly isLoading = signal(true);
  protected readonly isDownloading = signal(false);
  protected readonly isSigning = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);
  protected readonly document = signal<ClientPortalDocumentDetail | null>(null);

  protected readonly signForm = this.formBuilder.nonNullable.group({
    accepted: [false, Validators.requiredTrue],
    signerName: ['', [Validators.required, Validators.maxLength(200)]],
  });

  private documentId = '';

  async ngOnInit(): Promise<void> {
    this.documentId = this.route.snapshot.paramMap.get('documentId') ?? '';
    if (!this.documentId) {
      this.errorMessage.set('Document not found.');
      this.isLoading.set(false);
      return;
    }

    await this.loadDocument();
  }

  protected statusLabel(status: number): string {
    return CONTRACT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected statusClass(status: number): string {
    return CONTRACT_STATUS_CLASSES[status] ?? CONTRACT_STATUS_CLASSES[1];
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected async downloadDocument(documentId: string): Promise<void> {
    this.isDownloading.set(true);
    this.errorMessage.set(null);

    try {
      const download = await firstValueFrom(this.clientPortalApi.getDocumentDownloadUrl(documentId));
      window.open(download.downloadUrl, '_blank', 'noopener,noreferrer');
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to prepare download.'));
    } finally {
      this.isDownloading.set(false);
    }
  }

  protected async signDocument(documentId: string): Promise<void> {
    if (this.signForm.invalid) {
      return;
    }

    this.isSigning.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    try {
      const signerName = this.signForm.controls.signerName.value.trim();
      await firstValueFrom(this.clientPortalApi.signContract(documentId, { signerName }));
      this.successMessage.set('Contract signed successfully.');
      this.signForm.reset({ accepted: false, signerName: '' });
      await this.loadDocument();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to sign contract.'));
    } finally {
      this.isSigning.set(false);
    }
  }

  private async loadDocument(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const detail = await firstValueFrom(this.clientPortalApi.getDocument(this.documentId));
      this.document.set(detail);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load document.'));
      this.document.set(null);
    } finally {
      this.isLoading.set(false);
    }
  }
}
