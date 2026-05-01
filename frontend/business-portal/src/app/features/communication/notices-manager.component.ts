import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

type NoticeStatus = 'Published' | 'Archived';
type NoticeAudience = 'All Clients' | 'Specific Clients';

interface NoticeItem {
  readonly id: string;
  readonly title: string;
  readonly message: string;
  readonly audience: NoticeAudience;
  readonly targetClients: ReadonlyArray<string>;
  readonly publishedAt: string;
  readonly status: NoticeStatus;
}

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

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-[1.1fr_1fr]">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Publish Notice</ui-card-title>
              <ui-card-description>
                Create a notice and target the intended client audience.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form class="space-y-3" [formGroup]="noticeForm" (ngSubmit)="onPublishNotice()">
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
                    <div class="flex flex-wrap gap-2">
                      @for (client of availableClients; track client) {
                        <button
                          type="button"
                          class="rounded-md border px-2 py-1 text-xs"
                          [class.bg-primary]="selectedClients().includes(client)"
                          [class.text-primary-foreground]="selectedClients().includes(client)"
                          (click)="toggleClientSelection(client)"
                        >
                          {{ client }}
                        </button>
                      }
                    </div>
                  </div>
                }

                <ui-button type="submit" label="Publish Notice" />
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Published Notices</ui-card-title>
              <ui-card-description>
                Active and archived notices with audience targeting context.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-3">
                @for (notice of notices(); track notice.id) {
                  <article class="rounded-lg border p-3">
                    <div class="flex flex-wrap items-center justify-between gap-2">
                      <p class="text-sm font-medium">{{ notice.title }}</p>
                      <span class="rounded-full border px-2 py-0.5 text-xs">{{ notice.status }}</span>
                    </div>
                    <p class="mt-1 text-sm">{{ notice.message }}</p>
                    <p class="mt-2 text-xs text-muted-foreground">
                      Audience:
                      {{ notice.audience }}
                      @if (notice.targetClients.length > 0) {
                        ({{ notice.targetClients.join(', ') }})
                      }
                    </p>
                    <p class="text-xs text-muted-foreground">Published: {{ notice.publishedAt }}</p>
                    <div class="mt-2">
                      <ui-button
                        variant="outline"
                        label="Archive"
                        [disabled]="notice.status === 'Archived'"
                        (clicked)="onArchiveNotice(notice.id)"
                      />
                    </div>
                  </article>
                }
              </div>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class NoticesManagerComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly audienceOptions: ReadonlyArray<SelectOption> = [
    { value: 'all', label: 'All clients' },
    { value: 'specific', label: 'Specific clients' },
  ];

  protected readonly availableClients: ReadonlyArray<string> = [
    'Contoso Architects',
    'Northwind Retail',
    'Fabrikam Manufacturing',
    'Blue Yonder Logistics',
  ];

  protected readonly noticeForm = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required]],
    message: ['', [Validators.required]],
    audience: ['all', [Validators.required]],
  });

  protected readonly selectedClients = signal<ReadonlyArray<string>>([]);

  protected readonly notices = signal<ReadonlyArray<NoticeItem>>([
    {
      id: 'notice-001',
      title: 'May Maintenance Window',
      message: 'Scheduled maintenance on Saturday 22:00-23:00 UTC.',
      audience: 'All Clients',
      targetClients: [],
      publishedAt: '2026-05-01 15:20',
      status: 'Published',
    },
    {
      id: 'notice-002',
      title: 'Invoice Workflow Update',
      message: 'Updated payment allocation flow for enterprise clients.',
      audience: 'Specific Clients',
      targetClients: ['Contoso Architects', 'Fabrikam Manufacturing'],
      publishedAt: '2026-04-30 11:05',
      status: 'Published',
    },
  ]);

  protected toggleClientSelection(client: string): void {
    this.selectedClients.update((current) =>
      current.includes(client)
        ? current.filter((item) => item !== client)
        : [...current, client],
    );
  }

  protected onPublishNotice(): void {
    if (this.noticeForm.invalid) {
      this.noticeForm.markAllAsTouched();
      return;
    }

    const formValue = this.noticeForm.getRawValue();
    const specificAudienceChosen = formValue.audience === 'specific';

    if (specificAudienceChosen && this.selectedClients().length === 0) {
      this.toast.warning('Select at least one client for a targeted notice.');
      return;
    }

    const nextNotice: NoticeItem = {
      id: `notice-${Date.now()}`,
      title: formValue.title.trim(),
      message: formValue.message.trim(),
      audience: specificAudienceChosen ? 'Specific Clients' : 'All Clients',
      targetClients: specificAudienceChosen ? this.selectedClients() : [],
      publishedAt: new Date().toLocaleString(),
      status: 'Published',
    };

    this.notices.update((current) => [nextNotice, ...current]);
    this.noticeForm.reset({ title: '', message: '', audience: 'all' });
    this.selectedClients.set([]);
    this.toast.success('Notice published successfully.');
  }

  protected onArchiveNotice(noticeId: string): void {
    this.notices.update((current) =>
      current.map((notice) =>
        notice.id === noticeId
          ? {
              ...notice,
              status: 'Archived',
            }
          : notice,
      ),
    );
    this.toast.info('Notice archived.');
  }
}
