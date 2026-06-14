import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { DatePickerComponent } from '@/components/ui/date-picker.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  CreateMeetingRequest,
  MeetingApiService,
  MeetingListItem,
} from '@/app/core/api/services/meeting-api.service';
import { ClientApiService } from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

const MEETING_STATUS_LABELS: Record<number, string> = {
  1: 'Scheduled',
  2: 'Completed',
  3: 'Cancelled',
  4: 'Pending acceptance',
  5: 'Declined',
};

const SCHEDULED_STATUS = 1;

interface CalendarCell {
  readonly key: string;
  readonly label: string;
  readonly hasMeeting: boolean;
  readonly meetingLabel: string;
  readonly inMonth: boolean;
}

@Component({
  selector: 'app-meetings-hub',
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
    DatePickerComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Meetings</h1>
          <p class="text-sm text-muted-foreground">
            Schedule meetings for client approval. Accepted meetings appear on the calendar.
          </p>
        </header>

        @if (errorMessage() !== null) {
          <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {{ errorMessage() }}
          </p>
        }

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Meeting Views</ui-card-title>
              <ui-card-description>
                Calendar shows accepted meetings. Pending requests appear in list view until the client responds.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="mb-4 flex gap-2">
                <ui-button
                  label="Calendar View"
                  [variant]="activeView() === 'calendar' ? 'default' : 'outline'"
                  (clicked)="activeView.set('calendar')"
                />
                <ui-button
                  label="List View"
                  [variant]="activeView() === 'list' ? 'default' : 'outline'"
                  (clicked)="activeView.set('list')"
                />
              </div>

              @if (isLoading()) {
                <p class="text-sm text-muted-foreground">Loading meetings...</p>
              } @else if (activeView() === 'calendar') {
                <section class="rounded-lg border p-3">
                  <p class="mb-3 text-sm font-medium">{{ calendarMonthLabel() }}</p>
                  <div class="grid grid-cols-7 gap-1 text-center text-xs">
                    @for (day of weekDays; track day) {
                      <div class="py-1 font-medium text-muted-foreground">{{ day }}</div>
                    }
                    @for (cell of calendarCells(); track cell.key) {
                      <div
                        class="min-h-14 rounded border p-1 text-left"
                        [class.bg-primary/10]="cell.hasMeeting"
                        [class.text-muted-foreground/40]="!cell.inMonth"
                      >
                        <p class="text-[11px]">{{ cell.label }}</p>
                        @if (cell.hasMeeting) {
                          <p class="mt-1 truncate text-[10px] font-medium">{{ cell.meetingLabel }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>
              } @else if (meetings().length === 0) {
                <p class="text-sm text-muted-foreground">No meetings scheduled yet.</p>
              } @else {
                <ul class="space-y-2">
                  @for (meeting of meetings(); track meeting.id) {
                    <li class="rounded-lg border p-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <p class="text-sm font-medium">{{ meeting.title }}</p>
                        <span class="rounded-full border px-2 py-0.5 text-xs">
                          {{ meetingStatusLabel(meeting.status) }}
                        </span>
                      </div>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {{ formatDateTime(meeting.scheduledAt) }} · {{ meeting.durationMinutes }} min ·
                        {{ clientName(meeting.clientId) }}
                      </p>
                    </li>
                  }
                </ul>
              }
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Schedule Meeting</ui-card-title>
              <ui-card-description>
                The client must accept before the meeting is added to the calendar.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="schedulerForm" class="space-y-3" (ngSubmit)="onSchedule()">
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Title</label>
                  <ui-input formControlName="title" placeholder="Quarterly review" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Client</label>
                  <ui-select
                    [options]="clientOptions()"
                    formControlName="clientId"
                    placeholder="Select client"
                    [required]="true"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Date</label>
                  <ui-date-picker formControlName="date" />
                </div>
                <div class="grid grid-cols-2 gap-2">
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Start</label>
                    <ui-input formControlName="startTime" placeholder="09:00" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">End</label>
                    <ui-input formControlName="endTime" placeholder="10:00" />
                  </div>
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Meeting link</label>
                  <ui-input formControlName="meetingUrl" placeholder="https://teams.microsoft.com/..." />
                </div>
                <div class="space-y-1">
                  <label class="text-xs text-muted-foreground">Agenda</label>
                  <ui-textarea formControlName="agenda" [rows]="3" placeholder="Meeting agenda" />
                </div>
                <ui-button type="submit" label="Schedule Meeting" [disabled]="isSubmitting()" />
              </form>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class MeetingsHubComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly meetingApi = inject(MeetingApiService);
  private readonly clientApi = inject(ClientApiService);

  protected readonly activeView = signal<'calendar' | 'list'>('calendar');
  protected readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly meetings = signal<ReadonlyArray<MeetingListItem>>([]);
  protected readonly clientOptions = signal<ReadonlyArray<SelectOption>>([]);
  private readonly clientNamesById = signal<Record<string, string>>({});

  protected readonly calendarMonthLabel = computed(() => {
    const now = new Date();
    return new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(now);
  });

  protected readonly calendarCells = computed(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const startOffset = (firstDay.getDay() + 6) % 7;

    const meetingByDay = new Map<number, string>();
    for (const meeting of this.meetings()) {
      if (meeting.status !== SCHEDULED_STATUS) {
        continue;
      }

      const scheduled = new Date(meeting.scheduledAt);
      if (
        Number.isNaN(scheduled.getTime()) ||
        scheduled.getFullYear() !== year ||
        scheduled.getMonth() !== month
      ) {
        continue;
      }

      meetingByDay.set(scheduled.getDate(), meeting.title);
    }

    const cells: CalendarCell[] = [];
    const totalCells = Math.ceil((startOffset + daysInMonth) / 7) * 7;

    for (let index = 0; index < totalCells; index += 1) {
      const dayNumber = index - startOffset + 1;
      const inMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      const label = inMonth ? String(dayNumber) : '';
      const meetingLabel = inMonth ? (meetingByDay.get(dayNumber) ?? '') : '';

      cells.push({
        key: `cell-${index}`,
        label,
        hasMeeting: meetingLabel !== '',
        meetingLabel,
        inMonth,
      });
    }

    return cells;
  });

  protected readonly schedulerForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    clientId: ['', [Validators.required]],
    date: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
    meetingUrl: ['', [Validators.required]],
    agenda: ['', [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadClients(), this.loadMeetings()]);
  }

  protected meetingStatusLabel(status: number): string {
    return MEETING_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected clientName(clientId: string): string {
    return this.clientNamesById()[clientId] ?? 'Unknown client';
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

  protected async onSchedule(): Promise<void> {
    if (this.schedulerForm.invalid) {
      this.schedulerForm.markAllAsTouched();
      return;
    }

    const values = this.schedulerForm.getRawValue();
    if (values.endTime <= values.startTime) {
      this.toast.error('End time must be after start time.');
      return;
    }

    const durationMinutes = this.calculateDurationMinutes(values.startTime, values.endTime);
    if (durationMinutes <= 0) {
      this.toast.error('End time must be after start time.');
      return;
    }

    const request: CreateMeetingRequest = {
      clientId: values.clientId,
      title: values.title.trim(),
      description: values.agenda.trim(),
      scheduledAt: this.buildScheduledAtIso(values.date, values.startTime),
      durationMinutes,
      meetingUrl: values.meetingUrl.trim(),
      attendees: [],
    };

    this.isSubmitting.set(true);
    try {
      await firstValueFrom(this.meetingApi.scheduleMeeting(request));
      this.schedulerForm.reset({
        title: '',
        clientId: '',
        date: '',
        startTime: '',
        endTime: '',
        meetingUrl: '',
        agenda: '',
      });
      this.activeView.set('list');
      this.toast.success('Meeting request sent. Waiting for client acceptance.');
      await this.loadMeetings();
    } catch (error) {
      this.toast.error(readHttpErrorMessage(error, 'Failed to schedule meeting.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadClients(): Promise<void> {
    try {
      const result = await firstValueFrom(
        this.clientApi.getClients({ page: 1, pageSize: 100 }),
      );
      const namesById: Record<string, string> = {};
      const options: SelectOption[] = result.items.map((client) => {
        namesById[client.id] = client.companyName;
        return { value: client.id, label: client.companyName };
      });

      this.clientNamesById.set(namesById);
      this.clientOptions.set(options);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load clients.'));
    }
  }

  private async loadMeetings(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const result = await firstValueFrom(
        this.meetingApi.getMeetings({ page: 1, pageSize: 100 }),
      );
      this.meetings.set(result.items);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load meetings.'));
      this.meetings.set([]);
    } finally {
      this.isLoading.set(false);
    }
  }

  private buildScheduledAtIso(date: string, startTime: string): string {
    return new Date(`${date}T${startTime}:00`).toISOString();
  }

  private calculateDurationMinutes(startTime: string, endTime: string): number {
    const [startHour, startMinute] = startTime.split(':').map((part) => Number.parseInt(part, 10));
    const [endHour, endMinute] = endTime.split(':').map((part) => Number.parseInt(part, 10));

    if (
      Number.isNaN(startHour) ||
      Number.isNaN(startMinute) ||
      Number.isNaN(endHour) ||
      Number.isNaN(endMinute)
    ) {
      return 0;
    }

    return endHour * 60 + endMinute - (startHour * 60 + startMinute);
  }
}
