import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { AuthApiService } from '@/app/core/api/auth-api.service';
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

@Component({
  selector: 'app-accept-invitation-screen',
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
  ],
  template: `
    <main class="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
      <ui-card class="mx-auto w-full max-w-md">
        <ui-card-header>
          <ui-card-title class="text-xl">Accept invitation</ui-card-title>
          <ui-card-description>
            Set your password to activate your client portal account.
          </ui-card-description>
        </ui-card-header>

        <ui-card-content>
          <form [formGroup]="form" class="space-y-4" (ngSubmit)="submit()">
            @if (tokenMissing() || tenantMissing()) {
              <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                @if (tokenMissing()) {
                  Invitation token is missing from this link.
                } @else {
                  Tenant information is missing from this link. Please use the link from your invitation email.
                }
              </p>
            }

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="password">New password</label>
              <ui-input
                id="password"
                type="password"
                placeholder="Create a strong password"
                formControlName="password"
              />
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="confirmPassword">Confirm password</label>
              <ui-input
                id="confirmPassword"
                type="password"
                placeholder="Re-enter your password"
                formControlName="confirmPassword"
              />
            </div>

            @if (passwordMismatch()) {
              <p class="text-sm text-destructive">Passwords do not match.</p>
            }

            @if (errorMessage() !== null) {
              <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ errorMessage() }}
              </p>
            }

            <ui-button
              class="w-full"
              type="submit"
              [disabled]="isSubmitting() || tokenMissing() || tenantMissing()"
              [label]="isSubmitting() ? 'Activating account...' : 'Activate account'"
            />
          </form>

          <p class="mt-4 text-center text-sm text-muted-foreground">
            Already activated?
            <a routerLink="/auth" class="text-primary underline-offset-4 hover:underline">
              Sign in
            </a>
          </p>
        </ui-card-content>
      </ui-card>
    </main>
  `,
})
export class AcceptInvitationScreenComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApiService = inject(AuthApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  private readonly token = this.route.snapshot.queryParamMap.get('token')?.trim() ?? '';
  private readonly tenantSlug = this.route.snapshot.queryParamMap.get('tenant')?.trim() ?? '';

  protected readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', [Validators.required]],
  });

  protected readonly isSubmitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly tokenMissing = computed(() => this.token === '');
  protected readonly tenantMissing = computed(() => this.tenantSlug === '');
  protected readonly passwordMismatch = computed(() => {
    const { password, confirmPassword } = this.form.getRawValue();
    return confirmPassword !== '' && password !== confirmPassword;
  });

  async submit(): Promise<void> {
    if (this.tokenMissing() || this.tenantMissing()) {
      return;
    }

    if (this.form.invalid || this.passwordMismatch()) {
      this.form.markAllAsTouched();
      return;
    }

    this.isSubmitting.set(true);
    this.errorMessage.set(null);

    try {
      await firstValueFrom(
        this.authApiService.acceptInvitation({
          token: this.token,
          password: this.form.controls.password.value,
          tenantSlug: this.tenantSlug,
        }),
      );
      await this.router.navigate(['/auth'], {
        queryParams: { activated: '1', email: this.route.snapshot.queryParamMap.get('email') ?? undefined },
      });
    } catch (error) {
      this.errorMessage.set(readErrorMessage(error));
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

function readErrorMessage(error: unknown): string {
  return readHttpErrorMessage(error, 'Unable to accept invitation.');
}
