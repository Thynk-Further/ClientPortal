import {
  ChangeDetectionStrategy,
  Component,
  OnDestroy,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalMeetingCard,
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

const JOIN_WINDOW_MINUTES = 15;
const SCHEDULED_STATUS = 1;
const PENDING_STATUS = 4;

const MEETING_STATUS_LABELS: Record<number, string> = {
  1: 'Scheduled',
  2: 'Completed',
  3: 'Cancelled',
  4: 'Pending your response',
  5: 'Declined',
};

@Component({
  selector: 'app-client-meetings',
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
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Meetings</h1>
        <p class="text-sm text-muted-foreground">
          Review meeting requests, accept invitations, and join sessions when they open.
        </p>
      </header>

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading meetings...</p>
      } @else {
        @if (pendingMeetings().length > 0) {
          <section class="space-y-3" aria-label="Pending meeting requests">
            <h2 class="text-base font-semibold">Awaiting your response</h2>
            @for (meeting of pendingMeetings(); track meeting.id) {
              <ui-card class="border-amber-500/30 bg-amber-500/5">
                <ui-card-content class="space-y-4 p-5">
                  <div class="space-y-1">
                    <p class="text-sm font-medium">{{ meeting.title }}</p>
                    <p class="text-xs text-muted-foreground">
                      {{ formatDateTime(meeting.scheduledAt) }} · {{ meeting.durationMinutes }} min
                    </p>
                    @if (meeting.description.trim() !== '') {
                      <p class="text-sm text-muted-foreground">{{ meeting.description }}</p>
                    }
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <ui-button
                      label="Accept"
                      [disabled]="respondingMeetingId() === meeting.id"
                      (clicked)="acceptMeeting(meeting.id)"
                    />
                    <ui-button
                      label="Decline"
                      variant="outline"
                      [disabled]="respondingMeetingId() === meeting.id"
                      (clicked)="declineMeeting(meeting.id)"
                    />
                  </div>
                </ui-card-content>
              </ui-card>
            }
          </section>
        }

        @if (scheduledMeetings().length === 0 && pendingMeetings().length === 0) {
          <ui-card class="border-dashed">
            <ui-card-header>
              <ui-card-title>No upcoming meetings</ui-card-title>
              <ui-card-description>
                When your business team schedules a meeting with you, it will appear here.
              </ui-card-description>
            </ui-card-header>
          </ui-card>
        } @else if (scheduledMeetings().length > 0) {
          @if (nextMeeting(); as featured) {
            <ui-card class="border-primary/30 bg-primary/5">
              <ui-card-header>
                <ui-card-title>Next meeting</ui-card-title>
                <ui-card-description>{{ formatDateTime(featured.scheduledAt) }}</ui-card-description>
              </ui-card-header>
              <ui-card-content class="space-y-4">
                <div>
                  <p class="text-lg font-semibold">{{ featured.title }}</p>
                  @if (featured.description.trim() !== '') {
                    <p class="mt-1 text-sm text-muted-foreground">{{ featured.description }}</p>
                  }
                  <p class="mt-2 text-xs text-muted-foreground">
                    {{ featured.durationMinutes }} min · {{ meetingStatusLabel(featured.status) }}
                  </p>
                </div>

                <div class="rounded-xl border bg-card px-4 py-5 text-center">
                  <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    {{ countdownHeading(featured) }}
                  </p>
                  <p class="mt-2 font-mono text-3xl font-semibold tracking-tight text-foreground">
                    {{ countdownText(featured) }}
                  </p>
                </div>

                @if (hasJoinUrl(featured)) {
                  @if (canJoin(featured)) {
                    <a
                      [href]="featured.meetingUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="inline-flex h-10 w-full items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                    >
                      Join meeting
                    </a>
                  } @else {
                    <ui-button class="w-full" [disabled]="true" label="Join meeting" />
                    <p class="text-center text-xs text-muted-foreground">
                      Join link opens {{ joinWindowMinutes }} minutes before the meeting starts.
                    </p>
                  }
                }
              </ui-card-content>
            </ui-card>
          }

          @if (remainingMeetings().length > 0) {
            <section class="space-y-3" aria-label="Other upcoming meetings">
              <h2 class="text-base font-semibold">Later this month</h2>
              @for (meeting of remainingMeetings(); track meeting.id) {
                <ui-card>
                  <ui-card-content class="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
                    <div class="min-w-0 space-y-1">
                      <p class="truncate text-sm font-medium">{{ meeting.title }}</p>
                      <p class="text-xs text-muted-foreground">
                        {{ formatDateTime(meeting.scheduledAt) }} · {{ meeting.durationMinutes }} min
                      </p>
                      <p class="font-mono text-xs text-primary">{{ countdownText(meeting) }}</p>
                    </div>

                    @if (hasJoinUrl(meeting)) {
                      @if (canJoin(meeting)) {
                        <a
                          [href]="meeting.meetingUrl"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex h-9 shrink-0 items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                        >
                          Join
                        </a>
                      } @else {
                        <ui-button size="sm" variant="outline" [disabled]="true" label="Join" />
                      }
                    }
                  </ui-card-content>
                </ui-card>
              }
            </section>
          }
        }
      }
    </main>
  `,
})
export class ClientMeetingsComponent implements OnInit, OnDestroy {
  private readonly clientPortalApi = inject(ClientPortalApiService);

  private countdownTimer: ReturnType<typeof setInterval> | null = null;

  protected readonly joinWindowMinutes = JOIN_WINDOW_MINUTES;
  protected readonly isLoading = signal(true);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly meetings = signal<ClientPortalMeetingCard[]>([]);
  protected readonly respondingMeetingId = signal<string | null>(null);
  protected readonly now = signal(Date.now());

  protected readonly pendingMeetings = computed(() =>
    this.meetings().filter((meeting) => meeting.status === PENDING_STATUS),
  );

  protected readonly scheduledMeetings = computed(() =>
    this.meetings().filter((meeting) => meeting.status === SCHEDULED_STATUS),
  );

  protected readonly nextMeeting = computed(() => this.scheduledMeetings()[0] ?? null);

  protected readonly remainingMeetings = computed(() => this.scheduledMeetings().slice(1));

  async ngOnInit(): Promise<void> {
    await this.loadMeetings();
    this.countdownTimer = setInterval(() => {
      this.now.set(Date.now());
    }, 1_000);
  }

  ngOnDestroy(): void {
    if (this.countdownTimer !== null) {
      clearInterval(this.countdownTimer);
    }
  }

  protected async acceptMeeting(meetingId: string): Promise<void> {
    this.respondingMeetingId.set(meetingId);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.clientPortalApi.acceptMeeting(meetingId));
      await this.loadMeetings();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to accept meeting.'));
    } finally {
      this.respondingMeetingId.set(null);
    }
  }

  protected async declineMeeting(meetingId: string): Promise<void> {
    this.respondingMeetingId.set(meetingId);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(this.clientPortalApi.declineMeeting(meetingId));
      await this.loadMeetings();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to decline meeting.'));
    } finally {
      this.respondingMeetingId.set(null);
    }
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return new Intl.DateTimeFormat(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }).format(date);
  }

  protected meetingStatusLabel(status: number): string {
    return MEETING_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected hasJoinUrl(meeting: ClientPortalMeetingCard): boolean {
    return meeting.meetingUrl.trim() !== '';
  }

  protected canJoin(meeting: ClientPortalMeetingCard): boolean {
    if (!this.hasJoinUrl(meeting)) {
      return false;
    }

    const startMs = new Date(meeting.scheduledAt).getTime();
    if (Number.isNaN(startMs)) {
      return false;
    }

    const joinOpensMs = startMs - JOIN_WINDOW_MINUTES * 60_000;
    const endMs = startMs + meeting.durationMinutes * 60_000;
    const current = this.now();

    return current >= joinOpensMs && current < endMs;
  }

  protected countdownHeading(meeting: ClientPortalMeetingCard): string {
    const startMs = new Date(meeting.scheduledAt).getTime();
    if (Number.isNaN(startMs)) {
      return 'Countdown';
    }

    const endMs = startMs + meeting.durationMinutes * 60_000;
    const current = this.now();

    if (current >= startMs && current < endMs) {
      return 'In progress';
    }

    if (current >= endMs) {
      return 'Ended';
    }

    return 'Starts in';
  }

  protected countdownText(meeting: ClientPortalMeetingCard): string {
    const startMs = new Date(meeting.scheduledAt).getTime();
    if (Number.isNaN(startMs)) {
      return '--';
    }

    const endMs = startMs + meeting.durationMinutes * 60_000;
    const current = this.now();

    if (current >= startMs && current < endMs) {
      return this.formatDuration(endMs - current);
    }

    if (current >= endMs) {
      return '0m 0s';
    }

    return this.formatDuration(startMs - current);
  }

  private async loadMeetings(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(this.clientPortalApi.getMeetings());
      this.meetings.set(result.meetings);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load meetings.'));
      this.meetings.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private formatDuration(milliseconds: number): string {
    const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
    const days = Math.floor(totalSeconds / 86_400);
    const hours = Math.floor((totalSeconds % 86_400) / 3_600);
    const minutes = Math.floor((totalSeconds % 3_600) / 60);
    const seconds = totalSeconds % 60;

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m`;
    }

    if (hours > 0) {
      return `${hours}h ${minutes}m ${seconds}s`;
    }

    return `${minutes}m ${seconds}s`;
  }
}
