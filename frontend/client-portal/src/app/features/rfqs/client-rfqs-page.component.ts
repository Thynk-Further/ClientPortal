import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalProjectListItem,
  ClientPortalRfqListItem,
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
import { EmptyStateComponent } from '@/components/ui/empty-state.component';
import { InputComponent } from '@/components/ui/input.component';
import { StatusBadgeComponent } from '@/components/ui/status-badge.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import {
  clientRfqStatusLabel,
  datetimeLocalToIsoUtc,
  defaultQuotationDueLocalValue,
  formatClientRfqDateTime,
} from './rfq-display.util';

const PROJECT_STATUS_LABELS: Record<number, string> = {
  1: 'Planned',
  2: 'In progress',
  3: 'On hold',
  4: 'Completed',
  5: 'Cancelled',
};

const RFQ_STATUS_ACCENT: Record<number, string> = {
  1: 'bg-zinc-400',
  2: 'bg-blue-500',
  3: 'bg-violet-500',
  4: 'bg-emerald-500',
  5: 'bg-red-500',
  6: 'bg-zinc-400',
};

@Component({
  selector: 'app-client-rfqs-page',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
    TextareaComponent,
    EmptyStateComponent,
    StatusBadgeComponent,
  ],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="pb-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Requests for quotation</h1>
        <p class="mt-1 text-sm text-muted-foreground">
          Submit item lists and review quotations from your provider.
        </p>
      </header>

      <div class="grid grid-cols-1 gap-6 xl:grid-cols-[1.4fr_1fr]">
        <ui-card class="overflow-hidden">
          <ui-card-header class="border-b border-border/70 bg-muted/20">
            <ui-card-title>Create RFQ</ui-card-title>
            <ui-card-description>
              RFQ numbers are assigned automatically. Complete the sections below and save as a draft.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content class="p-0">
            <form [formGroup]="form" class="divide-y divide-border/70" (ngSubmit)="createRfq()">
              <section class="space-y-4 p-5 sm:p-6">
                <div>
                  <h2 class="text-sm font-semibold text-foreground">Request details</h2>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Basic information about what you need quoted.
                  </p>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium" for="rfq-title">Title</label>
                  <ui-input
                    id="rfq-title"
                    formControlName="title"
                    placeholder="e.g. Lab consumables"
                  />
                  @if (showFieldError('title')) {
                    <p class="text-xs text-destructive">Title is required (max 256 characters).</p>
                  }
                </div>

                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="quotation-due">Quotation due</label>
                    <input
                      id="quotation-due"
                      type="datetime-local"
                      formControlName="quotationDueAtLocal"
                      class="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                    />
                    <p class="text-xs text-muted-foreground">
                      When you expect to receive the quotation.
                    </p>
                  </div>

                  <div class="space-y-1.5">
                    <label class="text-sm font-medium" for="rfq-currency">Currency</label>
                    <ui-input
                      id="rfq-currency"
                      formControlName="currency"
                      placeholder="e.g. ZAR"
                    />
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label class="text-sm font-medium" for="rfq-project">Project</label>
                  @if (projects().length > 5) {
                    <div class="relative mb-2">
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
                        class="h-9 w-full rounded-md border border-input bg-background py-2 pr-3 pl-9 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                        placeholder="Search projects..."
                        [value]="projectSearchQuery()"
                        (input)="onProjectSearch($event)"
                      />
                    </div>
                  }
                  <select
                    id="rfq-project"
                    formControlName="projectId"
                    class="h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  >
                    <option value="">Select a project</option>
                    @for (project of filteredProjects(); track project.id) {
                      <option [value]="project.id">
                        {{ project.name }} · {{ projectStatusLabel(project.status) }} · due {{ formatDate(project.endDate) }}
                      </option>
                    }
                  </select>
                  @if (showFieldError('projectId')) {
                    <p class="text-xs text-destructive">Please select a project.</p>
                  }
                  @if (filteredProjects().length === 0) {
                    <p class="text-xs text-muted-foreground">No projects match your search.</p>
                  }
                </div>
              </section>

              <section class="space-y-4 p-5 sm:p-6">
                <div class="flex items-start justify-between gap-3">
                  <div>
                    <h2 class="text-sm font-semibold text-foreground">Line items</h2>
                    <p class="mt-0.5 text-xs text-muted-foreground">
                      List each product or service you need quoted.
                    </p>
                  </div>
                  <ui-button type="button" variant="outline" size="sm" (click)="addLineItem()">
                    + Add item
                  </ui-button>
                </div>

                <div class="overflow-hidden rounded-lg border border-border/70">
                  <table class="w-full text-sm">
                    <thead>
                      <tr class="border-b border-border/70 bg-muted/30 text-left text-muted-foreground">
                        <th class="px-3 py-2.5 font-medium">#</th>
                        <th class="px-3 py-2.5 font-medium">Description</th>
                        <th class="w-28 px-3 py-2.5 font-medium">Qty</th>
                        <th class="w-12 px-3 py-2.5" aria-label="Remove"></th>
                      </tr>
                    </thead>
                    <tbody formArrayName="lineItems">
                      @for (item of lineItems.controls; track $index) {
                        <tr class="border-b border-border/50 last:border-b-0" [formGroupName]="$index">
                          <td class="px-3 py-2 text-muted-foreground">{{ $index + 1 }}</td>
                          <td class="px-3 py-2">
                            <ui-input formControlName="description" placeholder="Item description" />
                          </td>
                          <td class="px-3 py-2">
                            <ui-input formControlName="quantity" type="number" placeholder="1" />
                          </td>
                          <td class="px-3 py-2">
                            <button
                              type="button"
                              class="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-destructive disabled:opacity-30"
                              [disabled]="lineItems.length <= 1"
                              [attr.aria-label]="'Remove line item ' + ($index + 1)"
                              (click)="removeLineItem($index)"
                            >
                              <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="M18 6 6 18M6 6l12 12" />
                              </svg>
                            </button>
                          </td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              </section>

              <section class="space-y-4 p-5 sm:p-6">
                <div>
                  <h2 class="text-sm font-semibold text-foreground">Additional notes</h2>
                  <p class="mt-0.5 text-xs text-muted-foreground">
                    Optional context for your provider (delivery, specs, etc.).
                  </p>
                </div>
                <ui-textarea formControlName="notes" placeholder="Add any special instructions or requirements..." />
              </section>

              @if (errorMessage() !== null) {
                <div class="px-5 sm:px-6">
                  <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                    {{ errorMessage() }}
                  </p>
                </div>
              }

              <div class="flex flex-col-reverse gap-3 p-5 sm:flex-row sm:items-center sm:justify-end sm:p-6">
                <ui-button type="button" variant="ghost" (click)="resetForm()">
                  Clear form
                </ui-button>
                <ui-button
                  type="submit"
                  class="bg-neutral-950 text-white hover:bg-neutral-800"
                  [disabled]="isSaving()"
                  [label]="isSaving() ? 'Saving...' : 'Save draft RFQ'"
                />
              </div>
            </form>
          </ui-card-content>
        </ui-card>

        <section class="space-y-4">
          <div class="flex items-center justify-between gap-3">
            <h2 class="text-base font-semibold text-foreground">Your RFQs</h2>
            <span class="text-sm text-muted-foreground">{{ rfqs().length }} total</span>
          </div>

          @if (rfqs().length === 0) {
            <ui-empty-state
              title="No RFQs yet"
              message="Saved and submitted requests will appear here."
            />
          } @else {
            <div class="space-y-3">
              @for (rfq of rfqs(); track rfq.id) {
                <a
                  class="group flex overflow-hidden rounded-xl border border-border/70 bg-card shadow-sm transition-all hover:border-border hover:shadow-md"
                  [routerLink]="['/rfqs', rfq.id]"
                >
                  <div
                    class="w-1 shrink-0"
                    [class]="statusAccentClass(rfq.status)"
                    aria-hidden="true"
                  ></div>
                  <div class="min-w-0 flex-1 p-4">
                    <div class="flex items-start justify-between gap-3">
                      <div class="min-w-0">
                        <p class="truncate font-medium text-foreground group-hover:text-primary">
                          {{ rfq.title }}
                        </p>
                        <p class="mt-0.5 text-xs text-muted-foreground">{{ rfq.rfqNumber }}</p>
                      </div>
                      <ui-status-badge [status]="statusLabel(rfq.status)" />
                    </div>
                    <p class="mt-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Quotation due
                    </p>
                    <p class="mt-1 text-sm text-foreground">
                      {{ formatDateTime(rfq.quotationDueAtUtc) }}
                    </p>
                  </div>
                </a>
              }
            </div>
          }
        </section>
      </div>
    </main>
  `,
})
export class ClientRfqsPageComponent implements OnInit {
  private readonly api = inject(ClientPortalApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly rfqs = signal<ClientPortalRfqListItem[]>([]);
  protected readonly projects = signal<ClientPortalProjectListItem[]>([]);
  protected readonly isSaving = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly submitAttempted = signal(false);
  protected readonly projectSearchQuery = signal('');

  protected readonly filteredProjects = computed(() => {
    const query = this.projectSearchQuery().trim().toLowerCase();
    const items = this.projects();

    if (query === '') {
      return items;
    }

    return items.filter((project) => project.name.toLowerCase().includes(query));
  });

  protected readonly form = this.fb.group({
    title: ['', [Validators.required, Validators.maxLength(256)]],
    quotationDueAtLocal: [defaultQuotationDueLocalValue(), Validators.required],
    currency: ['ZAR', Validators.required],
    projectId: ['', Validators.required],
    notes: [''],
    lineItems: this.fb.array([this.createLineItemGroup()]),
  });

  protected get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  async ngOnInit(): Promise<void> {
    const [rfqsResult, projectsResult] = await Promise.all([
      firstValueFrom(this.api.getRfqs()),
      firstValueFrom(this.api.getProjects()),
    ]);
    this.rfqs.set(rfqsResult.rfqs.items);
    this.projects.set(projectsResult.projects);
  }

  protected statusLabel(status: number): string {
    return clientRfqStatusLabel(status);
  }

  protected statusAccentClass(status: number): string {
    return RFQ_STATUS_ACCENT[status] ?? 'bg-zinc-400';
  }

  protected projectStatusLabel(status: number): string {
    return PROJECT_STATUS_LABELS[status] ?? 'Unknown';
  }

  protected formatDateTime(value: string): string {
    return formatClientRfqDateTime(value);
  }

  protected formatDate(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  protected onProjectSearch(event: Event): void {
    const target = event.target;
    if (!(target instanceof HTMLInputElement)) {
      return;
    }

    this.projectSearchQuery.set(target.value);
  }

  protected showFieldError(controlName: string): boolean {
    if (!this.submitAttempted()) {
      return false;
    }

    const control = this.form.get(controlName);
    return control !== null && control.invalid;
  }

  protected addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup());
  }

  protected removeLineItem(index: number): void {
    if (this.lineItems.length <= 1) {
      return;
    }

    this.lineItems.removeAt(index);
  }

  protected resetForm(): void {
    this.submitAttempted.set(false);
    this.errorMessage.set(null);
    this.projectSearchQuery.set('');
    this.form.reset({
      title: '',
      quotationDueAtLocal: defaultQuotationDueLocalValue(),
      currency: 'ZAR',
      projectId: '',
      notes: '',
    });
    this.lineItems.clear();
    this.lineItems.push(this.createLineItemGroup());
  }

  protected async createRfq(): Promise<void> {
    this.submitAttempted.set(true);
    this.errorMessage.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      await firstValueFrom(
        this.api.createRfq({
          projectId: value.projectId ?? '',
          title: value.title ?? '',
          quotationDueAtUtc: datetimeLocalToIsoUtc(value.quotationDueAtLocal ?? ''),
          currency: value.currency ?? 'ZAR',
          notes: value.notes,
          lineItems: this.lineItems.controls.map((ctrl) => ({
            description: ctrl.value.description ?? '',
            quantity: Number(ctrl.value.quantity ?? 0),
          })),
        }),
      );
      const result = await firstValueFrom(this.api.getRfqs());
      this.rfqs.set(result.rfqs.items);
      this.resetForm();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to create RFQ.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private createLineItemGroup() {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
    });
  }
}
