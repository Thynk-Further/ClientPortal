import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ClientApiService, OnboardingStatus } from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { ButtonComponent } from '@/components/ui/button.component';
import { InputComponent } from '@/components/ui/input.component';

@Component({
  selector: 'app-client-invite-onboarding',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ReactiveFormsModule, InputComponent, ButtonComponent],
  template: `
    <main class="min-h-screen bg-muted/20 px-4 py-6 sm:px-6">
      <section class="mx-auto max-w-6xl space-y-6">
        <header class="space-y-1">
          <p class="text-sm text-muted-foreground">Dashboard &gt; Clients &gt; Invite &amp; Onboard</p>
          <h1 class="text-4xl font-bold tracking-tight">Invite &amp; Onboarding</h1>
          <p class="text-lg text-muted-foreground">
            Invite clients and track onboarding progress from one workflow.
          </p>
        </header>

        <section class="rounded-2xl border bg-card p-5 sm:p-7">
          <h2 class="text-2xl font-semibold">Invite Client</h2>
          <p class="mt-1 text-muted-foreground">
            Fill in the information below to send a secure invitation link.
          </p>

          <form class="mt-6 space-y-5" [formGroup]="inviteForm" (ngSubmit)="submitInvite()">
            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="companyName">Company Name</label>
              <ui-input id="companyName" placeholder="e.g. Acme Holdings" formControlName="companyName" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="contactName">Contact Name</label>
              <ui-input id="contactName" placeholder="e.g. Emma Wilson" formControlName="contactName" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="email">Contact Email</label>
              <ui-input id="email" type="email" placeholder="e.g. emma@example.com" formControlName="email" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="phone">Phone</label>
              <ui-input id="phone" placeholder="e.g. +27 82 000 1111" formControlName="phone" />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="notes">Notes (optional)</label>
              <textarea
                id="notes"
                rows="3"
                class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40"
                placeholder="Any extra onboarding context"
                formControlName="notes"
              ></textarea>
            </div>

            @if (inviteError() !== null) {
              <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ inviteError() }}
              </p>
            }

            <div class="flex flex-wrap gap-3">
              <ui-button
                type="submit"
                [disabled]="isInviting()"
                [label]="isInviting() ? 'Sending Invite...' : 'Send Invite'"
              />
            </div>
          </form>
        </section>

        <section class="rounded-2xl border bg-card p-5 sm:p-7">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-2xl font-semibold">Onboarding Progress</h2>
              <p class="mt-1 text-muted-foreground">
                This section uses client-portal onboarding APIs for the current authenticated client user.
              </p>
            </div>
            <ui-button
              variant="outline"
              [disabled]="isLoadingStatus()"
              [label]="isLoadingStatus() ? 'Refreshing...' : 'Refresh Status'"
              (clicked)="loadOnboardingStatus()"
            />
          </div>

          @if (onboardingStatus() !== null) {
            <div class="mt-5 rounded-lg border bg-muted/20 p-4">
              <p class="text-sm text-muted-foreground">
                Completed {{ onboardingStatus()!.completedSteps }} of {{ onboardingStatus()!.totalSteps }} steps
              </p>
              <div class="mt-2 h-2 w-full rounded-full bg-muted">
                <div
                  class="h-2 rounded-full bg-primary transition-all"
                  [style.width.%]="completionPercent()"
                ></div>
              </div>
            </div>

            <ul class="mt-4 space-y-3">
              @for (step of onboardingStatus()!.steps; track step.key) {
                <li class="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p class="font-medium">{{ step.key }}</p>
                    <p class="text-sm text-muted-foreground">
                      {{ step.isCompleted ? 'Completed' : 'Pending' }}
                    </p>
                  </div>

                  <ui-button
                    variant="outline"
                    [disabled]="step.isCompleted || completingStepKey() === step.key"
                    [label]="step.isCompleted ? 'Done' : completingStepKey() === step.key ? 'Saving...' : 'Mark Complete'"
                    (clicked)="completeStep(step.key)"
                  />
                </li>
              }
            </ul>
          } @else {
            <p class="mt-5 rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
              No onboarding status loaded yet.
            </p>
          }
        </section>
      </section>
    </main>
  `,
})
export class ClientInviteOnboardingComponent {
  private readonly formBuilder = inject(FormBuilder);
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
  protected readonly isLoadingStatus = signal(false);
  protected readonly onboardingStatus = signal<OnboardingStatus | null>(null);
  protected readonly completingStepKey = signal<string | null>(null);
  protected readonly completionPercent = computed(() => {
    const status = this.onboardingStatus();
    if (status === null || status.totalSteps === 0) {
      return 0;
    }

    return Math.round((status.completedSteps / status.totalSteps) * 100);
  });

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

  async loadOnboardingStatus(): Promise<void> {
    this.isLoadingStatus.set(true);
    try {
      const status = await firstValueFrom(this.clientApiService.getOnboardingStatus());
      this.onboardingStatus.set(status);
    } catch (error) {
      this.toast.error(readErrorMessage(error));
    } finally {
      this.isLoadingStatus.set(false);
    }
  }

  async completeStep(stepKey: string): Promise<void> {
    this.completingStepKey.set(stepKey);
    try {
      await firstValueFrom(this.clientApiService.completeOnboardingStep(stepKey));
      this.toast.success(`Step "${stepKey}" completed.`);
      await this.loadOnboardingStatus();
    } catch (error) {
      this.toast.error(readErrorMessage(error));
    } finally {
      this.completingStepKey.set(null);
    }
  }
}

function readErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return 'Request failed. Please try again.';
}
