import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

type MeetingStatus = 'Scheduled' | 'Confirmed' | 'Completed';

interface MeetingItem {
  readonly id: string;
  readonly title: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
  readonly client: string;
  readonly status: MeetingStatus;
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
            Calendar and list visibility with a scheduler form for upcoming meetings.
          </p>
        </header>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.3fr_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Meeting Views</ui-card-title>
              <ui-card-description>
                Switch between calendar and list modes for quick schedule scanning.
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

              @if (activeView() === 'calendar') {
                <section class="rounded-lg border p-3">
                  <p class="mb-3 text-sm font-medium">May 2026</p>
                  <div class="grid grid-cols-7 gap-1 text-center text-xs">
                    @for (day of weekDays; track day) {
                      <div class="py-1 font-medium text-muted-foreground">{{ day }}</div>
                    }
                    @for (cell of calendarCells(); track cell.key) {
                      <div
                        class="min-h-14 rounded border p-1 text-left"
                        [class.bg-primary/10]="cell.hasMeeting"
                      >
                        <p class="text-[11px]">{{ cell.label }}</p>
                        @if (cell.hasMeeting) {
                          <p class="mt-1 truncate text-[10px] font-medium">{{ cell.meetingLabel }}</p>
                        }
                      </div>
                    }
                  </div>
                </section>
              } @else {
                <ul class="space-y-2">
                  @for (meeting of meetings(); track meeting.id) {
                    <li class="rounded-lg border p-3">
                      <div class="flex flex-wrap items-center justify-between gap-2">
                        <p class="text-sm font-medium">{{ meeting.title }}</p>
                        <span class="rounded-full border px-2 py-0.5 text-xs">{{ meeting.status }}</span>
                      </div>
                      <p class="mt-1 text-xs text-muted-foreground">
                        {{ meeting.date }} | {{ meeting.startTime }}-{{ meeting.endTime }} | {{ meeting.client }}
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
                Create a meeting from the business portal scheduler.
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
                    [options]="clientOptions"
                    formControlName="client"
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
                  <label class="text-xs text-muted-foreground">Agenda</label>
                  <ui-textarea formControlName="agenda" [rows]="3" placeholder="Meeting agenda" />
                </div>
                <ui-button type="submit" label="Schedule Meeting" />
              </form>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class MeetingsHubComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly activeView = signal<'calendar' | 'list'>('calendar');
  protected readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  protected readonly clientOptions: ReadonlyArray<SelectOption> = [
    { value: 'Contoso Architects', label: 'Contoso Architects' },
    { value: 'Northwind Retail', label: 'Northwind Retail' },
    { value: 'Fabrikam Manufacturing', label: 'Fabrikam Manufacturing' },
  ];

  protected readonly meetings = signal<ReadonlyArray<MeetingItem>>([
    {
      id: 'meet-001',
      title: 'Invoice Reconciliation',
      date: '2026-05-05',
      startTime: '09:00',
      endTime: '09:30',
      client: 'Contoso Architects',
      status: 'Scheduled',
    },
    {
      id: 'meet-002',
      title: 'Contract Renewal Review',
      date: '2026-05-08',
      startTime: '11:00',
      endTime: '12:00',
      client: 'Northwind Retail',
      status: 'Confirmed',
    },
    {
      id: 'meet-003',
      title: 'Project Kickoff',
      date: '2026-05-12',
      startTime: '14:00',
      endTime: '15:00',
      client: 'Fabrikam Manufacturing',
      status: 'Scheduled',
    },
  ]);

  protected readonly schedulerForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    client: ['', [Validators.required]],
    date: ['', [Validators.required]],
    startTime: ['', [Validators.required]],
    endTime: ['', [Validators.required]],
    agenda: ['', [Validators.required]],
  });

  protected readonly calendarCells = computed(() => {
    const meetingByDay = new Map<number, string>();
    for (const meeting of this.meetings()) {
      const day = Number.parseInt(meeting.date.slice(-2), 10);
      if (!Number.isNaN(day)) {
        meetingByDay.set(day, meeting.title);
      }
    }

    return Array.from({ length: 35 }, (_, index) => {
      const dayNumber = index + 1;
      const inMonth = dayNumber <= 31;
      const label = inMonth ? String(dayNumber) : '';
      const meetingLabel = inMonth ? (meetingByDay.get(dayNumber) ?? '') : '';
      return {
        key: `cell-${index + 1}`,
        label,
        hasMeeting: meetingLabel !== '',
        meetingLabel,
      };
    });
  });

  protected onSchedule(): void {
    if (this.schedulerForm.invalid) {
      this.schedulerForm.markAllAsTouched();
      return;
    }

    const values = this.schedulerForm.getRawValue();
    if (values.endTime <= values.startTime) {
      this.toast.error('End time must be after start time.');
      return;
    }

    const newMeeting: MeetingItem = {
      id: `meet-${Date.now()}`,
      title: values.title.trim(),
      date: values.date,
      startTime: values.startTime,
      endTime: values.endTime,
      client: values.client,
      status: 'Scheduled',
    };

    this.meetings.update((current) => [...current, newMeeting]);
    this.schedulerForm.reset({
      title: '',
      client: '',
      date: '',
      startTime: '',
      endTime: '',
      agenda: '',
    });
    this.activeView.set('list');
    this.toast.success('Meeting scheduled successfully.');
  }
}
