import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalNoticeListItem,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ClientPortalNoticesSummaryService } from '@/app/core/notices/client-portal-notices-summary.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';

@Component({
  selector: 'app-client-notices',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Notices</h1>
        <p class="text-sm text-muted-foreground">
          Company announcements from your business team. Unread notices are highlighted.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      <section class="grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr]">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Announcements</ui-card-title>
            <ui-card-description>
              @if (unreadCount() > 0) {
                {{ unreadCount() }} unread notice{{ unreadCount() === 1 ? '' : 's' }}
              } @else {
                All caught up
              }
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading notices...</p>
            } @else if (notices().length === 0) {
              <p class="text-sm text-muted-foreground">No announcements right now.</p>
            } @else {
              <div class="space-y-2">
                @for (notice of notices(); track notice.id) {
                  <button
                    type="button"
                    class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                    [class.border-primary]="selectedNoticeId() === notice.id"
                    [class.bg-primary/5]="!notice.isRead"
                    (click)="selectNotice(notice.id)"
                  >
                    <div class="flex items-start justify-between gap-2">
                      <p class="truncate text-sm font-medium">{{ notice.title }}</p>
                      @if (!notice.isRead) {
                        <span class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          New
                        </span>
                      }
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ formatDateTime(notice.publishedAt) }}
                    </p>
                  </button>
                }
              </div>
            }
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ selectedNoticeTitle() }}</ui-card-title>
            <ui-card-description>
              @if (selectedNotice(); as notice) {
                Published {{ formatDateTime(notice.publishedAt) }}
                @if (notice.expiresAt) {
                  · Expires {{ formatDateTime(notice.expiresAt) }}
                }
              } @else {
                Select an announcement to read the full message.
              }
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (selectedNotice(); as notice) {
              <article class="space-y-4">
                <p class="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{{ notice.content }}</p>

                @if (!notice.isRead) {
                  <ui-button
                    label="Mark as read"
                    [disabled]="isMarkingRead()"
                    (clicked)="markSelectedAsRead()"
                  />
                } @else if (notice.readAtUtc) {
                  <p class="text-xs text-muted-foreground">
                    Read {{ formatDateTime(notice.readAtUtc) }}
                  </p>
                }
              </article>
            } @else {
              <p class="text-sm text-muted-foreground">Choose a notice from the list.</p>
            }
          </ui-card-content>
        </ui-card>
      </section>
    </div>
  `,
})
export class ClientNoticesComponent implements OnInit {
  private readonly clientPortalApi = inject(ClientPortalApiService);
  private readonly noticesSummary = inject(ClientPortalNoticesSummaryService);

  protected readonly isLoading = signal(true);
  protected readonly isMarkingRead = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly notices = signal<ClientPortalNoticeListItem[]>([]);
  protected readonly unreadCount = signal(0);
  protected readonly selectedNoticeId = signal<string | null>(null);

  protected readonly selectedNotice = computed(() => {
    const noticeId = this.selectedNoticeId();
    if (noticeId === null) {
      return null;
    }

    return this.notices().find((notice) => notice.id === noticeId) ?? null;
  });

  protected readonly selectedNoticeTitle = computed(() => {
    return this.selectedNotice()?.title ?? 'Announcement';
  });

  async ngOnInit(): Promise<void> {
    await this.loadNotices();
  }

  protected selectNotice(noticeId: string): void {
    this.selectedNoticeId.set(noticeId);

    const notice = this.notices().find((item) => item.id === noticeId);
    if (notice !== undefined && !notice.isRead) {
      void this.markAsRead(noticeId);
    }
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

  protected async markSelectedAsRead(): Promise<void> {
    const noticeId = this.selectedNoticeId();
    if (noticeId === null) {
      return;
    }

    await this.markAsRead(noticeId);
  }

  private async markAsRead(noticeId: string): Promise<void> {
    const notice = this.notices().find((item) => item.id === noticeId);
    if (notice?.isRead) {
      return;
    }

    this.isMarkingRead.set(true);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.clientPortalApi.markNoticeRead(noticeId));
      await this.loadNotices();
      this.selectedNoticeId.set(noticeId);
      await this.noticesSummary.refresh();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to mark notice as read.'));
    } finally {
      this.isMarkingRead.set(false);
    }
  }

  private async loadNotices(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getNotices());
      this.notices.set(result.notices);
      this.unreadCount.set(result.unreadCount);

      const selectedId = this.selectedNoticeId();
      if (selectedId === null && result.notices.length > 0) {
        this.selectedNoticeId.set(result.notices[0].id);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load notices.'));
      this.notices.set([]);
      this.unreadCount.set(0);
    } finally {
      this.isLoading.set(false);
    }
  }
}
