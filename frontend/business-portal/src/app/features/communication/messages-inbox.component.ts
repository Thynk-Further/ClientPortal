import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { interval } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

interface MessageThread {
  readonly id: string;
  readonly subject: string;
  readonly participant: string;
  readonly lastUpdatedLabel: string;
  readonly unreadCount: number;
}

interface ThreadMessage {
  readonly id: string;
  readonly threadId: string;
  readonly sender: 'You' | 'Client';
  readonly body: string;
  readonly sentAtLabel: string;
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
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Messages Inbox</h1>
          <p class="text-sm text-muted-foreground">
            Review conversation threads and respond with a near real-time collaboration experience.
          </p>
        </header>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[360px_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Threads</ui-card-title>
              <ui-card-description>
                Select a thread to open the conversation history.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-2">
                @for (thread of threads(); track thread.id) {
                  <button
                    type="button"
                    class="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/40"
                    [class.border-primary]="selectedThreadId() === thread.id"
                    (click)="selectThread(thread.id)"
                  >
                    <div class="flex items-center justify-between gap-2">
                      <p class="text-sm font-medium">{{ thread.subject }}</p>
                      @if (thread.unreadCount > 0) {
                        <span class="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                          {{ thread.unreadCount }}
                        </span>
                      }
                    </div>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ thread.participant }} - {{ thread.lastUpdatedLabel }}
                    </p>
                  </button>
                }
              </div>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>{{ selectedThreadSubject() }}</ui-card-title>
              <ui-card-description>
                Live thread activity updates every few seconds to simulate real-time messaging.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="max-h-[420px] space-y-2 overflow-y-auto rounded-lg border bg-muted/20 p-3">
                @for (message of selectedThreadMessages(); track message.id) {
                  <article
                    class="max-w-[85%] rounded-lg border bg-card px-3 py-2 text-sm"
                    [class.ml-auto]="message.sender === 'You'"
                  >
                    <p class="text-xs text-muted-foreground">
                      {{ message.sender }} - {{ message.sentAtLabel }}
                    </p>
                    <p class="mt-1">{{ message.body }}</p>
                  </article>
                }
              </div>

              <form
                class="mt-4 space-y-3"
                [formGroup]="composerForm"
                (ngSubmit)="onSendMessage()"
              >
                <ui-textarea
                  formControlName="body"
                  [rows]="3"
                  placeholder="Type a reply..."
                />
                <div class="flex justify-end">
                  <ui-button label="Send Message" type="submit" />
                </div>
              </form>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class MessagesInboxComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly composerForm = this.formBuilder.nonNullable.group({
    body: ['', [Validators.required]],
  });

  protected readonly threads = signal<ReadonlyArray<MessageThread>>([
    {
      id: 'thread-001',
      subject: 'Invoice Clarification',
      participant: 'Contoso Architects',
      lastUpdatedLabel: '2 min ago',
      unreadCount: 1,
    },
    {
      id: 'thread-002',
      subject: 'Contract Signature Timing',
      participant: 'Northwind Retail',
      lastUpdatedLabel: '10 min ago',
      unreadCount: 0,
    },
    {
      id: 'thread-003',
      subject: 'Project Kickoff Notes',
      participant: 'Fabrikam Manufacturing',
      lastUpdatedLabel: '24 min ago',
      unreadCount: 0,
    },
  ]);

  private readonly messages = signal<Record<string, ReadonlyArray<ThreadMessage>>>({
    'thread-001': [
      {
        id: 'm-001',
        threadId: 'thread-001',
        sender: 'Client',
        body: 'Could you confirm if support hours are included in INV-2026-042?',
        sentAtLabel: '11:02',
      },
      {
        id: 'm-002',
        threadId: 'thread-001',
        sender: 'You',
        body: 'Yes, support coverage is included as a separate line item.',
        sentAtLabel: '11:05',
      },
    ],
    'thread-002': [
      {
        id: 'm-101',
        threadId: 'thread-002',
        sender: 'Client',
        body: 'We are ready to sign the agreement tomorrow morning.',
        sentAtLabel: '10:51',
      },
    ],
    'thread-003': [
      {
        id: 'm-201',
        threadId: 'thread-003',
        sender: 'You',
        body: 'Thanks for sharing kickoff notes. Team assignments are confirmed.',
        sentAtLabel: '10:37',
      },
    ],
  });

  protected readonly selectedThreadId = signal<string>('thread-001');

  protected readonly selectedThreadMessages = computed(
    () => this.messages()[this.selectedThreadId()] ?? [],
  );

  protected readonly selectedThreadSubject = computed(
    () =>
      this.threads().find((thread) => thread.id === this.selectedThreadId())?.subject ??
      'Conversation',
  );

  constructor() {
    interval(15000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.simulateIncomingMessage());
  }

  protected selectThread(threadId: string): void {
    this.selectedThreadId.set(threadId);
    this.threads.update((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              unreadCount: 0,
            }
          : thread,
      ),
    );
  }

  protected onSendMessage(): void {
    if (this.composerForm.invalid) {
      this.composerForm.markAllAsTouched();
      return;
    }

    const body = this.composerForm.controls.body.value.trim();
    if (body === '') {
      return;
    }

    const threadId = this.selectedThreadId();
    const outgoingMessage: ThreadMessage = {
      id: `m-${Date.now()}`,
      threadId,
      sender: 'You',
      body,
      sentAtLabel: this.currentTimeLabel(),
    };

    this.messages.update((current) => ({
      ...current,
      [threadId]: [...(current[threadId] ?? []), outgoingMessage],
    }));

    this.threads.update((current) =>
      current.map((thread) =>
        thread.id === threadId
          ? {
              ...thread,
              lastUpdatedLabel: 'Just now',
            }
          : thread,
      ),
    );

    this.composerForm.reset({ body: '' });
  }

  private simulateIncomingMessage(): void {
    const activeThreadId = this.selectedThreadId();
    const incomingMessage: ThreadMessage = {
      id: `m-auto-${Date.now()}`,
      threadId: activeThreadId,
      sender: 'Client',
      body: 'Automatic update: we reviewed the latest message and will revert shortly.',
      sentAtLabel: this.currentTimeLabel(),
    };

    this.messages.update((current) => ({
      ...current,
      [activeThreadId]: [...(current[activeThreadId] ?? []), incomingMessage],
    }));

    this.threads.update((current) =>
      current.map((thread) =>
        thread.id === activeThreadId
          ? {
              ...thread,
              lastUpdatedLabel: 'Just now',
              unreadCount: 0,
            }
          : thread,
      ),
    );

    this.toast.info('New message received.');
  }

  private currentTimeLabel(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }
}
