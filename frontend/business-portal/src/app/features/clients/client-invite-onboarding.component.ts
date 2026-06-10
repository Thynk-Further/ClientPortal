import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ClientApiService } from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { InputComponent } from '@/components/ui/input.component';

@Component({
  selector: 'app-client-invite-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputComponent],
  template: `
    <div class="px-5 pb-8 sm:px-8">
      <header class="space-y-1 pb-6">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Invite &amp; Onboarding</h1>
        <p class="text-sm text-muted-foreground">
          Invite clients and send a secure onboarding invitation link.
        </p>
      </header>

      <section class="rounded-2xl border border-border/70 bg-card p-6 shadow-sm sm:p-8">
        <div class="space-y-1">
          <h2 class="text-base font-semibold text-foreground">Invite Client</h2>
          <p class="text-sm text-muted-foreground">
            Fill in the information below to send a secure invitation link.
          </p>
        </div>

        <form class="mt-6 w-full space-y-5" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="companyName">Company Name</label>
            <ui-input
              id="companyName"
              class="h-10 rounded-lg"
              placeholder="e.g. Acme Holdings"
              formControlName="companyName"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="contactName">Contact Name</label>
            <ui-input
              id="contactName"
              class="h-10 rounded-lg"
              placeholder="e.g. Emma Wilson"
              formControlName="contactName"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="email">Contact Email</label>
            <ui-input
              id="email"
              type="email"
              class="h-10 rounded-lg"
              placeholder="e.g. emma@example.com"
              formControlName="email"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="phone">Phone</label>
            <ui-input
              id="phone"
              class="h-10 rounded-lg"
              placeholder="e.g. +27 82 000 1111"
              formControlName="phone"
            />
          </div>

          <div class="space-y-1.5">
            <label class="text-sm font-medium text-foreground" for="notes">Notes (optional)</label>
            <textarea
              id="notes"
              rows="3"
              class="w-full rounded-lg border border-input bg-background px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              placeholder="Any extra onboarding context"
              formControlName="notes"
            ></textarea>
          </div>

          @if (inviteError() !== null) {
            <p class="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {{ inviteError() }}
            </p>
          }

          <div class="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="submit"
              class="inline-flex h-9 items-center justify-center rounded-lg bg-foreground px-4 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="isInviting()"
            >
              {{ isInviting() ? 'Sending Invite...' : 'Send Invite' }}
            </button>

            <button
              type="button"
              class="inline-flex h-9 items-center justify-center rounded-lg border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
              [disabled]="isInviting()"
              (click)="onCancel()"
            >
              Cancel
            </button>
          </div>
        </form>
      </section>
    </div>
  `,
})
export class ClientInviteOnboardingComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly clientApiService = inject(ClientApiService);
  private readonly clientStore = inject(ClientStore);
  private readonly toast = inject(ToastNotificationService);

  protected readonly inviteForm = this.formBuilder.nonNullable.group({
    companyName: ['', [Validators.required, Validators.maxLength(200)]],
    contactName: ['', [Validators.required, Validators.maxLength(200)]],
    email: ['', [Validators.required, Validators.email]],
    phone: ['', [Validators.required, Validators.maxLength(40)]],
    notes: ['', [Validators.maxLength(1000)]],
  });

  protected readonly isInviting = signal(false);
  protected readonly inviteError = signal<string | null>(null);

  protected onCancel(): void {
    this.inviteForm.reset({
      companyName: '',
      contactName: '',
      email: '',
      phone: '',
      notes: '',
    });
    this.inviteError.set(null);
    void this.router.navigate(['/clients']);
  }

  async submitInvite(): Promise<void> {
    if (this.inviteForm.invalid) {
      this.inviteForm.markAllAsTouched();
      return;
    }

    this.isInviting.set(true);
    this.inviteError.set(null);

    try {
      const value = this.inviteForm.getRawValue();
      await firstValueFrom(
        this.clientApiService.inviteClient({
          companyName: value.companyName.trim(),
          contactName: value.contactName.trim(),
          email: value.email.trim(),
          phone: value.phone.trim(),
          notes: value.notes.trim() === '' ? undefined : value.notes.trim(),
        }),
      );
      this.toast.success('Invitation sent successfully.');
      await this.clientStore.loadClients({ page: 1, pageSize: 1 });
      this.inviteForm.reset({
        companyName: '',
        contactName: '',
        email: '',
        phone: '',
        notes: '',
      });
    } catch (error) {
      this.inviteError.set(readErrorMessage(error));
    } finally {
      this.isInviting.set(false);
    }
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return 'Request failed. Please try again.';
}
