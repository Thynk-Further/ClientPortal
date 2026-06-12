import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalMessage,
  ClientPortalMessageThread,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ClientPortalMessagesSummaryService } from '@/app/core/messaging/client-portal-messages-summary.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

@Component({
  selector: 'app-client-messages-inbox',
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
    TextareaComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Messages</h1>
        <p class="text-sm text-muted-foreground">
          View conversations with your business team and send replies.
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
            <ui-card-title>Conversations</ui-card-title>
            <ui-card-description>Select a thread to read and reply.</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (isLoadingThreads()) {
              <p class="text-sm text-muted-foreground">Loading threads...</p>
            } @else if (threads().length === 0) {
              <p class="text-sm text-muted-foreground">No message threads yet.</p>
            } @else {
              <div class="space-y-2">
                @for (thread of threads(); track thread.id) {
                  <button
                    type="button"
                    class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                    [class.border-primary]="selectedThreadId() === thread.id"
                    (click)="selectThread(thread.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="truncate text-sm font-medium">{{ thread.subject }}</p>
                      @if (thread.unreadCount > 0) {
                        <span class="shrink-0 rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {{ thread.unreadCount }}
                        </span>
                      }
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ formatDateTime(thread.lastMessageAt) }}
                    </p>
                  </button>
                }
              </div>
            }
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>{{ selectedThreadSubject() }}</ui-card-title>
            <ui-card-description>
              @if (selectedThreadId() !== null) {
                Conversation history updates automatically.
              } @else {
                Select a conversation to view messages.
              }
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (selectedThreadId() === null) {
              <p class="text-sm text-muted-foreground">Choose a thread from the list.</p>
            } @else {
              <div
                class="mb-4 max-h-[420px] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3"
                aria-live="polite"
              >
                @if (isLoadingMessages()) {
                  <p class="text-sm text-muted-foreground">Loading messages...</p>
                } @else if (messages().length === 0) {
                  <p class="text-sm text-muted-foreground">No messages in this thread yet.</p>
                } @else {
                  @for (message of messages(); track message.id) {
                    <article
                      class="max-w-[85%] rounded-lg border bg-card px-3 py-2 text-sm"
                      [class.ml-auto]="isOwnMessage(message)"
                    >
                      <p class="text-xs text-muted-foreground">
                        {{ messageLabel(message) }} · {{ formatDateTime(message.sentAt) }}
                      </p>
                      <p class="mt-1 whitespace-pre-wrap text-foreground">{{ message.content }}</p>
                    </article>
                  }
                }
              </div>

              <form class="space-y-3" [formGroup]="composerForm" (ngSubmit)="sendMessage()">
                <ui-textarea
                  formControlName="content"
                  [rows]="3"
                  placeholder="Write your reply..."
                />
                <ui-button
                  type="submit"
                  [disabled]="composerForm.invalid || isSending()"
                >
                  {{ isSending() ? 'Sending...' : 'Send message' }}
                </ui-button>
              </form>
            }
          </ui-card-content>
        </ui-card>
      </section>
    </div>
  `,
})
export class ClientMessagesInboxComponent implements OnInit, OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientPortalApi = inject(ClientPortalApiService);
  private readonly messagesSummary = inject(ClientPortalMessagesSummaryService);
  private readonly userSession = inject(UserSessionService);

  private refreshTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly isLoadingThreads = signal(true);
  protected readonly isLoadingMessages = signal(false);
  protected readonly isSending = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly threads = signal<ClientPortalMessageThread[]>([]);
  protected readonly messages = signal<ClientPortalMessage[]>([]);
  protected readonly selectedThreadId = signal<string | null>(null);

  protected readonly selectedThreadSubject = computed(() => {
    const threadId = this.selectedThreadId();
    if (threadId === null) {
      return 'Conversation';
    }

    return this.threads().find((thread) => thread.id === threadId)?.subject ?? 'Conversation';
  });

  protected readonly composerForm = this.formBuilder.nonNullable.group({
    content: ['', [Validators.required, Validators.maxLength(4000)]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadThreads();
    this.refreshTimer = setInterval(() => {
      void this.refreshActiveConversation();
    }, 10_000);
  }

  ngOnDestroy(): void {
    if (this.refreshTimer !== null) {
      clearInterval(this.refreshTimer);
    }
  }

  protected selectThread(threadId: string): void {
    this.selectedThreadId.set(threadId);
    void this.loadMessages(threadId, true);
  }

  protected isOwnMessage(message: ClientPortalMessage): boolean {
    const userId = this.userSession.getUser()?.id;
    return userId !== undefined && message.senderId === userId;
  }

  protected messageLabel(message: ClientPortalMessage): string {
    return this.isOwnMessage(message) ? 'You' : 'Team';
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected async sendMessage(): Promise<void> {
    const threadId = this.selectedThreadId();
    if (threadId === null || this.composerForm.invalid) {
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);

    try {
      const content = this.composerForm.controls.content.value.trim();
      await firstValueFrom(
        this.clientPortalApi.sendMessage(threadId, {
          clientMessageId: crypto.randomUUID(),
          content,
        }),
      );
      this.composerForm.reset({ content: '' });
      await this.loadMessages(threadId, false);
      await this.loadThreads();
      await this.messagesSummary.refresh();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to send message.'));
    } finally {
      this.isSending.set(false);
    }
  }

  private async refreshActiveConversation(): Promise<void> {
    const threadId = this.selectedThreadId();
    if (threadId === null) {
      await this.loadThreads();
      await this.messagesSummary.refresh();
      return;
    }

    await Promise.all([
      this.loadThreads(),
      this.loadMessages(threadId, false),
      this.messagesSummary.refresh(),
    ]);
  }

  private async loadThreads(): Promise<void> {
    this.isLoadingThreads.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getMessageThreads());
      this.threads.set(result.threads);

      const selectedId = this.selectedThreadId();
      if (selectedId === null && result.threads.length > 0) {
        this.selectThread(result.threads[0].id);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load message threads.'));
    } finally {
      this.isLoadingThreads.set(false);
    }
  }

  private async loadMessages(threadId: string, markRead: boolean): Promise<void> {
    this.isLoadingMessages.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getThreadMessages(threadId));
      this.messages.set(result.messages);

      if (markRead) {
        await firstValueFrom(this.clientPortalApi.markThreadRead(threadId));
        await this.loadThreads();
        await this.messagesSummary.refresh();
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load messages.'));
      this.messages.set([]);
    } finally {
      this.isLoadingMessages.set(false);
    }
  }
}
