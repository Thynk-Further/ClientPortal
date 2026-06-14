import { ChangeDetectionStrategy, Component, input, output, signal } from '@angular/core';

import { NoticeListItem } from '@/app/core/api/services/notice-api.service';
import { MessageAttachmentMetadata } from '@/app/core/messaging/messaging.models';
import { isImageAttachment } from '@/app/core/messaging/messaging.models';
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '@/components/ui/dialog.component';
import { ButtonComponent } from '@/components/ui/button.component';

@Component({
  selector: 'app-notice-view-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogContentComponent,
    DialogFooterComponent,
    ButtonComponent,
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-2xl"
      ariaLabel="Notice details"
      (openChange)="onOpenChange($event)"
    >
      @if (notice(); as item) {
        <ui-dialog-header>
          <div class="flex flex-wrap items-start justify-between gap-3 pr-8">
            <div class="min-w-0 space-y-1">
              <ui-dialog-title class="leading-snug">{{ item.title }}</ui-dialog-title>
              <ui-dialog-description>
                Published {{ formatDateTime(item.publishedAt) }}
              </ui-dialog-description>
            </div>
            <span [class]="statusBadgeClass(item.isActive)">
              {{ item.isActive ? 'Published' : 'Archived' }}
            </span>
          </div>
        </ui-dialog-header>

        <ui-dialog-content class="space-y-5">
          <div class="rounded-lg border bg-muted/20 p-4">
            <p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{{ item.content }}</p>
          </div>

          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Audience</dt>
              <dd class="text-sm text-foreground">{{ audienceLabel() }}</dd>
            </div>
            @if (item.expiresAt) {
              <div class="space-y-1">
                <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Expires</dt>
                <dd class="text-sm text-foreground">{{ formatDateTime(item.expiresAt) }}</dd>
              </div>
            }
          </dl>

          @if (item.attachments !== null && item.attachments.length > 0) {
            <div class="space-y-3">
              <h3 class="text-sm font-medium text-foreground">
                Attachments ({{ item.attachments.length }})
              </h3>
              <ul class="space-y-2">
                @for (attachment of item.attachments; track attachment.url) {
                  <li class="flex items-center gap-3 rounded-lg border bg-background p-3">
                    @if (isImageAttachment(attachment.contentType)) {
                      <div class="h-12 w-12 shrink-0 overflow-hidden rounded-md border bg-muted/30">
                        <img
                          [src]="attachment.url"
                          [alt]="attachment.fileName"
                          class="h-full w-full object-cover"
                        />
                      </div>
                    } @else {
                      <span
                        class="grid h-12 w-12 shrink-0 place-content-center rounded-md border bg-muted/30 text-muted-foreground"
                      >
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6Z"
                          />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M14 2v6h6" />
                        </svg>
                      </span>
                    }

                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-foreground">{{ attachment.fileName }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatFileSize(attachment.sizeBytes) }} · {{ formatContentType(attachment.contentType) }}
                      </p>
                    </div>

                    <div class="flex shrink-0 items-center gap-1">
                      @if (isImageAttachment(attachment.contentType)) {
                        <button
                          type="button"
                          class="icon-btn"
                          aria-label="Preview {{ attachment.fileName }}"
                          (click)="previewAttachment(attachment)"
                        >
                          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.75"
                              d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"
                            />
                            <circle cx="12" cy="12" r="3" />
                          </svg>
                        </button>
                      }
                      <button
                        type="button"
                        class="icon-btn"
                        aria-label="Open {{ attachment.fileName }}"
                        (click)="openAttachment(attachment)"
                      >
                        <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                          <path
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            stroke-width="1.75"
                            d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"
                          />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M15 3h6v6" />
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 14 21 3" />
                        </svg>
                      </button>
                    </div>
                  </li>
                }
              </ul>
            </div>
          }
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button variant="outline" label="Close" (clicked)="close()" />
        </ui-dialog-footer>
      }
    </ui-dialog>

    @if (previewUrl() !== null) {
      <div
        class="fixed inset-0 z-[60] flex items-center justify-center bg-background/90 p-4 backdrop-blur-sm"
        role="dialog"
        aria-label="Attachment preview"
        (click)="closePreview()"
      >
        <button
          type="button"
          class="absolute right-4 top-4 rounded-md border bg-background px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          (click)="closePreview()"
        >
          Close preview
        </button>
        <img
          [src]="previewUrl()!"
          [alt]="previewFileName() ?? 'Attachment preview'"
          class="max-h-[85vh] max-w-full rounded-lg border shadow-lg"
          (click)="$event.stopPropagation()"
        />
      </div>
    }
  `,
  styles: [
    `
      .icon-btn {
        display: inline-flex;
        height: 2rem;
        width: 2rem;
        align-items: center;
        justify-content: center;
        border-radius: 0.5rem;
        color: hsl(var(--muted-foreground));
        transition: background-color 0.15s ease, color 0.15s ease;
      }

      .icon-btn:hover {
        background: hsl(var(--muted) / 0.6);
        color: hsl(var(--foreground));
      }
    `,
  ],
})
export class NoticeViewDialogComponent {
  readonly open = input(false);
  readonly notice = input<NoticeListItem | null>(null);
  readonly audienceLabel = input('All Clients');

  readonly openChange = output<boolean>();

  protected readonly previewUrl = signal<string | null>(null);
  protected readonly previewFileName = signal<string | null>(null);

  protected isImageAttachment(contentType: string): boolean {
    return isImageAttachment(contentType);
  }

  protected statusBadgeClass(isActive: boolean): string {
    return isActive
      ? 'inline-flex shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : 'inline-flex shrink-0 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-xs font-medium text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400';
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected formatFileSize(bytes: number): string {
    if (bytes < 1024) {
      return `${bytes} B`;
    }

    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }

    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  protected formatContentType(contentType: string): string {
    if (contentType === 'application/pdf') {
      return 'PDF';
    }

    if (contentType.startsWith('image/')) {
      return contentType.replace('image/', '').toUpperCase();
    }

    return contentType;
  }

  protected previewAttachment(attachment: MessageAttachmentMetadata): void {
    this.previewUrl.set(attachment.url);
    this.previewFileName.set(attachment.fileName);
  }

  protected openAttachment(attachment: MessageAttachmentMetadata): void {
    window.open(attachment.url, '_blank', 'noopener,noreferrer');
  }

  protected closePreview(): void {
    this.previewUrl.set(null);
    this.previewFileName.set(null);
  }

  protected onOpenChange(isOpen: boolean): void {
    if (!isOpen) {
      this.closePreview();
    }

    this.openChange.emit(isOpen);
  }

  protected close(): void {
    this.onOpenChange(false);
  }
}
