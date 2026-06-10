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
  MilestoneStatus,
  ProjectDashboardMilestone,
} from '@/app/core/api/services/project-api.service';
import { ProjectStore } from '@/app/core/stores/project.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '@/components/ui/dialog.component';
import { InputComponent } from '@/components/ui/input.component';

@Component({
  selector: 'app-milestone-dialog',
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
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-lg"
      [attr.ariaLabel]="isEditMode() ? 'Edit milestone' : 'Add milestone'"
      (openChange)="onOpenChange($event)"
    >
      <ui-dialog-header>
        <ui-dialog-title>{{ isEditMode() ? 'Edit Milestone' : 'Add Milestone' }}</ui-dialog-title>
        <ui-dialog-description>
          @if (isEditMode()) {
            Update the milestone name or due date.
          } @else {
            Define a delivery phase for this project. Name and due date are required.
          }
        </ui-dialog-description>
      </ui-dialog-header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <ui-dialog-content class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="milestone-name">
              Name <span class="text-destructive">*</span>
            </label>
            <ui-input
              id="milestone-name"
              placeholder="e.g. Landing Page"
              formControlName="name"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="milestone-due-date">
              Due date <span class="text-destructive">*</span>
            </label>
            <input
              id="milestone-due-date"
              type="date"
              class="h-9 w-full rounded-lg border border-border/80 bg-background px-3 text-sm outline-none transition-colors focus-visible:border-neutral-400"
              formControlName="dueDate"
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
            [label]="isEditMode() ? 'Save Changes' : 'Add Milestone'"
            [disabled]="isSubmitting() || form.invalid"
          />
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class MilestoneDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectStore = inject(ProjectStore);

  readonly open = input(false);
  readonly projectId = input('');
  readonly milestone = input<ProjectDashboardMilestone | null>(null);
  readonly defaultDueDate = input('');

  readonly openChange = output<boolean>();
  readonly saved = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly isEditMode = computed(() => this.milestone() !== null);

  protected readonly form = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    dueDate: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      this.resetForm();
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
    if (projectId === '') {
      return;
    }

    const values = this.form.getRawValue();
    const name = values.name.trim();
    const dueDate = values.dueDate.trim();
    if (name === '' || dueDate === '') {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const editingMilestone = this.milestone();
    const saved =
      editingMilestone === null
        ? await this.projectStore.createMilestone(projectId, { name, dueDate })
        : await this.projectStore.updateMilestone(projectId, editingMilestone.id, {
            name,
            dueDate,
            status: editingMilestone.status as MilestoneStatus,
            completedAtUtc: editingMilestone.completedAtUtc,
          });

    if (!saved) {
      this.errorMessage.set(
        this.projectStore.error() ??
          (editingMilestone === null ? 'Unable to create milestone.' : 'Unable to update milestone.'),
      );
      this.isSubmitting.set(false);
      return;
    }

    this.isSubmitting.set(false);
    this.saved.emit();
    this.close();
  }

  private resetForm(): void {
    const editingMilestone = this.milestone();
    const defaultDueDate = this.defaultDueDate().trim();

    if (editingMilestone === null) {
      this.form.reset({
        name: '',
        dueDate: defaultDueDate === '' ? this.todayDateInputValue() : defaultDueDate,
      });
    } else {
      this.form.reset({
        name: editingMilestone.name,
        dueDate: editingMilestone.dueDate,
      });
    }

    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }

  private todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
