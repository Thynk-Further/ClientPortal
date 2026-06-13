import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom, Subscription } from 'rxjs';

import { MessageApiService } from '@/app/core/api/services/message-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { AuthContextService } from '@/app/core/auth/auth-context.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { uploadMessageAttachment } from '@/app/core/messaging/message-attachment.util';
import { MessagingHubService } from '@/app/core/messaging/messaging-hub.service';
import {
  MessageHistoryItem,
  MessageStatus,
  MessageThreadListItem,
  RealtimeMessagePayload,
  isClientMessage,
  isImageAttachment,
  mapRealtimePayloadToHistoryItem,
} from '@/app/core/messaging/messaging.models';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { CreateMessageThreadDialogComponent } from './create-message-thread-dialog.component';

@Component({
  selector: 'app-messages-inbox',
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
    CreateMessageThreadDialogComponent,
  ],
  styles: [
    `
      .chat-shell {
        background: radial-gradient(circle at top right, rgb(34 197 94 / 0.08), transparent 40%);
      }

      :host-context(.dark) .chat-shell {
        background: radial-gradient(circle at top right, rgb(34 197 94 / 0.08), transparent 40%);
      }

      .chat-panel {
        background-color: rgb(250 250 250);
        background-image: radial-gradient(rgb(0 0 0 / 0.04) 1px, transparent 1px);
        background-size: 18px 18px;
      }

      :host-context(.dark) .chat-panel {
        background-color: transparent;
        background-image: radial-gradient(rgb(255 255 255 / 0.03) 1px, transparent 1px);
      }

      .bubble-outgoing {
        background: linear-gradient(135deg, rgb(220 252 231), rgb(187 247 208));
        border: 1px solid rgb(134 239 172 / 0.8);
        color: rgb(20 83 45);
      }

      :host-context(.dark) .bubble-outgoing {
        background: linear-gradient(135deg, rgb(5 46 22), rgb(22 101 52));
        border: 1px solid rgb(34 197 94 / 0.25);
        color: rgb(236 253 245);
      }

      .bubble-incoming {
        background: rgb(255 255 255);
        border: 1px solid rgb(228 228 231);
        color: rgb(24 24 27);
      }

      :host-context(.dark) .bubble-incoming {
        background: rgb(24 24 27);
        border: 1px solid rgb(63 63 70);
        color: rgb(244 244 245);
      }

      .bubble-meta-outgoing {
        color: rgb(21 128 61 / 0.75);
      }

      :host-context(.dark) .bubble-meta-outgoing {
        color: rgb(209 250 229 / 0.7);
      }
    `,
  ],
  template: `
    <main class="chat-shell p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div class="space-y-1">
            <h1 class="text-2xl font-semibold tracking-tight text-foreground">Messages</h1>
            <p class="text-sm text-muted-foreground">
              Chat with clients in real time. Messages sync instantly over WebSockets.
            </p>
          </div>
          <ui-button
            type="button"
            label="New conversation"
            (clicked)="openCreateThreadDialog()"
          />
        </header>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Conversations</ui-card-title>
              <ui-card-description>Select a thread to open the chat.</ui-card-description>
            </ui-card-header>
            <ui-card-content>
              @if (isLoadingThreads()) {
                <p class="text-sm text-muted-foreground">Loading threads...</p>
              } @else if (threads().length === 0) {
                <div class="space-y-3">
                  <p class="text-sm text-muted-foreground">No conversations yet.</p>
                  <ui-button
                    type="button"
                    variant="outline"
                    label="Start a conversation"
                    (clicked)="openCreateThreadDialog()"
                  />
                </div>
              } @else {
                <div class="space-y-2">
                  @for (thread of threads(); track thread.id) {
                    <button
                      type="button"
                      class="w-full rounded-xl border border-border p-3 text-left transition hover:bg-muted/50"
                      [class.border-emerald-500/60]="selectedThreadId() === thread.id"
                      [class.bg-muted/40]="selectedThreadId() === thread.id"
                      (click)="selectThread(thread.id)"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <p class="truncate text-sm font-medium text-foreground">{{ thread.subject }}</p>
                        @if (thread.unreadCount > 0) {
                          <span
                            class="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white"
                          >
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

          <ui-card class="flex min-h-[640px] flex-col">
            <ui-card-header class="border-b border-border">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <ui-card-title>{{ selectedThreadSubject() }}</ui-card-title>
                  <ui-card-description>
                    @if (selectedThreadId() !== null) {
                      @if (isPeerTyping()) {
                        Client is typing...
                      } @else if (hub.connectionState() === 'connected') {
                        Connected · live updates enabled
                      } @else {
                        Connecting to live chat...
                      }
                    } @else {
                      Choose a conversation to start chatting.
                    }
                  </ui-card-description>
                </div>
              </div>
            </ui-card-header>

            <ui-card-content class="flex min-h-0 flex-1 flex-col p-0">
              @if (selectedThreadId() === null) {
                <div class="flex flex-1 items-center justify-center p-6">
                  <p class="text-sm text-muted-foreground">Select a conversation from the list.</p>
                </div>
              } @else {
                <div
                  #messagesContainer
                  class="chat-panel flex-1 space-y-3 overflow-y-auto px-4 py-4"
                  aria-live="polite"
                >
                  @if (isLoadingMessages()) {
                    <p class="text-sm text-muted-foreground">Loading messages...</p>
                  } @else if (messages().length === 0) {
                    <p class="text-sm text-muted-foreground">No messages yet. Say hello to start the chat.</p>
                  } @else {
                    @for (message of messages(); track message.id) {
                      <article
                        class="flex"
                        [class.justify-end]="isOwnMessage(message)"
                        [class.justify-start]="!isOwnMessage(message)"
                      >
                        <div
                          class="max-w-[min(85%,520px)] rounded-2xl px-3 py-2 shadow-sm"
                          [class.bubble-outgoing]="isOwnMessage(message)"
                          [class.bubble-incoming]="!isOwnMessage(message)"
                          [class.rounded-br-md]="isOwnMessage(message)"
                          [class.rounded-bl-md]="!isOwnMessage(message)"
                        >
                          @if (message.attachment) {
                            @if (isImageAttachment(message.attachment.contentType)) {
                              <a
                                [href]="message.attachment.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="block overflow-hidden rounded-xl"
                              >
                                <img
                                  [src]="message.attachment.url"
                                  [alt]="message.attachment.fileName"
                                  class="max-h-72 w-full object-cover"
                                />
                              </a>
                            } @else {
                              <a
                                [href]="message.attachment.url"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="mb-2 flex items-center gap-2 rounded-xl border border-border bg-muted/60 px-3 py-2 text-sm hover:bg-muted"
                              >
                                <span aria-hidden="true">📎</span>
                                <span class="truncate">{{ message.attachment.fileName }}</span>
                              </a>
                            }
                          }

                          @if (message.content.trim() !== '') {
                            <p class="whitespace-pre-wrap text-sm">{{ message.content }}</p>
                          }

                          <div
                            class="mt-1 flex items-center justify-end gap-1 text-[11px]"
                            [class.bubble-meta-outgoing]="isOwnMessage(message)"
                            [class.text-muted-foreground]="!isOwnMessage(message)"
                          >
                            <span>{{ formatTime(message.sentAt) }}</span>
                            @if (isOwnMessage(message)) {
                              <span aria-label="Message status">{{ statusIcon(message.status) }}</span>
                            }
                          </div>
                        </div>
                      </article>
                    }
                  }
                </div>

                @if (pendingAttachment() !== null) {
                  <div
                    class="mx-4 mb-2 flex items-center justify-between rounded-xl border border-border bg-muted/50 px-3 py-2 text-sm"
                  >
                    <span class="truncate">📎 {{ pendingAttachment()!.name }}</span>
                    <button
                      type="button"
                      class="text-muted-foreground hover:text-foreground"
                      (click)="clearPendingAttachment()"
                    >
                      Remove
                    </button>
                  </div>
                }

                <form
                  class="border-t border-border p-4"
                  [formGroup]="composerForm"
                  (ngSubmit)="sendMessage()"
                >
                  <div class="flex items-end gap-2">
                    <label
                      class="inline-flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-full border border-border text-lg text-muted-foreground hover:bg-muted/50"
                      aria-label="Attach file"
                    >
                      📎
                      <input
                        #attachmentInput
                        type="file"
                        class="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                        (change)="onAttachmentSelected($event)"
                      />
                    </label>

                    <ui-textarea
                      class="min-h-11 flex-1"
                      formControlName="body"
                      [rows]="1"
                      placeholder="Type a message"
                      (input)="onComposerInput()"
                    />

                    <ui-button
                      type="submit"
                      [disabled]="isSending() || !canSend()"
                      label="{{ isSending() ? 'Sending...' : 'Send' }}"
                    />
                  </div>
                </form>
              }
            </ui-card-content>
          </ui-card>
        </section>
      </section>

      <app-create-message-thread-dialog
        [open]="isCreateThreadDialogOpen()"
        (openChange)="isCreateThreadDialogOpen.set($event)"
        (threadCreated)="onThreadCreated($event)"
      />
    </main>
  `,
})
export class MessagesInboxComponent implements OnInit, OnDestroy {
  protected readonly hub = inject(MessagingHubService);
  private readonly messageApi = inject(MessageApiService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userSession = inject(UserSessionService);
  private readonly authContext = inject(AuthContextService);

  @ViewChild('messagesContainer') private messagesContainer?: ElementRef<HTMLElement>;
  @ViewChild('attachmentInput') private attachmentInput?: ElementRef<HTMLInputElement>;

  private hubSubscriptions: Subscription[] = [];
  private typingStopTimer: ReturnType<typeof setTimeout> | null = null;
  private typingClearTimer: ReturnType<typeof setTimeout> | null = null;

  protected readonly isLoadingThreads = signal(true);
  protected readonly isLoadingMessages = signal(false);
  protected readonly isSending = signal(false);
  protected readonly isPeerTyping = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly threads = signal<MessageThreadListItem[]>([]);
  protected readonly messages = signal<MessageHistoryItem[]>([]);
  protected readonly selectedThreadId = signal<string | null>(null);
  protected readonly pendingAttachment = signal<File | null>(null);
  protected readonly isCreateThreadDialogOpen = signal(false);

  protected readonly composerForm = this.formBuilder.nonNullable.group({
    body: [''],
  });

  protected readonly selectedThreadSubject = computed(() => {
    const threadId = this.selectedThreadId();
    if (threadId === null) {
      return 'Conversation';
    }

    return this.threads().find((thread) => thread.id === threadId)?.subject ?? 'Conversation';
  });

  async ngOnInit(): Promise<void> {
    this.registerHubListeners();

    try {
      await this.hub.connect();
      await this.loadThreads();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to connect to live messaging.'));
    }
  }

  ngOnDestroy(): void {
    for (const subscription of this.hubSubscriptions) {
      subscription.unsubscribe();
    }

    if (this.typingStopTimer !== null) {
      clearTimeout(this.typingStopTimer);
    }

    if (this.typingClearTimer !== null) {
      clearTimeout(this.typingClearTimer);
    }

    void this.hub.disconnect();
  }

  protected selectThread(threadId: string): void {
    this.selectedThreadId.set(threadId);
    this.isPeerTyping.set(false);
    void this.openThread(threadId);
  }

  protected openCreateThreadDialog(): void {
    this.isCreateThreadDialogOpen.set(true);
  }

  protected async onThreadCreated(event: {
    threadId: string;
    openingMessage: string;
  }): Promise<void> {
    this.selectedThreadId.set(event.threadId);
    await this.loadThreads();
    await this.openThread(event.threadId);

    if (event.openingMessage.trim() === '') {
      return;
    }

    this.composerForm.controls.body.setValue(event.openingMessage);
    await this.sendMessage();
  }

  protected isOwnMessage(message: MessageHistoryItem): boolean {
    const userId = this.userSession.getUser()?.id;
    return userId !== undefined && message.senderId === userId;
  }

  protected isImageAttachment(contentType: string): boolean {
    return isImageAttachment(contentType);
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

  protected formatTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected statusIcon(status: MessageStatus): string {
    switch (status) {
      case MessageStatus.Read:
        return '✓✓';
      case MessageStatus.Delivered:
        return '✓✓';
      default:
        return '✓';
    }
  }

  protected canSend(): boolean {
    const body = this.composerForm.controls.body.value.trim();
    return body !== '' || this.pendingAttachment() !== null;
  }

  protected onAttachmentSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.pendingAttachment.set(file);
  }

  protected clearPendingAttachment(): void {
    this.pendingAttachment.set(null);
    if (this.attachmentInput?.nativeElement) {
      this.attachmentInput.nativeElement.value = '';
    }
  }

  protected onComposerInput(): void {
    const threadId = this.selectedThreadId();
    if (threadId === null) {
      return;
    }

    void this.hub.broadcastTyping(threadId, true);

    if (this.typingStopTimer !== null) {
      clearTimeout(this.typingStopTimer);
    }

    this.typingStopTimer = setTimeout(() => {
      void this.hub.broadcastTyping(threadId, false);
    }, 1200);
  }

  protected async sendMessage(): Promise<void> {
    const threadId = this.selectedThreadId();
    if (threadId === null || !this.canSend()) {
      return;
    }

    this.isSending.set(true);
    this.errorMessage.set(null);

    try {
      const attachmentFile = this.pendingAttachment();
      let attachment = null;
      if (attachmentFile !== null) {
        attachment = await uploadMessageAttachment(attachmentFile, async (file) => {
          const result = await firstValueFrom(
            this.messageApi.getAttachmentUploadUrl(threadId, {
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
            }),
          );
          return { uploadUrl: result.uploadUrl, fileUrl: result.fileUrl };
        });
      }

      let content = this.composerForm.controls.body.value.trim();
      if (content === '' && attachment !== null) {
        content = attachment.fileName;
      }

      const senderRole = this.authContext.getRoles()[0] ?? 'Staff';
      await firstValueFrom(
        this.messageApi.sendMessage(threadId, {
          senderRole,
          clientMessageId: crypto.randomUUID(),
          content,
          attachment,
        }),
      );

      this.composerForm.reset({ body: '' });
      this.clearPendingAttachment();
      void this.hub.broadcastTyping(threadId, false);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to send message.'));
    } finally {
      this.isSending.set(false);
    }
  }

  private registerHubListeners(): void {
    this.hubSubscriptions.push(
      this.hub.messageReceived$.subscribe((payload) => this.onMessageReceived(payload)),
      this.hub.deliveryReceipt$.subscribe((payload) => this.onDeliveryReceipt(payload)),
      this.hub.readReceipt$.subscribe((payload) => this.onReadReceipt(payload)),
      this.hub.typing$.subscribe((payload) => this.onPeerTyping(payload)),
      this.hub.stoppedTyping$.subscribe((payload) => this.onPeerStoppedTyping(payload)),
      this.hub.threadResyncRequired$.subscribe(({ threadId }) => {
        if (this.selectedThreadId() === threadId) {
          void this.loadMessages(threadId, false);
        }
      }),
    );
  }

  private onMessageReceived(payload: RealtimeMessagePayload): void {
    const activeThreadId = this.selectedThreadId();
    if (activeThreadId !== payload.threadId) {
      void this.loadThreads();
      return;
    }

    this.messages.update((current) => {
      if (current.some((message) => message.id === payload.messageId)) {
        return current;
      }

      return [...current, mapRealtimePayloadToHistoryItem(payload)];
    });

    this.scrollMessagesToBottom();
    void this.loadThreads();

    const userId = this.userSession.getUser()?.id;
    if (userId !== undefined && payload.senderId !== userId && isClientMessage(payload.senderRole)) {
      void this.markThreadRead(activeThreadId!);
    }
  }

  private onDeliveryReceipt(payload: { threadId: string }): void {
    if (this.selectedThreadId() !== payload.threadId) {
      return;
    }

    this.messages.update((current) =>
      current.map((message) =>
        this.isOwnMessage(message) && message.status < MessageStatus.Delivered
          ? { ...message, status: MessageStatus.Delivered }
          : message,
      ),
    );
  }

  private onReadReceipt(payload: { threadId: string }): void {
    if (this.selectedThreadId() !== payload.threadId) {
      return;
    }

    this.messages.update((current) =>
      current.map((message) =>
        this.isOwnMessage(message) ? { ...message, status: MessageStatus.Read } : message,
      ),
    );
  }

  private onPeerTyping(payload: { threadId: string; userId: string }): void {
    if (this.selectedThreadId() !== payload.threadId) {
      return;
    }

    const userId = this.userSession.getUser()?.id;
    if (userId !== undefined && payload.userId === userId) {
      return;
    }

    this.isPeerTyping.set(true);
    if (this.typingClearTimer !== null) {
      clearTimeout(this.typingClearTimer);
    }

    this.typingClearTimer = setTimeout(() => this.isPeerTyping.set(false), 3000);
  }

  private onPeerStoppedTyping(payload: { threadId: string; userId: string }): void {
    if (this.selectedThreadId() !== payload.threadId) {
      return;
    }

    const userId = this.userSession.getUser()?.id;
    if (userId !== undefined && payload.userId === userId) {
      return;
    }

    this.isPeerTyping.set(false);
  }

  private async openThread(threadId: string): Promise<void> {
    await this.hub.joinThread(threadId);
    await this.loadMessages(threadId, true);
  }

  private async loadThreads(): Promise<void> {
    this.isLoadingThreads.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.messageApi.getThreads());
      this.threads.set(result.items);

      const selectedId = this.selectedThreadId();
      if (selectedId === null && result.items.length > 0) {
        this.selectThread(result.items[0].id);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load conversations.'));
    } finally {
      this.isLoadingThreads.set(false);
    }
  }

  private async loadMessages(threadId: string, markRead: boolean): Promise<void> {
    this.isLoadingMessages.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.messageApi.getThreadMessages(threadId));
      this.messages.set(result.items);
      this.scrollMessagesToBottom();

      if (markRead) {
        await this.markThreadRead(threadId);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load messages.'));
      this.messages.set([]);
    } finally {
      this.isLoadingMessages.set(false);
    }
  }

  private async markThreadRead(threadId: string): Promise<void> {
    try {
      await firstValueFrom(this.messageApi.markThreadRead(threadId));
      await this.loadThreads();
    } catch {
      // Non-blocking: read receipts will still propagate through the hub when available.
    }
  }

  private scrollMessagesToBottom(): void {
    queueMicrotask(() => {
      const element = this.messagesContainer?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }
}
