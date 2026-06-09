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
import {
  ProjectDashboardMilestone,
  ProjectTaskPriority,
  ProjectTaskStatus,
} from '@/app/core/api/services/project-api.service';
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

@Component({
  selector: 'app-create-task-dialog',
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
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-lg"
      ariaLabel="Create new task"
      (openChange)="onOpenChange($event)"
    >
      <ui-dialog-header>
        <ui-dialog-title>Create New Task</ui-dialog-title>
        <ui-dialog-description>
          Add a new task to the board. Only the title is required.
        </ui-dialog-description>
      </ui-dialog-header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <ui-dialog-content class="space-y-4">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-task-title">
              Title <span class="text-destructive">*</span>
            </label>
            <ui-input
              id="create-task-title"
              placeholder="e.g. Build user settings page"
              formControlName="title"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-task-milestone">
              Milestone
            </label>
            <ui-select
              id="create-task-milestone"
              [options]="milestoneOptions()"
              formControlName="milestoneId"
            />
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-task-priority">
                Priority
              </label>
              <ui-select
                id="create-task-priority"
                [options]="priorityOptions"
                formControlName="priority"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="create-task-column">
                Column
              </label>
              <ui-select
                id="create-task-column"
                [options]="columnOptions"
                formControlName="column"
              />
            </div>
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-task-assignee">
              Assignee
            </label>
            <ui-input
              id="create-task-assignee"
              [placeholder]="assigneeName()"
              formControlName="assigneeDisplay"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="create-task-due-date">
              Due Date
            </label>
            <input
              id="create-task-due-date"
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
            label="Create Task"
            [disabled]="isSubmitting() || form.invalid"
          />
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class CreateTaskDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly projectStore = inject(ProjectStore);
  private readonly userSession = inject(UserSessionService);

  readonly open = input(false);
  readonly projectId = input('');
  readonly milestones = input<ReadonlyArray<ProjectDashboardMilestone>>([]);
  readonly defaultDueDate = input('');
  readonly assigneeName = input('You');

  readonly openChange = output<boolean>();
  readonly created = output<void>();

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);

  protected readonly priorityOptions: ReadonlyArray<SelectOption> = [
    { value: '1', label: 'Low' },
    { value: '2', label: 'Medium' },
    { value: '3', label: 'High' },
    { value: '4', label: 'Critical' },
  ];

  protected readonly columnOptions: ReadonlyArray<SelectOption> = [
    { value: '1', label: 'To Do' },
    { value: '2', label: 'In Progress' },
    { value: '3', label: 'Blocked' },
    { value: '4', label: 'Done' },
  ];

  protected readonly form = this.formBuilder.nonNullable.group({
    title: ['', [Validators.required, Validators.maxLength(300)]],
    milestoneId: ['', Validators.required],
    priority: ['2', Validators.required],
    column: ['1', Validators.required],
    assigneeDisplay: [{ value: '', disabled: true }],
    dueDate: ['', Validators.required],
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }

      this.resetForm();
    });

    effect(() => {
      const name = this.assigneeName();
      this.form.controls.assigneeDisplay.setValue(name, { emitEvent: false });
    });
  }

  protected milestoneOptions(): ReadonlyArray<SelectOption> {
    return this.milestones().map((milestone) => ({
      value: milestone.id,
      label: milestone.name,
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

  protected async submit(): Promise<void> {
    if (this.form.invalid || this.isSubmitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const projectId = this.projectId().trim();
    const assigneeId = this.userSession.getUser()?.id;
    if (projectId === '' || assigneeId === undefined) {
      this.errorMessage.set('Unable to determine the current assignee.');
      return;
    }

    const values = this.form.getRawValue();
    const title = values.title.trim();
    const milestoneId = values.milestoneId.trim();
    const dueDate = values.dueDate.trim();
    const priority = Number.parseInt(values.priority, 10) as ProjectTaskPriority;
    const column = Number.parseInt(values.column, 10) as ProjectTaskStatus;

    if (title === '' || milestoneId === '' || dueDate === '' || Number.isNaN(priority) || Number.isNaN(column)) {
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const taskId = await this.projectStore.createTask(projectId, {
      milestoneId,
      title,
      assigneeId,
      priority,
      dueDate,
    });

    if (taskId === null) {
      this.errorMessage.set(this.projectStore.error() ?? 'Unable to create task.');
      this.isSubmitting.set(false);
      return;
    }

    if (column !== 1) {
      const statusUpdated = await this.projectStore.changeTaskStatus(projectId, taskId, column);
      if (!statusUpdated) {
        this.errorMessage.set(this.projectStore.error() ?? 'Task created, but column could not be updated.');
        this.isSubmitting.set(false);
        return;
      }
    }

    this.isSubmitting.set(false);
    this.created.emit();
    this.close();
  }

  private resetForm(): void {
    const milestones = this.milestones();
    const defaultDueDate = this.defaultDueDate().trim();
    const fallbackDueDate = defaultDueDate === '' ? this.todayDateInputValue() : defaultDueDate;

    this.form.reset({
      title: '',
      milestoneId: milestones[0]?.id ?? '',
      priority: '2',
      column: '1',
      dueDate: fallbackDueDate,
    });
    this.form.controls.assigneeDisplay.setValue(this.assigneeName(), { emitEvent: false });
    this.form.controls.assigneeDisplay.disable({ emitEvent: false });
    this.errorMessage.set(null);
    this.isSubmitting.set(false);
  }

  private todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
  }
}
