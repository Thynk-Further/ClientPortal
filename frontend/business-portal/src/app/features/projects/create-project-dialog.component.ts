import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import {
  CreateProjectMilestoneRequest,
} from '@/app/core/api/services/project-api.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ButtonComponent } from '@/components/ui/button.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '@/components/ui/dialog.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

@Component({
  selector: 'app-create-project-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    DialogComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogContentComponent,
    DialogFooterComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    TextareaComponent,
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-2xl"
      ariaLabel="Create new project"
      (openChange)="onOpenChange($event)"
    >
      <ui-dialog-header>
        <ui-dialog-title>Create New Project</ui-dialog-title>
        <ui-dialog-description>
          Set up a project timeline, budget, and optional initial milestones.
        </ui-dialog-description>
      </ui-dialog-header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <ui-dialog-content class="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          @if (hasFixedClient()) {
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-client-display">
                Client
              </label>
              <ui-input
                id="create-project-client-display"
                formControlName="clientDisplay"
              />
            </div>
          } @else {
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-client">
                Client <span class="text-destructive">*</span>
              </label>
              <ui-select
                id="create-project-client"
                [options]="clientOptions()"
                formControlName="clientId"
              />
            </div>
          }

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-project-name">
              Project name <span class="text-destructive">*</span>
            </label>
            <ui-input
              id="create-project-name"
              placeholder="e.g. Website redesign"
              formControlName="name"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-project-description">
              Description <span class="text-destructive">*</span>
            </label>
            <ui-textarea
              id="create-project-description"
              placeholder="Briefly describe scope, goals, and deliverables."
              [rows]="3"
              formControlName="description"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-start-date">
                Start date <span class="text-destructive">*</span>
              </label>
              <input
                id="create-project-start-date"
                type="date"
                class="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm outline-none transition-colors focus-visible:border-neutral-400"
                formControlName="startDate"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-end-date">
                End date <span class="text-destructive">*</span>
              </label>
              <input
                id="create-project-end-date"
                type="date"
                class="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm outline-none transition-colors focus-visible:border-neutral-400"
                formControlName="endDate"
              />
            </div>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-budget">
                Budget
              </label>
              <ui-input
                id="create-project-budget"
                type="number"
                placeholder="0"
                formControlName="budget"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-project-currency">
                Currency
              </label>
              <ui-input
                id="create-project-currency"
                placeholder="ZAR"
                maxlength="3"
                formControlName="currency"
              />
            </div>
          </div>

          <div class="space-y-3 rounded-xl border border-border/70 bg-muted/20 p-3 dark:border-white/10">
            <div class="flex items-center justify-between gap-2">
              <div>
                <p class="text-sm font-medium text-foreground">Initial milestones</p>
                <p class="text-xs text-muted-foreground">Optional delivery phases to scaffold the timeline.</p>
              </div>
              <ui-button
                type="button"
                variant="outline"
                label="Add milestone"
                (clicked)="addScaffoldMilestone()"
              />
            </div>

            @if (scaffoldMilestones().length === 0) {
              <p class="text-xs text-muted-foreground">No milestones added yet.</p>
            } @else {
              @for (milestone of scaffoldMilestones(); track $index) {
                <div class="grid gap-2 sm:grid-cols-[1fr_auto_auto]">
                  <input
                    class="h-9 rounded-lg border border-border/80 bg-background px-3 text-sm outline-none focus-visible:border-neutral-400"
                    placeholder="Milestone name"
                    [value]="milestone.name"
                    (input)="onScaffoldMilestoneNameInput($index, $event)"
                  />
                  <input
                    type="date"
                    class="h-9 rounded-lg border border-border/80 bg-background px-3 text-sm outline-none focus-visible:border-neutral-400"
                    [value]="milestone.dueDate"
                    (input)="onScaffoldMilestoneDueDateInput($index, $event)"
                  />
                  <ui-button
                    type="button"
                    variant="outline"
                    label="Remove"
                    (clicked)="removeScaffoldMilestone($index)"
                  />
                </div>
              }
            }
          </div>

          @if (errorMessage() !== null) {
            <p class="text-sm text-destructive">{{ errorMessage() }}</p>
          }
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button type="button" variant="outline" label="Cancel" (clicked)="close()" />
          <ui-button
            type="submit"
            label="Create Project"
            [disabled]="isSubmitting() || form.invalid"
          />
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class CreateProjectDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectStore = inject(ProjectStore);
  private readonly clientStore = inject(ClientStore);

  readonly open = input(false);
  readonly clientId = input('');
  readonly clientName = input('');

  readonly openChange = output<boolean>();
  readonly created = output<string>();

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly scaffoldMilestones = signal<CreateProjectMilestoneRequest[]>([]);

  protected readonly hasFixedClient = computed(() => this.clientId().trim() !== '');

  protected readonly form = this.formBuilder.nonNullable.group({
    clientId: ['', Validators.required],
    clientDisplay: [{ value: '', disabled: true }],
    name: ['', [Validators.required, Validators.maxLength(200)]],
    description: ['', [Validators.required, Validators.maxLength(2000)]],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    budget: ['0', [Validators.required, Validators.min(0)]],
    currency: ['ZAR', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      void this.initializeDialog();
    });
  }

  protected clientOptions(): ReadonlyArray<SelectOption> {
    return this.clientStore.clients().map((client) => ({
      value: client.id,
      label: client.companyName,
    }));
  }

  protected onOpenChange(nextOpen: boolean): void {
    this.openChange.emit(nextOpen);
    if (!nextOpen) {
      this.errorMessage.set(null);
      this.isSubmitting.set(false);
    }
  }

  protected close(): void {
    this.openChange.emit(false);
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }

  protected addScaffoldMilestone(): void {
    const endDate = this.form.controls.endDate.value.trim();
    this.scaffoldMilestones.update((current) => [
      ...current,
      { name: '', dueDate: endDate === '' ? this.defaultEndDateValue() : endDate },
    ]);
  }

  protected removeScaffoldMilestone(index: number): void {
    this.scaffoldMilestones.update((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  protected onScaffoldMilestoneNameInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scaffoldMilestones.update((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, name: value } : milestone,
      ),
    );
  }

  protected onScaffoldMilestoneDueDateInput(index: number, event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.scaffoldMilestones.update((current) =>
      current.map((milestone, itemIndex) =>
        itemIndex === index ? { ...milestone, dueDate: value } : milestone,
      ),
    );
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const clientId = this.hasFixedClient() ? this.clientId().trim() : values.clientId.trim();
    const name = values.name.trim();
    const description = values.description.trim();
    const startDate = values.startDate.trim();
    const endDate = values.endDate.trim();
    const budget = Number.parseFloat(values.budget);
    const currency = values.currency.trim().toUpperCase();

    if (
      clientId === ''
      || name === ''
      || description === ''
      || startDate === ''
      || endDate === ''
      || currency === ''
      || Number.isNaN(budget)
    ) {
      return;
    }

    const milestones = this.scaffoldMilestones()
      .map((milestone) => ({
        name: milestone.name.trim(),
        dueDate: milestone.dueDate,
      }))
      .filter((milestone) => milestone.name !== '' && milestone.dueDate !== '');

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const projectId = await this.projectStore.createProject({
      clientId,
      name,
      description,
      startDate,
      endDate,
      budget,
      currency,
      milestones: milestones.length > 0 ? milestones : undefined,
    });

    if (projectId === null) {
      this.errorMessage.set(this.projectStore.error() ?? 'Unable to create project.');
      this.isSubmitting.set(false);
      return;
    }

    this.isSubmitting.set(false);
    this.created.emit(projectId);
    this.close();
  }

  private async initializeDialog(): Promise<void> {
    this.resetForm();

    if (!this.hasFixedClient()) {
      await this.clientStore.loadClients({ page: 1, pageSize: 100 });
      const clients = this.clientStore.clients();
      if (clients.length > 0) {
        this.form.controls.clientId.setValue(clients[0].id);
      }
    }
  }

  private resetForm(): void {
    const fixedClientId = this.clientId().trim();
    const fixedClientName = this.clientName().trim();

    this.form.reset({
      clientId: fixedClientId,
      name: '',
      description: '',
      startDate: this.todayDateInputValue(),
      endDate: this.defaultEndDateValue(),
      budget: '0',
      currency: 'ZAR',
    });

    if (fixedClientId !== '') {
      this.form.controls.clientId.setValue(fixedClientId);
      this.form.controls.clientId.disable({ emitEvent: false });
      this.form.controls.clientDisplay.setValue(
        fixedClientName === '' ? 'Selected client' : fixedClientName,
        { emitEvent: false },
      );
      this.form.controls.clientDisplay.disable({ emitEvent: false });
    } else {
      this.form.controls.clientId.enable({ emitEvent: false });
      this.form.controls.clientDisplay.disable({ emitEvent: false });
    }

    this.scaffoldMilestones.set([]);
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }

  private todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private defaultEndDateValue(): string {
    const end = new Date();
    end.setMonth(end.getMonth() + 3);
    return end.toISOString().slice(0, 10);
  }
}
