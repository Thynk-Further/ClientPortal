import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  ClientApiService,
  ClientSummary,
} from '@/app/core/api/services/client-api.service';
import {
  NoticeApiService,
  NoticeListItem,
} from '@/app/core/api/services/notice-api.service';
import {
  uploadMessageAttachment,
  validateMessageAttachmentFile,
} from '@/app/core/messaging/message-attachment.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { NoticeViewDialogComponent } from './notice-view-dialog.component';

const MAX_ATTACHMENTS = 5;
type NoticeStatusFilter = 'active' | 'archived';

@Component({
  selector: 'app-notices-manager',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
    NoticeViewDialogComponent,
  ],
  styles: [
    `
      .notices-column-panel {
        display: flex;
        height: min(70vh, 640px);
        max-height: min(70vh, 640px);
        flex-direction: column;
      }

      .notices-column-body {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
      }

      .publish-form {
        display: flex;
        min-height: 0;
        flex: 1;
        flex-direction: column;
        gap: 0.75rem;
      }

      .publish-form-actions {
        margin-top: auto;
        padding-top: 0.25rem;
      }

      .notice-filter-tabs {
        display: inline-flex;
        gap: 0.25rem;
        border-radius: 0.625rem;
        border: 1px solid hsl(var(--border));
        background: hsl(var(--muted) / 0.35);
        padding: 0.25rem;
      }

      .notice-filter-tab {
        border-radius: 0.5rem;
        padding: 0.375rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 500;
        color: hsl(var(--muted-foreground));
        transition: background-color 0.15s ease, color 0.15s ease, box-shadow 0.15s ease;
      }

      .notice-filter-tab:hover {
        color: hsl(var(--foreground));
      }

      .notice-filter-tab.is-active {
        background: hsl(var(--background));
        color: hsl(var(--foreground));
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.06);
      }

      .notices-scroll {
        min-height: 0;
        flex: 1;
        overflow-y: auto;
        padding-right: 0.25rem;
        scrollbar-width: thin;
        scrollbar-color: hsl(var(--border)) transparent;
      }

      .notices-scroll::-webkit-scrollbar {
        width: 6px;
      }

      .notices-scroll::-webkit-scrollbar-thumb {
        border-radius: 9999px;
        background: hsl(var(--border));
      }

      .notices-scroll::-webkit-scrollbar-track {
        background: transparent;
      }

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
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Notices</h1>
          <p class="text-sm text-muted-foreground">
            Publish notices, target relevant clients, and archive outdated announcements.
          </p>
        </header>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <ui-card class="notices-column-panel">
            <ui-card-header class="shrink-0">
              <ui-card-title>Publish Notice</ui-card-title>
              <ui-card-description>
                Create a notice and target the intended client audience.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content class="notices-column-body">
              <form class="publish-form" [formGroup]="noticeForm" (ngSubmit)="onPublishNotice()">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Title</label>
                  <ui-input formControlName="title" placeholder="Platform maintenance notice" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Message</label>
                  <ui-textarea formControlName="message" [rows]="4" placeholder="Notice details..." />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Target</label>
                  <ui-select
                    [options]="audienceOptions"
                    formControlName="audience"
                    [required]="true"
                    placeholder="Select audience"
                  />
                </div>

                @if (noticeForm.controls.audience.value === 'specific') {
                  <div class="rounded-lg border p-3">
                    <p class="mb-2 text-xs text-muted-foreground">Select specific clients</p>
                    @if (isLoadingClients()) {
                      <p class="text-xs text-muted-foreground">Loading clients...</p>
                    } @else if (availableClients().length === 0) {
                      <p class="text-xs text-muted-foreground">No clients available.</p>
                    } @else {
                      <div class="flex flex-wrap gap-2">
                        @for (client of availableClients(); track client.id) {
                          <button
                            type="button"
                            class="rounded-md border px-2 py-1 text-xs"
                            [class.bg-primary]="selectedClientIds().includes(client.id)"
                            [class.text-primary-foreground]="selectedClientIds().includes(client.id)"
                            (click)="toggleClientSelection(client.id)"
                          >
                            {{ client.companyName }}
                          </button>
                        }
                      </div>
                    }
                  </div>
                }

                <div class="space-y-2">
                  <label class="text-xs text-muted-foreground">Attachments (optional)</label>
                  @if (pendingAttachments().length > 0) {
                    <div class="space-y-1">
                      @for (file of pendingAttachments(); track file.name + file.size) {
                        <div class="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-xs">
                          <span class="truncate">📎 {{ file.name }}</span>
                          <button
                            type="button"
                            class="shrink-0 text-muted-foreground hover:text-foreground"
                            (click)="removePendingAttachment(file)"
                          >
                            Remove
                          </button>
                        </div>
                      }
                    </div>
                  }
                  <div class="flex items-center gap-2">
                    <button
                      type="button"
                      class="rounded-md border px-3 py-1.5 text-xs hover:bg-muted/50"
                      [disabled]="pendingAttachments().length >= maxAttachments || isPublishing()"
                      (click)="attachmentInput.click()"
                    >
                      Attach files
                    </button>
                    <span class="text-xs text-muted-foreground">
                      JPEG, PNG, WebP, PDF, or plain text · up to {{ maxAttachments }} files
                    </span>
                    <input
                      #attachmentInput
                      type="file"
                      class="hidden"
                      multiple
                      accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                      (change)="onAttachmentsSelected($event)"
                    />
                  </div>
                </div>

                <div class="publish-form-actions">
                  <ui-button
                    type="submit"
                    label="Publish Notice"
                    [disabled]="isPublishing()"
                  />
                </div>
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card class="notices-column-panel">
            <ui-card-header class="shrink-0">
              <div class="space-y-3">
                <div>
                  <ui-card-title>Published Notices</ui-card-title>
                  <ui-card-description>
                    Browse active announcements or review archived notices.
                  </ui-card-description>
                </div>

                <div
                  class="notice-filter-tabs"
                  role="tablist"
                  aria-label="Notice status filter"
                >
                  <button
                    type="button"
                    class="notice-filter-tab"
                    role="tab"
                    [class.is-active]="noticeStatusFilter() === 'active'"
                    [attr.aria-selected]="noticeStatusFilter() === 'active'"
                    (click)="setNoticeStatusFilter('active')"
                  >
                    Active ({{ activeNoticeCount() }})
                  </button>
                  <button
                    type="button"
                    class="notice-filter-tab"
                    role="tab"
                    [class.is-active]="noticeStatusFilter() === 'archived'"
                    [attr.aria-selected]="noticeStatusFilter() === 'archived'"
                    (click)="setNoticeStatusFilter('archived')"
                  >
                    Archived ({{ archivedNoticeCount() }})
                  </button>
                </div>
              </div>
            </ui-card-header>
            <ui-card-content class="notices-column-body">
              @if (isLoadingNotices()) {
                <div class="flex flex-1 items-center justify-center">
                  <p class="text-sm text-muted-foreground">Loading notices...</p>
                </div>
              } @else if (notices().length === 0) {
                <div class="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <span class="mb-3 grid h-12 w-12 place-content-center rounded-full bg-muted/60 text-muted-foreground">
                    <svg class="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                      <path
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        stroke-width="1.75"
                        d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                      />
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4M12 16h.01" />
                    </svg>
                  </span>
                  <p class="text-sm font-medium text-foreground">No notices yet</p>
                  <p class="mt-1 max-w-xs text-xs text-muted-foreground">
                    Published announcements will appear here for quick review and archiving.
                  </p>
                </div>
              } @else if (filteredNotices().length === 0) {
                <div class="flex flex-1 flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
                  <p class="text-sm font-medium text-foreground">{{ emptyFilterMessage() }}</p>
                  <p class="mt-1 max-w-xs text-xs text-muted-foreground">
                    {{ emptyFilterHint() }}
                  </p>
                </div>
              } @else {
                <div class="notices-scroll space-y-2">
                  @for (notice of filteredNotices(); track notice.id) {
                    <article
                      class="group rounded-xl border bg-card p-3 transition-colors hover:border-foreground/15 hover:bg-muted/20"
                      [class.opacity-70]="!notice.isActive"
                    >
                      <div class="flex items-start gap-3">
                        <span
                          class="grid h-10 w-10 shrink-0 place-content-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300"
                        >
                          <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                            <path
                              stroke-linecap="round"
                              stroke-linejoin="round"
                              stroke-width="1.75"
                              d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10Z"
                            />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M12 8v4M12 16h.01" />
                          </svg>
                        </span>

                        <div class="min-w-0 flex-1">
                          <div class="flex items-start justify-between gap-2">
                            <div class="min-w-0">
                              <p class="truncate text-sm font-semibold text-foreground">{{ notice.title }}</p>
                              <p class="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                                {{ notice.content }}
                              </p>
                            </div>
                            <span [class]="noticeStatusClass(notice.isActive)">
                              {{ notice.isActive ? 'Published' : 'Archived' }}
                            </span>
                          </div>

                          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            <span>{{ formatAudience(notice) }}</span>
                            <span aria-hidden="true">·</span>
                            <span>{{ formatDateTime(notice.publishedAt) }}</span>
                            @if (attachmentCount(notice) > 0) {
                              <span aria-hidden="true">·</span>
                              <span class="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5">
                                <svg class="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                  <path
                                    stroke-linecap="round"
                                    stroke-linejoin="round"
                                    stroke-width="1.75"
                                    d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                                  />
                                </svg>
                                {{ attachmentCount(notice) }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>

                      <div class="mt-3 flex items-center justify-end gap-1 border-t border-border/50 pt-2">
                        <button
                          type="button"
                          class="icon-btn"
                          aria-label="View notice {{ notice.title }}"
                          (click)="openNoticeView(notice)"
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
                        @if (noticeStatusFilter() === 'active') {
                          <button
                            type="button"
                            class="icon-btn text-destructive/80 hover:text-destructive disabled:opacity-40"
                            aria-label="Archive notice {{ notice.title }}"
                            [disabled]="!notice.isActive || isArchiving(notice.id)"
                            (click)="onArchiveNotice(notice.id)"
                          >
                            <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                              <rect x="3" y="4" width="18" height="4" rx="1" stroke-width="1.75" />
                              <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.75"
                                d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8"
                              />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M10 12v6M14 12v6" />
                            </svg>
                          </button>
                        }
                      </div>
                    </article>
                  }
                </div>
              }
            </ui-card-content>
          </ui-card>
        </section>
      </section>

      <app-notice-view-dialog
        [open]="viewDialogOpen()"
        [notice]="viewingNotice()"
        [audienceLabel]="viewingAudienceLabel()"
        (openChange)="onViewDialogOpenChange($event)"
      />
    </main>
  `,
})
export class NoticesManagerComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly noticeApi = inject(NoticeApiService);
  private readonly clientApi = inject(ClientApiService);

  @ViewChild('attachmentInput') private attachmentInput?: ElementRef<HTMLInputElement>;

  protected readonly maxAttachments = MAX_ATTACHMENTS;

  protected readonly audienceOptions: ReadonlyArray<SelectOption> = [
    { value: 'all', label: 'All clients' },
    { value: 'specific', label: 'Specific clients' },
  ];

  protected readonly noticeForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    message: ['', [Validators.required]],
    audience: ['all', [Validators.required]],
  });

  protected readonly availableClients = signal<ReadonlyArray<ClientSummary>>([]);
  protected readonly selectedClientIds = signal<ReadonlyArray<string>>([]);
  protected readonly pendingAttachments = signal<ReadonlyArray<File>>([]);
  protected readonly notices = signal<ReadonlyArray<NoticeListItem>>([]);
  protected readonly isLoadingNotices = signal(true);
  protected readonly isLoadingClients = signal(true);
  protected readonly isPublishing = signal(false);
  protected readonly archivingNoticeIds = signal<ReadonlySet<string>>(new Set());
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly viewDialogOpen = signal(false);
  protected readonly viewingNotice = signal<NoticeListItem | null>(null);
  protected readonly noticeStatusFilter = signal<NoticeStatusFilter>('active');

  protected readonly activeNoticeCount = computed(
    () => this.notices().filter((notice) => notice.isActive).length,
  );

  protected readonly archivedNoticeCount = computed(
    () => this.notices().filter((notice) => !notice.isActive).length,
  );

  protected readonly filteredNotices = computed(() => {
    const filter = this.noticeStatusFilter();
    return this.notices().filter((notice) =>
      filter === 'active' ? notice.isActive : !notice.isActive,
    );
  });

  protected readonly emptyFilterMessage = computed(() =>
    this.noticeStatusFilter() === 'active'
      ? 'No active notices'
      : 'No archived notices',
  );

  protected readonly emptyFilterHint = computed(() =>
    this.noticeStatusFilter() === 'active'
      ? 'Publish a new notice or switch to Archived to review past announcements.'
      : 'Archived notices will appear here after you archive an active announcement.',
  );

  protected readonly viewingAudienceLabel = computed(() => {
    const notice = this.viewingNotice();
    return notice === null ? 'All Clients' : this.formatAudience(notice);
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadNotices(), this.loadClients()]);
  }

  protected isArchiving(noticeId: string): boolean {
    return this.archivingNoticeIds().has(noticeId);
  }

  protected attachmentCount(notice: NoticeListItem): number {
    return notice.attachments?.length ?? 0;
  }

  protected noticeStatusClass(isActive: boolean): string {
    return isActive
      ? 'inline-flex shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/40 dark:text-emerald-300'
      : 'inline-flex shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium text-muted-foreground';
  }

  protected openNoticeView(notice: NoticeListItem): void {
    this.viewingNotice.set(notice);
    this.viewDialogOpen.set(true);
  }

  protected setNoticeStatusFilter(filter: NoticeStatusFilter): void {
    this.noticeStatusFilter.set(filter);
  }

  protected onViewDialogOpenChange(isOpen: boolean): void {
    this.viewDialogOpen.set(isOpen);
    if (!isOpen) {
      this.viewingNotice.set(null);
    }
  }

  protected toggleClientSelection(clientId: string): void {
    this.selectedClientIds.update((current) =>
      current.includes(clientId)
        ? current.filter((item) => item !== clientId)
        : [...current, clientId],
    );
  }

  protected onAttachmentsSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files !== null ? Array.from(input.files) : [];
    if (files.length === 0) {
      return;
    }

    const nextFiles: File[] = [...this.pendingAttachments()];
    for (const file of files) {
      if (nextFiles.length >= MAX_ATTACHMENTS) {
        this.toast.warning(`You can attach up to ${MAX_ATTACHMENTS} files per notice.`);
        break;
      }

      const validationError = validateMessageAttachmentFile(file);
      if (validationError !== null) {
        this.toast.warning(`${file.name}: ${validationError}`);
        continue;
      }

      if (nextFiles.some((existing) => existing.name === file.name && existing.size === file.size)) {
        continue;
      }

      nextFiles.push(file);
    }

    this.pendingAttachments.set(nextFiles);
    input.value = '';
  }

  protected removePendingAttachment(file: File): void {
    this.pendingAttachments.update((current) =>
      current.filter((item) => item !== file),
    );
  }

  protected formatAudience(notice: NoticeListItem): string {
    if (notice.targetClientIds === null || notice.targetClientIds.length === 0) {
      return 'All Clients';
    }

    const clientNames = notice.targetClientIds
      .map((clientId) => this.availableClients().find((client) => client.id === clientId)?.companyName)
      .filter((name): name is string => name !== undefined);

    if (clientNames.length === 0) {
      return `Specific Clients (${notice.targetClientIds.length})`;
    }

    return `Specific Clients (${clientNames.join(', ')})`;
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  protected async onPublishNotice(): Promise<void> {
    if (this.noticeForm.invalid) {
      this.noticeForm.markAllAsTouched();
      return;
    }

    const formValue = this.noticeForm.getRawValue();
    const specificAudienceChosen = formValue.audience === 'specific';

    if (specificAudienceChosen && this.selectedClientIds().length === 0) {
      this.toast.warning('Select at least one client for a targeted notice.');
      return;
    }

    this.isPublishing.set(true);
    this.errorMessage.set(null);

    try {
      const attachments = await this.uploadPendingAttachments();

      await firstValueFrom(
        this.noticeApi.publishNotice({
          title: formValue.title.trim(),
          content: formValue.message.trim(),
          targetClientIds: specificAudienceChosen ? [...this.selectedClientIds()] : null,
          attachments: attachments.length > 0 ? attachments : null,
        }),
      );

      this.noticeForm.reset({ title: '', message: '', audience: 'all' });
      this.selectedClientIds.set([]);
      this.pendingAttachments.set([]);
      if (this.attachmentInput?.nativeElement) {
        this.attachmentInput.nativeElement.value = '';
      }

      this.toast.success('Notice published successfully.');
      await this.loadNotices();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to publish notice.'));
    } finally {
      this.isPublishing.set(false);
    }
  }

  protected async onArchiveNotice(noticeId: string): Promise<void> {
    this.archivingNoticeIds.update((current) => new Set([...current, noticeId]));
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.noticeApi.archiveNotice(noticeId));
      this.toast.info('Notice archived.');
      this.noticeStatusFilter.set('archived');
      await this.loadNotices();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to archive notice.'));
    } finally {
      this.archivingNoticeIds.update((current) => {
        const next = new Set(current);
        next.delete(noticeId);
        return next;
      });
    }
  }

  private async uploadPendingAttachments() {
    const files = this.pendingAttachments();
    if (files.length === 0) {
      return [];
    }

    const uploaded = [];
    for (const file of files) {
      const attachment = await uploadMessageAttachment(file, async (selectedFile) => {
        const result = await firstValueFrom(
          this.noticeApi.getAttachmentUploadUrl({
            fileName: selectedFile.name,
            contentType: selectedFile.type || 'application/octet-stream',
            sizeBytes: selectedFile.size,
          }),
        );
        return { uploadUrl: result.uploadUrl, fileUrl: result.fileUrl };
      });
      uploaded.push(attachment);
    }

    return uploaded;
  }

  private async loadNotices(): Promise<void> {
    this.isLoadingNotices.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(
        this.noticeApi.getNotices({ page: 1, pageSize: 50, activeOnly: false }),
      );
      this.notices.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load notices.'));
      this.notices.set([]);
    } finally {
      this.isLoadingNotices.set(false);
    }
  }

  private async loadClients(): Promise<void> {
    this.isLoadingClients.set(true);

    try {
      const result = await firstValueFrom(
        this.clientApi.getClients({ page: 1, pageSize: 200, status: 'Active' }),
      );
      this.availableClients.set(result.items);
    } catch {
      this.availableClients.set([]);
    } finally {
      this.isLoadingClients.set(false);
    }
  }
}
