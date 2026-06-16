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
  ClientPortalApiService,
  ClientPortalMessage,
  ClientPortalMessageThread,
} from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { TenantBrandingService } from '@/app/core/branding/tenant-branding.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { uploadMessageAttachment } from '@/app/core/messaging/message-attachment.util';
import { MessagingHubService } from '@/app/core/messaging/messaging-hub.service';
import {
  MessageStatus,
  RealtimeMessagePayload,
  isClientMessage,
  isImageAttachment,
  mapRealtimePayloadToClientMessage,
} from '@/app/core/messaging/messaging.models';
import { ClientPortalMessagesSummaryService } from '@/app/core/messaging/client-portal-messages-summary.service';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

interface BusinessChatEntry {
  threadId: string;
  businessName: string;
  initials: string;
  subtitle: string;
  lastMessageAt: string;
  unreadCount: number;
}

interface ThreadPreview {
  text: string;
  sentAt: string;
}

@Component({
  selector: 'app-client-messages-inbox',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    TextareaComponent,
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
    <main class="space-y-6 px-5 pb-10 sm:px-8">
        <header class="pb-1">
          <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Messages</h1>
          <p class="text-sm text-muted-foreground">
            Chat with {{ businessDisplayName() }} in real time, including photos and documents.
          </p>
        </header>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <ui-card
            class="flex flex-col"
            [class.hidden]="isMobileView() && selectedThreadId() !== null"
          >
            <ui-card-header>
              <ui-card-title>Your team</ui-card-title>
              <ui-card-description>Select a conversation to read and reply.</ui-card-description>
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
                  placeholder="Search conversations..."
                  [value]="searchQuery()"
                  (input)="onSearchInput($event)"
                />
              </div>

              @if (isLoadingThreads()) {
                <p class="text-sm text-muted-foreground">Loading conversations...</p>
              } @else if (filteredBusinessChats().length === 0) {
                <p class="py-4 text-center text-sm text-muted-foreground">
                  @if (searchQuery().trim() !== '') {
                    No conversations match your search.
                  } @else {
                    No conversations yet. Your team will reach out here when they start a chat.
                  }
                </p>
              } @else {
                <div class="max-h-[560px] space-y-2 overflow-y-auto">
                  @for (chat of filteredBusinessChats(); track chat.threadId) {
                    <button
                      type="button"
                      class="w-full rounded-xl border border-border p-3 text-left transition-colors hover:bg-muted/50"
                      [class.border-emerald-500/60]="selectedThreadId() === chat.threadId"
                      [class.bg-muted/40]="selectedThreadId() === chat.threadId"
                      (click)="selectThread(chat.threadId)"
                    >
                      <div class="flex items-center gap-3">
                        @if (businessLogoUrl() !== null) {
                          <img
                            [src]="businessLogoUrl()!"
                            [alt]="chat.businessName + ' logo'"
                            class="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                          />
                        } @else {
                          <div
                            class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
                          >
                            {{ chat.initials }}
                          </div>
                        }
                        <div class="min-w-0 flex-1">
                          <div class="flex items-center justify-between gap-2">
                            <p class="truncate text-sm font-medium text-foreground">
                              {{ chat.businessName }}
                            </p>
                            <span class="shrink-0 text-xs text-muted-foreground">
                              {{ formatListTime(chat.lastMessageAt) }}
                            </span>
                          </div>
                          <div class="mt-1 flex items-center justify-between gap-2">
                            <p class="truncate text-xs text-muted-foreground">{{ chat.subtitle }}</p>
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
            [class.hidden]="isMobileView() && selectedThreadId() === null"
          >
            <ui-card-header class="border-b border-border">
              @if (selectedThreadId() === null) {
                <ui-card-title>Conversation</ui-card-title>
                <ui-card-description>Choose a conversation from the list to start chatting.</ui-card-description>
              } @else {
                <div class="flex items-center gap-3">
                  @if (isMobileView()) {
                    <button
                      type="button"
                      class="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted/60 hover:text-foreground"
                      aria-label="Back to conversations"
                      (click)="closeMobileChat()"
                    >
                      <svg class="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M15 18l-6-6 6-6" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </button>
                  }
                  @if (businessLogoUrl() !== null) {
                    <img
                      [src]="businessLogoUrl()!"
                      [alt]="businessDisplayName() + ' logo'"
                      class="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
                    />
                  } @else {
                    <div
                      class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground"
                    >
                      {{ businessInitials() }}
                    </div>
                  }
                  <div class="min-w-0">
                    <ui-card-title class="truncate">{{ businessDisplayName() }}</ui-card-title>
                    <ui-card-description>
                      @if (isPeerTyping()) {
                        Team is typing...
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
                    <p class="text-sm text-muted-foreground">
                      No messages yet. Say hello to {{ businessDisplayName() }}.
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
                            <span>{{ messageLabel(message) }} · {{ formatTime(message.sentAt) }}</span>
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
                      formControlName="content"
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
    </main>
  `,
})
export class ClientMessagesInboxComponent implements OnInit, OnDestroy {
  protected readonly hub = inject(MessagingHubService);
  private readonly clientPortalApi = inject(ClientPortalApiService);
  private readonly messagesSummary = inject(ClientPortalMessagesSummaryService);
  private readonly brandingService = inject(TenantBrandingService);
  private readonly formBuilder = inject(FormBuilder);
  private readonly userSession = inject(UserSessionService);

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
  protected readonly threads = signal<ClientPortalMessageThread[]>([]);
  protected readonly threadPreviews = signal<Record<string, ThreadPreview>>({});
  protected readonly messages = signal<ClientPortalMessage[]>([]);
  protected readonly selectedThreadId = signal<string | null>(null);
  protected readonly searchQuery = signal('');
  protected readonly pendingAttachment = signal<File | null>(null);
  protected readonly isMobileView = signal(false);

  protected readonly composerForm = this.formBuilder.nonNullable.group({
    content: [''],
  });

  protected readonly businessDisplayName = computed(
    () => this.brandingService.branding()?.tenantName ?? 'Your team',
  );

  protected readonly businessLogoUrl = computed(() => this.brandingService.branding()?.logoUrl ?? null);

  protected readonly businessInitials = computed(() =>
    this.userSession.getInitials(this.businessDisplayName()),
  );

  protected readonly businessChats = computed((): BusinessChatEntry[] => {
    const businessName = this.businessDisplayName();
    const initials = this.businessInitials();
    const previews = this.threadPreviews();
    const hasMultipleThreads = this.threads().length > 1;

    return [...this.threads()]
      .sort(
        (left, right) =>
          new Date(right.lastMessageAt).getTime() - new Date(left.lastMessageAt).getTime(),
      )
      .map((thread) => {
        const previewText = previews[thread.id]?.text;
        let subtitle = previewText ?? thread.subject;
        if (hasMultipleThreads && previewText !== undefined && thread.subject.trim() !== '') {
          subtitle = `${thread.subject} · ${previewText}`;
        } else if (hasMultipleThreads && previewText === undefined) {
          subtitle = thread.subject;
        } else if (previewText === undefined) {
          subtitle = 'Tap to open chat';
        }

        return {
          threadId: thread.id,
          businessName,
          initials,
          subtitle,
          lastMessageAt: previews[thread.id]?.sentAt ?? thread.lastMessageAt,
          unreadCount: thread.unreadCount,
        };
      });
  });

  protected readonly filteredBusinessChats = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    if (query === '') {
      return this.businessChats();
    }

    return this.businessChats().filter(
      (chat) =>
        chat.businessName.toLowerCase().includes(query) ||
        chat.subtitle.toLowerCase().includes(query),
    );
  });

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

  protected selectThread(threadId: string): void {
    this.selectedThreadId.set(threadId);
    this.isPeerTyping.set(false);
    void this.openThread(threadId);
  }

  protected closeMobileChat(): void {
    this.selectedThreadId.set(null);
  }

  protected isOwnMessage(message: ClientPortalMessage): boolean {
    const userId = this.userSession.getUser()?.id;
    return userId !== undefined && message.senderId === userId;
  }

  protected messageLabel(message: ClientPortalMessage): string {
    return this.isOwnMessage(message) ? 'You' : this.businessDisplayName();
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

  protected statusIcon(status: number): string {
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
    const content = this.composerForm.controls.content.value.trim();
    return content !== '' || this.pendingAttachment() !== null;
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
            this.clientPortalApi.getMessageAttachmentUploadUrl(threadId, {
              fileName: file.name,
              contentType: file.type || 'application/octet-stream',
              sizeBytes: file.size,
            }),
          );
          return { uploadUrl: result.uploadUrl, fileUrl: result.fileUrl };
        });
      }

      let content = this.composerForm.controls.content.value.trim();
      if (content === '' && attachment !== null) {
        content = attachment.fileName;
      }

      await firstValueFrom(
        this.clientPortalApi.sendMessage(threadId, {
          clientMessageId: crypto.randomUUID(),
          content,
          attachment,
        }),
      );

      this.composerForm.reset({ content: '' });
      this.clearPendingAttachment();
      void this.hub.broadcastTyping(threadId, false);
      await this.loadMessages(threadId, false);
      void this.loadThreads();
      void this.messagesSummary.refresh();
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
      void this.messagesSummary.refresh();
      return;
    }

    this.messages.update((current) => {
      if (current.some((message) => message.id === payload.messageId)) {
        return current;
      }

      return [...current, mapRealtimePayloadToClientMessage(payload)];
    });

    this.scrollMessagesToBottom();
    void this.loadThreads();
    void this.messagesSummary.refresh();

    const userId = this.userSession.getUser()?.id;
    if (userId !== undefined && payload.senderId !== userId && !isClientMessage(payload.senderRole)) {
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
      const result = await firstValueFrom(this.clientPortalApi.getMessageThreads(1, 100));
      this.threads.set(result.threads);
      void this.fetchThreadPreviews(result.threads);

      const selectedId = this.selectedThreadId();
      if (selectedId === null && result.threads.length > 0) {
        this.selectThread(result.threads[0].id);
      } else if (
        selectedId !== null &&
        !result.threads.some((thread) => thread.id === selectedId) &&
        result.threads.length > 0
      ) {
        this.selectThread(result.threads[0].id);
      }
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load message threads.'));
    } finally {
      this.isLoadingThreads.set(false);
    }
  }

  private async fetchThreadPreviews(threads: ClientPortalMessageThread[]): Promise<void> {
    const existing = this.threadPreviews();
    const missing = threads.filter((thread) => existing[thread.id] === undefined);

    await Promise.all(
      missing.map(async (thread) => {
        try {
          const result = await firstValueFrom(
            this.clientPortalApi.getThreadMessages(thread.id, 1, 50),
          );
          const lastMessage = result.messages[result.messages.length - 1];
          if (lastMessage !== undefined) {
            this.setThreadPreview(thread.id, lastMessage);
          }
        } catch {
          // Preview is optional.
        }
      }),
    );
  }

  private async loadMessages(threadId: string, markRead: boolean): Promise<void> {
    this.isLoadingMessages.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getThreadMessages(threadId));
      this.messages.set(result.messages);
      this.scrollMessagesToBottom();

      const lastMessage = result.messages[result.messages.length - 1];
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
      await firstValueFrom(this.clientPortalApi.markThreadRead(threadId));
      await this.loadThreads();
      await this.messagesSummary.refresh();
    } catch {
      // Non-blocking.
    }
  }

  private setThreadPreview(
    threadId: string,
    message: ClientPortalMessage | RealtimeMessagePayload,
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

  private buildPreviewText(message: ClientPortalMessage | RealtimeMessagePayload): string {
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
