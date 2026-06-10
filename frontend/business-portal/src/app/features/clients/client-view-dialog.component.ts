import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { firstValueFrom } from 'rxjs';

import {
  ClientApiService,
  ClientDetail,
} from '@/app/core/api/services/client-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from '@/components/ui/dialog.component';
import { ButtonComponent } from '@/components/ui/button.component';

@Component({
  selector: 'app-client-view-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    DialogContentComponent,
    DialogFooterComponent,
    ButtonComponent,
  ],
  template: `
    <ui-dialog
      [open]="open()"
      class="max-w-2xl"
      ariaLabel="Client details"
      (openChange)="onOpenChange($event)"
    >
      @if (isLoading()) {
        <ui-dialog-header>
          <ui-dialog-title>Client details</ui-dialog-title>
          <ui-dialog-description>Loading client information...</ui-dialog-description>
        </ui-dialog-header>
      } @else if (error() !== null) {
        <ui-dialog-header>
          <ui-dialog-title>Client details</ui-dialog-title>
          <ui-dialog-description class="text-destructive">{{ error() }}</ui-dialog-description>
        </ui-dialog-header>
        <ui-dialog-footer>
          <ui-button variant="outline" label="Close" (clicked)="close()" />
        </ui-dialog-footer>
      } @else if (client(); as details) {
        <ui-dialog-header>
          <ui-dialog-title>{{ details.companyName }}</ui-dialog-title>
          <ui-dialog-description>{{ details.contactName }}</ui-dialog-description>
        </ui-dialog-header>

        <ui-dialog-content class="space-y-5">
          <div class="space-y-1.5">
            <h3 class="text-sm font-medium text-foreground">Notes</h3>
            <p class="text-sm leading-relaxed text-muted-foreground">
              {{ formatNotes(details.notes) }}
            </p>
          </div>

          <dl class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Email</dt>
              <dd class="text-sm text-foreground">{{ details.email }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phone</dt>
              <dd class="text-sm text-foreground">{{ formatPhone(details.phone) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Status</dt>
              <dd class="text-sm text-foreground">{{ formatClientStatus(details.status) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Invited</dt>
              <dd class="text-sm text-foreground">{{ formatDate(details.invitedAt) }}</dd>
            </div>
            <div class="space-y-1">
              <dt class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Onboarded</dt>
              <dd class="text-sm text-foreground">{{ formatOptionalDate(details.onboardedAt) }}</dd>
            </div>
          </dl>
        </ui-dialog-content>

        <ui-dialog-footer>
          <ui-button variant="outline" label="Close" (clicked)="close()" />
          <ui-button label="Open client" (clicked)="openClient.emit(details)" />
        </ui-dialog-footer>
      }
    </ui-dialog>
  `,
})
export class ClientViewDialogComponent {
  private readonly clientApiService = inject(ClientApiService);

  readonly open = input(false);
  readonly clientId = input<string | null>(null);

  readonly openChange = output<boolean>();
  readonly openClient = output<ClientDetail>();

  protected readonly isLoading = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly client = signal<ClientDetail | null>(null);

  constructor() {
    effect(() => {
      const isOpen = this.open();
      const clientId = this.clientId();

      if (!isOpen || clientId === null || clientId.trim() === '') {
        this.resetState();
        return;
      }

      void this.loadClient(clientId);
    });
  }

  protected onOpenChange(nextOpen: boolean): void {
    this.openChange.emit(nextOpen);
    if (!nextOpen) {
      this.resetState();
    }
  }

  protected close(): void {
    this.openChange.emit(false);
    this.resetState();
  }

  protected formatClientStatus(status: ClientDetail['status']): string {
    return formatClientStatus(status);
  }

  protected formatDate(value: string): string {
    return formatDate(value);
  }

  protected formatOptionalDate(value: string | null | undefined): string {
    if (value === null || value === undefined || value.trim() === '') {
      return '—';
    }

    return formatDate(value);
  }

  protected formatPhone(phone: string): string {
    return phone.trim() === '' ? '—' : phone;
  }

  protected formatNotes(notes: string | null | undefined): string {
    if (notes === null || notes === undefined || notes.trim() === '') {
      return 'No notes provided.';
    }

    return notes;
  }

  private async loadClient(clientId: string): Promise<void> {
    this.isLoading.set(true);
    this.error.set(null);
    this.client.set(null);

    try {
      const details = await firstValueFrom(this.clientApiService.getClientById(clientId));
      this.client.set(details);
    } catch (loadError) {
      this.error.set(readHttpErrorMessage(loadError, 'Unable to load client details.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private resetState(): void {
    this.isLoading.set(false);
    this.error.set(null);
    this.client.set(null);
  }
}

function normalizeClientStatus(status: ClientDetail['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatClientStatus(status: ClientDetail['status']): string {
  switch (normalizeClientStatus(status)) {
    case 1:
      return 'Pending invite';
    case 2:
      return 'Active';
    case 3:
      return 'Inactive';
    case 4:
      return 'Suspended';
    default:
      return 'Unknown';
  }
}

function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return '—';
  }

  return parsed.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}
