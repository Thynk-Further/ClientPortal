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

import {
  ClientApiService,
  ClientSummary,
} from '@/app/core/api/services/client-api.service';
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

interface ClientChatEntry {
  clientId: string;
  threadId: string;
  displayName: string;
  initials: string;
  lastMessageAt: string;
  unreadCount: number;
  preview: string;
}

interface ThreadPreview {
  text: string;
  sentAt: string;
}

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

      .composer-bar {
        border-top: 1px solid rgb(228 228 231);
        background: linear-gradient(to top, rgb(250 250 250), rgb(250 250 250 / 0.85));
      }

      :host-context(.dark) .composer-bar {
        border-top-color: rgb(63 63 70);
        background: linear-gradient(to top, rgb(24 24 27), rgb(24 24 27 / 0.9));
      }

      .composer-shell {
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.04);
      }

      :host-context(.dark) .composer-shell {
        box-shadow: 0 1px 2px rgb(0 0 0 / 0.2);
      }

      .composer-send {
        background: rgb(5 150 105);
        color: white;
      }

      .composer-send:hover:not(:disabled) {
        background: rgb(4 120 87);
      }

      .composer-send:disabled {
        background: rgb(161 161 170);
        color: rgb(244 244 245);
      }

      :host-context(.dark) .composer-send:disabled {
        background: rgb(63 63 70);
        color: rgb(161 161 170);
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
              Chat with clients in real time. Select a client to open their conversation.
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
          <ui-card
            class="flex flex-col"
            [class.hidden]="isMobileView() && selectedClientId() !== null"
          >
            <ui-card-header>
              <ui-card-title>Clients</ui-card-title>
              <ui-card-description>Select a client to view and reply to messages.</ui-card-description>
            </ui-card-header>
            <ui-card-content class="flex min-h-0 flex-1 flex-col">
              <div class="relative mb-4">
                <svg
                  class="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="m21 21-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
                  />
                </svg>
                <input
                  type="search"
                  class="h-9 w-full rounded-lg border border-border/80 bg-background py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-neutral-400"
                  placeholder="Search clients..."
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                />
              </div>

              @if (isLoadingThreads()) {
                <p class="text-sm text-muted-foreground">Loading clients...</p>
              } @else if (filteredClientChats().length === 0) {
                <div class="space-y-3 py-4 text-center">
                  <p class="text-sm text-muted-foreground">
                    @if (searchQuery().trim() !== '') {
                      No clients match your search.
                    } @else {
                      No client conversations yet.
                    }
                  </p>
                  @if (searchQuery().trim() === '') {
                    <ui-button
                      type="button"
                      variant="outline"
                      label="Start a conversation"
                      (clicked)="openCreateThreadDialog()"
                    />
                  }
                </div>
              } @else {
                <div class="max-h-[560px] space-y-2 overflow-y-auto">
                  @for (chat of filteredClientChats(); track chat.clientId) {
                    <button
                      type="button"
                      class="w-full rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50"
                      [class.border-emerald-500/60]="selectedClientId() === chat.clientId"
                      [class.bg-muted/40]="selectedClientId() === chat.clientId"
                      (click)="selectClient(chat.clientId)"
                    >
                      <div class="flex items-center gap-3">
                        <div
                          class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
                        >
                          {{ chat.initials }}
                        </div>
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <p class="truncate text-sm font-medium text-foreground">{{ chat.displayName }}</p>
                            <span class="shrink-0 text-xs text-muted-foreground">
                              {{ formatListTime(chat.lastMessageAt) }}
                            </span>
                          </div>
                          <div class="mt-1 flex items-center justify-between gap-2">
                            <p class="truncate text-xs text-muted-foreground">{{ chat.preview }}</p>
                            @if (chat.unreadCount > 0) {
                              <span
                                class="shrink-0 rounded-full bg-emerald-500 px-2 py-0.5 text-xs font-semibold text-white"
                              >
                                {{ chat.unreadCount > 99 ? '99+' : chat.unreadCount }}
                              </span>
                            }
                          </div>
                        </div>
                      </div>
                    </button>
                  }
                </div>
              }
            </ui-card-content>
          </ui-card>

          <ui-card
            class="flex min-h-[640px] flex-col"
            [class.hidden]="isMobileView() && selectedClientId() === null"
          >
            <ui-card-header class="border-b border-border">
              @if (selectedClient() === null) {
                <ui-card-title>Conversation</ui-card-title>
                <ui-card-description>Choose a client from the list to start chatting.</ui-card-description>
              } @else {
                <div class="flex items-center gap-3">
                  @if (isMobileView()) {
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                      aria-label="Back to clients"
                      (click)="closeMobileChat()"
                    >
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  }
                  <div
                    class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
                  >
                    {{ selectedClient()!.initials }}
                  </div>
                  <div class="min-w-0">
                    <ui-card-title class="truncate">{{ selectedClient()!.displayName }}</ui-card-title>
                    <ui-card-description>
                      @if (isPeerTyping()) {
                        Client is typing...
                      } @else if (hub.connectionState() === 'connected') {
                        Live chat connected
                      } @else {
                        Connecting to live chat...
                      }
                    </ui-card-description>
                  </div>
                </div>
              }
            </ui-card-header>

            <ui-card-content class="flex min-h-0 flex-1 flex-col p-0">
              @if (selectedClient() === null) {
                <div class="flex flex-1 items-center justify-center p-6">
                  <p class="text-sm text-muted-foreground">Select a client from the list.</p>
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
                    <p class="text-sm text-muted-foreground">
                      No messages yet. Say hello to {{ selectedClient()!.displayName }}.
                    </p>
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
                  class="composer-bar px-3 py-3 sm:px-4"
                  [formGroup]="composerForm"
                  (ngSubmit)="sendMessage()"
                >
                  <div
                    class="composer-shell flex items-end gap-2 rounded-2xl border border-border/80 bg-background p-1.5 sm:gap-3 sm:p-2"
                  >
                    <label
                      class="inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      aria-label="Attach file"
                    >
                      <svg
                        class="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="1.75"
                        aria-hidden="true"
                      >
                        <path
                          d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"
                          stroke-linecap="round"
                          stroke-linejoin="round"
                        />
                      </svg>
                      <input
                        #attachmentInput
                        type="file"
                        class="hidden"
                        accept="image/jpeg,image/png,image/webp,application/pdf,text/plain"
                        (change)="onAttachmentSelected($event)"
                      />
                    </label>

                    <ui-textarea
                      class="composer-input max-h-32 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:border-transparent focus-visible:ring-0"
                      formControlName="body"
                      [rows]="1"
                      placeholder="Type a message"
                      (input)="onComposerInput()"
                      (keydown)="onComposerKeydown($event)"
                    />

                    <button
                      type="submit"
                      class="composer-send inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-colors disabled:cursor-not-allowed"
                      [disabled]="isSending() || !canSend()"
                      [attr.aria-label]="isSending() ? 'Sending message' : 'Send message'"
                    >
                      @if (isSending()) {
                        <svg
                          class="h-5 w-5 animate-spin"
                          viewBox="0 0 24 24"
                          fill="none"
                          aria-hidden="true"
                        >
                          <circle
                            class="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            stroke-width="3"
                          />
                          <path
                            class="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 0 1 14.93-4"
                          />
                        </svg>
                      } @else {
                        <svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z" />
                        </svg>
                      }
                    </button>
                  </div>
                  <p class="mt-2 hidden text-center text-[11px] text-muted-foreground sm:block">
                    Press Enter to send · Shift+Enter for a new line
                  </p>
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
  private readonly clientApi = inject(ClientApiService);
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
  protected readonly clientsById = signal<Record<string, ClientSummary>>({});
  protected readonly threadPreviews = signal<Record<string, ThreadPreview>>({});
  protected readonly messages = signal<MessageHistoryItem[]>([]);
  protected readonly selectedClientId = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly pendingAttachment = signal<File | null>(null);
  protected readonly isCreateThreadDialogOpen = signal(false);
  protected readonly isMobileView = signal(false);

  protected readonly composerForm = this.formBuilder.nonNullable.group({
    body: [''],
  });

  protected readonly clientChats = computed((): ClientChatEntry[] => {
    const clients = this.clientsById();
    const previews = this.threadPreviews();
    const grouped = new Map<string, MessageThreadListItem>();

    for (const thread of this.threads()) {
      const existing = grouped.get(thread.clientId);
      if (
        existing === undefined ||
        new Date(thread.lastMessageAt).getTime() > new Date(existing.lastMessageAt).getTime()
      ) {
        grouped.set(thread.clientId, thread);
      }
    }

    return [...grouped.entries()]
      .map(([clientId, thread]) => {
        const client = clients[clientId];
        const displayName = this.resolveClientDisplayName(client, clientId);
        const preview = previews[thread.id]?.text ?? 'Tap to open chat';

        const unreadCount = this.threads()
          .filter((item) => item.clientId === clientId)
          .reduce((total, item) => total + item.unreadCount, 0);

        return {
          clientId,
          threadId: thread.id,
          displayName,
          initials: this.getInitials(displayName),
          lastMessageAt: previews[thread.id]?.sentAt ?? thread.lastMessageAt,
          unreadCount,
          preview,
        };
      })
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
      );
  });

  protected readonly filteredClientChats = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (query === '') {
      return this.clientChats();
    }

    return this.clientChats().filter((chat) => chat.displayName.toLowerCase().includes(query));
  });

  protected readonly selectedClient = computed(() => {
    const clientId = this.selectedClientId();
    if (clientId === null) {
      return null;
    }

    return this.clientChats().find((chat) => chat.clientId === clientId) ?? null;
  });

  protected readonly selectedThreadId = computed(() => this.selectedClient()?.threadId ?? null);

  async ngOnInit(): Promise<void> {
    this.registerHubListeners();
    this.syncMobileView();
    window.addEventListener('resize', this.syncMobileView);

    try {
      await this.hub.connect();
      await this.loadThreads();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to connect to live messaging.'));
    }
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.syncMobileView);
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

  protected onSearchInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }

  protected selectClient(clientId: string): void {
    this.selectedClientId.set(clientId);
    this.isPeerTyping.set(false);

    const threadId = this.clientChats().find((chat) => chat.clientId === clientId)?.threadId;
    if (threadId !== undefined) {
      void this.openThread(threadId);
    }
  }

  protected closeMobileChat(): void {
    this.selectedClientId.set(null);
  }

  protected openCreateThreadDialog(): void {
    this.isCreateThreadDialogOpen.set(true);
  }

  protected async onThreadCreated(event: {
    threadId: string;
    openingMessage: string;
  }): Promise<void> {
    await this.loadThreads();

    const thread = this.threads().find((item) => item.id === event.threadId);
    if (thread !== undefined) {
      this.selectClient(thread.clientId);
    }

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

  protected formatListTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday);
    startOfYesterday.setDate(startOfYesterday.getDate() - 1);

    if (date >= startOfToday) {
      return new Intl.DateTimeFormat(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      }).format(date);
    }

    if (date >= startOfYesterday) {
      return 'Yesterday';
    }

    const daysAgo = (startOfToday.getTime() - date.getTime()) / (1000 * 60 * 60 * 24);
    if (daysAgo < 7) {
      return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
    }

    return new Intl.DateTimeFormat(undefined, {
      month: 'short',
      day: 'numeric',
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

  protected onComposerKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' || event.shiftKey) {
      return;
    }

    event.preventDefault();
    void this.sendMessage();
  }

  protected async sendMessage(): Promise<void> {
    const threadId = this.selectedThreadId();
    if (threadId === null || !this.canSend() || this.isSending()) {
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
      await this.loadMessages(threadId, false);
      void this.loadThreads();
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
    this.setThreadPreview(payload.threadId, payload);

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
      const [threadsResult, clientsResult] = await Promise.all([
        firstValueFrom(this.messageApi.getThreads(1, 100)),
        firstValueFrom(this.clientApi.getClients({ page: 1, pageSize: 200 })),
      ]);

      this.threads.set(threadsResult.items);

      const clientMap: Record<string, ClientSummary> = {};
      for (const client of clientsResult.items) {
        clientMap[client.id] = client;
      }
      this.clientsById.set(clientMap);

      void this.fetchThreadPreviews(threadsResult.items);

      const selectedId = this.selectedClientId();
      if (selectedId === null && this.clientChats().length > 0) {
        this.selectClient(this.clientChats()[0].clientId);
      } else if (selectedId !== null) {
        const stillExists = this.clientChats().some((chat) => chat.clientId === selectedId);
        if (!stillExists && this.clientChats().length > 0) {
          this.selectClient(this.clientChats()[0].clientId);
        }
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load conversations.'));
    } finally {
      this.isLoadingThreads.set(false);
    }
  }

  private async fetchThreadPreviews(threads: MessageThreadListItem[]): Promise<void> {
    const existing = this.threadPreviews();
    const missing = threads.filter((thread) => existing[thread.id] === undefined);

    await Promise.all(
      missing.map(async (thread) => {
        try {
          const result = await firstValueFrom(
            this.messageApi.getThreadMessages(thread.id, 1, 50),
          );
          const lastMessage = result.items[result.items.length - 1];
          if (lastMessage !== undefined) {
            this.setThreadPreview(thread.id, lastMessage);
          }
        } catch {
          // Preview is optional; list still works without it.
        }
      }),
    );
  }

  private async loadMessages(threadId: string, markRead: boolean): Promise<void> {
    this.isLoadingMessages.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.messageApi.getThreadMessages(threadId));
      this.messages.set(result.items);
      this.scrollMessagesToBottom();

      const lastMessage = result.items[result.items.length - 1];
      if (lastMessage !== undefined) {
        this.setThreadPreview(threadId, lastMessage);
      }

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
      // Non-blocking.
    }
  }

  private setThreadPreview(
    threadId: string,
    message: MessageHistoryItem | RealtimeMessagePayload,
  ): void {
    const preview: ThreadPreview = {
      text: this.buildPreviewText(message),
      sentAt: message.sentAt,
    };

    this.threadPreviews.update((current) => ({
      ...current,
      [threadId]: preview,
    }));
  }

  private buildPreviewText(message: MessageHistoryItem | RealtimeMessagePayload): string {
    if (message.attachment !== null) {
      if (isImageAttachment(message.attachment.contentType)) {
        return '📷 Photo';
      }

      return `📎 ${message.attachment.fileName}`;
    }

    const content = message.content.trim();
    if (content === '') {
      return 'Message';
    }

    return content.length > 48 ? `${content.slice(0, 48)}…` : content;
  }

  private resolveClientDisplayName(client: ClientSummary | undefined, clientId: string): string {
    if (client === undefined) {
      return `Client ${clientId.slice(0, 8)}`;
    }

    if (client.companyName.trim() !== '') {
      return client.companyName.trim();
    }

    if (client.contactName.trim() !== '') {
      return client.contactName.trim();
    }

    return client.email;
  }

  private getInitials(displayName: string): string {
    return this.userSession.getInitials(displayName);
  }

  private scrollMessagesToBottom(): void {
    queueMicrotask(() => {
      const element = this.messagesContainer?.nativeElement;
      if (element) {
        element.scrollTop = element.scrollHeight;
      }
    });
  }

  private readonly syncMobileView = (): void => {
    this.isMobileView.set(window.matchMedia('(max-width: 767px)').matches);
  };
}
