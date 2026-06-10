import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalProjectListItem,
  ClientPortalRequestListItem,
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
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

const REQUEST_STATUS_LABELS: Record<number, string> = {
  1: 'Submitted',
  2: 'In review',
  3: 'Approved',
  4: 'Rejected',
  5: 'Completed',
};

const REQUEST_PRIORITY_LABELS: Record<number, string> = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Urgent',
};

const PRIORITY_OPTIONS = [
  { value: 1, label: 'Low' },
  { value: 2, label: 'Medium' },
  { value: 3, label: 'High' },
  { value: 4, label: 'Urgent' },
] as const;

@Component({
  selector: 'app-client-requests-page',
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
    TextareaComponent,
  ],
  template: `
    <div class="space-y-6">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Requests</h1>
        <p class="text-sm text-muted-foreground">
          Submit a new request and track the status of previous submissions.
        </p>
      </header>

      @if (successMessage() !== null) {
        <p
          class="rounded-md border border-primary/25 bg-primary/5 px-3 py-2 text-sm text-foreground"
          role="status"
        >
          {{ successMessage() }}
        </p>
      }

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_1.2fr]">
        <ui-card>
          <ui-card-header>
            <ui-card-title>New request</ui-card-title>
            <ui-card-description>
              Describe what you need and choose the project and priority.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="submit()">
              <div class="space-y-1.5">
                <label class="text-sm font-medium" for="projectId">Project</label>
                <select
                  id="projectId"
                  formControlName="projectId"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  <option value="" disabled>Select a project</option>
                  @for (project of projects(); track project.id) {
                    <option [value]="project.id">{{ project.name }}</option>
                  }
                </select>
                @if (projectInvalid()) {
                  <p class="text-sm text-destructive">Select a project.</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium" for="title">Title</label>
                <ui-input
                  id="title"
                  placeholder="Brief summary of your request"
                  formControlName="title"
                />
                @if (titleInvalid()) {
                  <p class="text-sm text-destructive">Title is required.</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium" for="description">Description</label>
                <ui-textarea
                  id="description"
                  placeholder="Provide details so the team can respond effectively"
                  [rows]="5"
                  formControlName="description"
                />
                @if (descriptionInvalid()) {
                  <p class="text-sm text-destructive">Description is required.</p>
                }
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium" for="priority">Priority</label>
                <select
                  id="priority"
                  formControlName="priority"
                  class="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                >
                  @for (option of priorityOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <ui-button
                type="submit"
                class="w-full"
                [disabled]="isSubmitting()"
                [label]="isSubmitting() ? 'Submitting...' : 'Submit request'"
              />
            </form>
          </ui-card-content>
        </ui-card>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Request history</ui-card-title>
            <ui-card-description>Current status for all requests you have submitted.</ui-card-description>
          </ui-card-header>
          <ui-card-content>
            @if (isLoading()) {
              <p class="text-sm text-muted-foreground">Loading requests...</p>
            } @else if (requests().length === 0) {
              <p class="text-sm text-muted-foreground">You have not submitted any requests yet.</p>
            } @else {
              <ul class="space-y-3">
                @for (request of requests(); track request.id) {
                  <li class="rounded-lg border border-border/60 px-3 py-3">
                    <div class="flex flex-wrap items-start justify-between gap-2">
                      <div class="min-w-0">
                        <p class="text-sm font-medium text-foreground">{{ request.title }}</p>
                        <p class="text-xs text-muted-foreground">{{ request.projectName }}</p>
                      </div>
                      <div class="flex flex-wrap gap-2">
                        <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {{ requestStatusLabel(request.status) }}
                        </span>
                        <span class="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                          {{ requestPriorityLabel(request.priority) }}
                        </span>
                      </div>
                    </div>
                    @if (request.description.trim() !== '') {
                      <p class="mt-2 text-sm text-muted-foreground">{{ request.description }}</p>
                    }
                    <p class="mt-2 text-xs text-muted-foreground">
                      Submitted {{ formatDateTime(request.createdAtUtc) }}
                      @if (request.updatedAtUtc !== request.createdAtUtc) {
                        · Updated {{ formatDateTime(request.updatedAtUtc) }}
                      }
                    </p>
                  </li>
                }
              </ul>
            }
          </ui-card-content>
        </ui-card>
      </div>
    </div>
  `,
})
export class ClientRequestsPageComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientPortalApi = inject(ClientPortalApiService);

  protected readonly priorityOptions = PRIORITY_OPTIONS;

  protected readonly form = this.formBuilder.nonNullable.group({
    projectId: ['', [Validators.required]],
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', [Validators.required, Validators.maxLength(4000)]],
    priority: [2, [Validators.required]],
  });

  protected readonly projects = signal<ClientPortalProjectListItem[]>([]);
  protected readonly requests = signal<ClientPortalRequestListItem[]>([]);
  protected readonly isLoading = signal(true);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  async ngOnInit(): Promise<void> {
    await this.loadPageData();
  }

  protected projectInvalid(): boolean {
    const control = this.form.controls.projectId;
    return control.invalid && (control.dirty || control.touched);
  }

  protected titleInvalid(): boolean {
    const control = this.form.controls.title;
    return control.invalid && (control.dirty || control.touched);
  }

  protected descriptionInvalid(): boolean {
    const control = this.form.controls.description;
    return control.invalid && (control.dirty || control.touched);
  }

  protected requestStatusLabel(status: number): string {
    return REQUEST_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected requestPriorityLabel(priority: number): string {
    return REQUEST_PRIORITY_LABELS[priority] ?? 'Unknown';
  }

  protected formatDateTime(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);
    this.successMessage.set(null);

    const raw = this.form.getRawValue();

    try {
      await firstValueFrom(
        this.clientPortalApi.submitRequest({
          projectId: raw.projectId,
          title: raw.title,
          description: raw.description,
          priority: Number(raw.priority),
        }),
      );

      this.form.reset({
        projectId: '',
        title: '',
        description: '',
        priority: 2,
      });
      this.successMessage.set('Your request was submitted successfully.');
      await this.loadRequests();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to submit request.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadPageData(): Promise<void> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const [projectsResult, requestsResult] = await Promise.all([
        firstValueFrom(this.clientPortalApi.getProjects()),
        firstValueFrom(this.clientPortalApi.getRequests()),
      ]);
      this.projects.set(projectsResult.projects);
      this.requests.set(requestsResult.requests);
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Unable to load requests.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadRequests(): Promise<void> {
    const requestsResult = await firstValueFrom(this.clientPortalApi.getRequests());
    this.requests.set(requestsResult.requests);
  }
}
