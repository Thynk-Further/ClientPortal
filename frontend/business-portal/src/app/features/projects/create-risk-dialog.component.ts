import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { UserSessionService } from '@/app/core/auth/user-session.service';
import { ProjectRiskSeverity } from '@/app/core/api/services/project-api.service';
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
  selector: 'app-create-risk-dialog',
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
      class="max-w-lg"
      ariaLabel="Add project risk"
      (openChange)="onOpenChange($event)"
    >
      <ui-dialog-header>
        <ui-dialog-title>Add Risk</ui-dialog-title>
        <ui-dialog-description>
          Log a project risk with severity and ownership. Only the title is required.
        </ui-dialog-description>
      </ui-dialog-header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <ui-dialog-content class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-risk-title">
              Title <span class="text-destructive">*</span>
            </label>
            <ui-input
              id="create-risk-title"
              placeholder="e.g. Third-party API dependency delay"
              formControlName="title"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-risk-description">
              Description
            </label>
            <ui-textarea
              id="create-risk-description"
              placeholder="Describe the risk, impact, and any known triggers."
              [rows]="4"
              formControlName="description"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-risk-severity">
                Severity
              </label>
              <ui-select
                id="create-risk-severity"
                [options]="severityOptions"
                formControlName="severity"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-risk-due-date">
                Due date
              </label>
              <input
                id="create-risk-due-date"
                type="date"
                class="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm outline-none transition-colors focus-visible:border-neutral-400"
                formControlName="dueDate"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-risk-owner">
              Owner
            </label>
            <ui-input
              id="create-risk-owner"
              [placeholder]="ownerName()"
              formControlName="ownerDisplay"
            />
          </div>

          @if (errorMessage() !== null) {
            <p class="text-sm text-destructive">{{ errorMessage() }}</p>
          }
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button type="button" variant="outline" label="Cancel" (clicked)="close()" />
          <ui-button
            type="submit"
            label="Add Risk"
            [disabled]="isSubmitting() || form.invalid"
          />
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class CreateRiskDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectStore = inject(ProjectStore);
  private readonly userSession = inject(UserSessionService);

  readonly open = input(false);
  readonly projectId = input('');
  readonly defaultDueDate = input('');
  readonly ownerName = input('You');

  readonly openChange = output<boolean>();
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly severityOptions: ReadonlyArray<SelectOption> = [
    { value: '1', label: 'Low' },
    { value: '2', label: 'Medium' },
    { value: '3', label: 'High' },
    { value: '4', label: 'Critical' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    description: ['', Validators.maxLength(2000)],
    severity: ['2', Validators.required],
    dueDate: [''],
    ownerDisplay: [{ value: '', disabled: true }],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      this.resetForm();
    });

    effect(() => {
      const name = this.ownerName();
      this.form.controls.ownerDisplay.setValue(name, { emitEvent: false });
    });
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

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const projectId = this.projectId().trim();
    const ownerId = this.userSession.getUser()?.id;
    if (projectId === '' || ownerId === undefined) {
      this.errorMessage.set('Unable to determine the current owner.');
      return;
    }

    const values = this.form.getRawValue();
    const title = values.title.trim();
    const description = values.description.trim();
    const severity = Number.parseInt(values.severity, 10) as ProjectRiskSeverity;
    const dueDate = values.dueDate.trim();

    if (title === '' || Number.isNaN(severity)) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const saved = await this.projectStore.createProjectRisk(projectId, {
      title,
      description,
      severity,
      ownerId,
      dueDate: dueDate === '' ? null : dueDate,
    });

    if (!saved) {
      this.errorMessage.set(this.projectStore.error() ?? 'Unable to create risk.');
      this.isSubmitting.set(false);
      return;
    }

    this.isSubmitting.set(false);
    this.created.emit();
    this.close();
  }

  private resetForm(): void {
    const defaultDueDate = this.defaultDueDate().trim();

    this.form.reset({
      title: '',
      description: '',
      severity: '2',
      dueDate: defaultDueDate,
    });
    this.form.controls.ownerDisplay.setValue(this.ownerName(), { emitEvent: false });
    this.form.controls.ownerDisplay.disable({ emitEvent: false });
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }
}
