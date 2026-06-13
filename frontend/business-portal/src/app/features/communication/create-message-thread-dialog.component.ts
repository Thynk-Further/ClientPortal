import {
  ChangeDetectionStrategy,
  Component,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { ClientApiService, ClientSummary } from '@/app/core/api/services/client-api.service';
import { MessageApiService } from '@/app/core/api/services/message-api.service';
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
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

@Component({
  selector: 'app-create-message-thread-dialog',
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
      ariaLabel="Start new conversation"
      (openChange)="onOpenChange($event)"
    >
      <ui-dialog-header>
        <ui-dialog-title>New conversation</ui-dialog-title>
        <ui-dialog-description>
          Choose a client and subject. They will see the thread in their client portal once you send the first message.
        </ui-dialog-description>
      </ui-dialog-header>

      <form [formGroup]="form" (ngSubmit)="submit()">
        <ui-dialog-content class="space-y-4">
          @if (errorMessage() !== null) {
            <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {{ errorMessage() }}
            </p>
          }

          @if (isLoadingClients()) {
            <p class="text-sm text-muted-foreground">Loading clients...</p>
          } @else {
            <div class="space-y-1.5">
              <label class="text-sm font-medium text-foreground" for="thread-client">
                Client <span class="text-destructive">*</span>
              </label>
              <ui-select
                id="thread-client"
                formControlName="clientId"
                placeholder="Select a client"
                [options]="clientOptions()"
                [required]="true"
              />
            </div>
          }

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="thread-subject">
              Subject <span class="text-destructive">*</span>
            </label>
            <ui-input
              id="thread-subject"
              formControlName="subject"
              placeholder="e.g. Invoice clarification"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="thread-opening-message">
              Opening message
            </label>
            <ui-textarea
              id="thread-opening-message"
              formControlName="openingMessage"
              [rows]="3"
              placeholder="Optional first message to start the chat..."
            />
          </div>
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button type="button" variant="outline" label="Cancel" (clicked)="close()" />
          <ui-button
            type="submit"
            [disabled]="form.invalid || isSubmitting() || isLoadingClients()"
            [label]="isSubmitting() ? 'Creating...' : 'Start conversation'"
          />
        </ui-dialog-footer>
      </form>
    </ui-dialog>
  `,
})
export class CreateMessageThreadDialogComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientApi = inject(ClientApiService);
  private readonly messageApi = inject(MessageApiService);

  readonly open = input(false);

  readonly openChange = output<boolean>();
  readonly threadCreated = output<{ threadId: string; openingMessage: string }>();

  protected readonly isLoadingClients = signal(false);
  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly clientOptions = signal<SelectOption[]>([]);

  protected readonly form = this.formBuilder.nonNullable.group({
    clientId: ['', [Validators.required]],
    subject: ['', [Validators.required, Validators.maxLength(300)]],
    openingMessage: ['', [Validators.maxLength(4000)]],
  });

  constructor() {
    void this.loadClients();
  }

  protected onOpenChange(isOpen: boolean): void {
    this.openChange.emit(isOpen);
    if (!isOpen) {
      this.resetForm();
    }
  }

  protected close(): void {
    this.openChange.emit(false);
    this.resetForm();
  }

  protected async submit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    const { clientId, subject, openingMessage } = this.form.getRawValue();

    try {
      const threadId = await firstValueFrom(
        this.messageApi.createThread({
          clientId,
          projectId: null,
          participantIds: [],
          subject: subject.trim(),
        }),
      );

      this.threadCreated.emit({
        threadId,
        openingMessage: openingMessage.trim(),
      });
      this.close();
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to start conversation.'));
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private async loadClients(): Promise<void> {
    this.isLoadingClients.set(true);

    try {
      const result = await firstValueFrom(
        this.clientApi.getClients({ page: 1, pageSize: 100, status: 'Active' }),
      );

      this.clientOptions.set(
        result.items.map((client: ClientSummary) => ({
          value: client.id,
          label: `${client.companyName} (${client.contactName})`,
        })),
      );
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load clients.'));
    } finally {
      this.isLoadingClients.set(false);
    }
  }

  private resetForm(): void {
    this.form.reset({ clientId: '', subject: '', openingMessage: '' });
    this.errorMessage.set(null);
  }
}
