import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardFooterComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';
import {
  ApiEnvelope,
  AuthApiService,
  RegisterBusinessRequest,
  RegisterBusinessResult,
} from '@/app/core/api/services/auth-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

function passwordsMatchValidator(group: AbstractControl): ValidationErrors | null {
  const password = group.get('ownerPassword')?.value as string | undefined;
  const confirm = group.get('confirmPassword')?.value as string | undefined;
  if (password === undefined || confirm === undefined) {
    return null;
  }
  return password === confirm ? null : { passwordsMismatch: true };
}

@Component({
  selector: 'app-register-screen',
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
    CardFooterComponent,
    InputComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 px-4 py-8 sm:px-6">
      <ui-card class="mx-auto w-full max-w-md">
        <ui-card-header>
          <ui-card-title class="text-xl">Create business account</ui-card-title>
          <ui-card-description>
            Register your company to access the business portal. A tenant URL slug is created from your
            company name. You will sign in as the owner.
          </ui-card-description>
        </ui-card-header>

        <ui-card-content>
          <form [formGroup]="form" class="space-y-4" (ngSubmit)="onSubmit()">
            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="companyName">Company name</label>
              <ui-input
                id="companyName"
                type="text"
                placeholder="Acme Consulting"
                formControlName="companyName"
                maxlength="256"
                [class]="companyNameInvalid() ? 'border-destructive' : ''"
              />
              @if (companyNameInvalid()) {
                <p class="text-sm text-destructive">Company name is required.</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="companyDomain">Company domain</label>
              <ui-input
                id="companyDomain"
                type="text"
                placeholder="acme.com"
                formControlName="companyDomain"
                maxlength="256"
                [class]="companyDomainInvalid() ? 'border-destructive' : ''"
              />
              @if (companyDomainInvalid()) {
                <p class="text-sm text-destructive">Company domain is required.</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="ownerFullName">Your full name</label>
              <ui-input
                id="ownerFullName"
                type="text"
                placeholder="Jordan Lee"
                formControlName="ownerFullName"
                maxlength="200"
                [class]="ownerFullNameInvalid() ? 'border-destructive' : ''"
              />
              @if (ownerFullNameInvalid()) {
                <p class="text-sm text-destructive">Full name is required.</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="ownerEmail">Owner email</label>
              <ui-input
                id="ownerEmail"
                type="email"
                placeholder="you@company.com"
                formControlName="ownerEmail"
                [class]="ownerEmailInvalid() ? 'border-destructive' : ''"
              />
              @if (ownerEmailInvalid()) {
                <p class="text-sm text-destructive">Enter a valid email address.</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="ownerPassword">Password</label>
              <ui-input
                id="ownerPassword"
                type="password"
                placeholder="At least 8 characters"
                formControlName="ownerPassword"
                maxlength="128"
                [class]="ownerPasswordInvalid() ? 'border-destructive' : ''"
              />
              @if (ownerPasswordInvalid()) {
                <p class="text-sm text-destructive">
                  Password must be at least 8 characters.
                </p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="confirmPassword">Confirm password</label>
              <ui-input
                id="confirmPassword"
                type="password"
                placeholder="Repeat password"
                formControlName="confirmPassword"
                maxlength="128"
                [class]="confirmPasswordHasError() ? 'border-destructive' : ''"
              />
              @if (confirmPasswordRequiredInvalid()) {
                <p class="text-sm text-destructive">Confirm your password.</p>
              } @else if (confirmPasswordMismatch()) {
                <p class="text-sm text-destructive">Passwords must match.</p>
              }
            </div>

            @if (submitError() !== null) {
              <p
                class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
                role="alert"
              >
                {{ submitError() }}
              </p>
            }

            <ui-button
              class="w-full"
              type="submit"
              [disabled]="isSubmitting()"
              [label]="isSubmitting() ? 'Creating account...' : 'Create account'"
            />
          </form>
        </ui-card-content>

        <ui-card-footer class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-xs text-muted-foreground">
            Already have an account?
            <a routerLink="/auth" class="text-primary underline-offset-4 hover:underline">
              Sign in
            </a>
          </p>
        </ui-card-footer>
      </ui-card>
    </main>
  `,
})
export class RegisterScreenComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authApi = inject(AuthApiService);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastNotificationService);

  readonly isSubmitting = signal(false);
  readonly submitError = signal<string | null>(null);

  readonly form = this.formBuilder.nonNullable.group(
    {
      companyName: ['', [Validators.required, Validators.maxLength(256)]],
      companyDomain: ['', [Validators.required, Validators.maxLength(256)]],
      ownerFullName: ['', [Validators.required, Validators.maxLength(200)]],
      ownerEmail: ['', [Validators.required, Validators.email]],
      ownerPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordsMatchValidator },
  );

  readonly companyNameInvalid = computed(
    () =>
      this.form.controls.companyName.invalid &&
      (this.form.controls.companyName.dirty ||
        this.form.controls.companyName.touched),
  );

  readonly companyDomainInvalid = computed(
    () =>
      this.form.controls.companyDomain.invalid &&
      (this.form.controls.companyDomain.dirty ||
        this.form.controls.companyDomain.touched),
  );

  readonly ownerFullNameInvalid = computed(
    () =>
      this.form.controls.ownerFullName.invalid &&
      (this.form.controls.ownerFullName.dirty ||
        this.form.controls.ownerFullName.touched),
  );

  readonly ownerEmailInvalid = computed(
    () =>
      this.form.controls.ownerEmail.invalid &&
      (this.form.controls.ownerEmail.dirty || this.form.controls.ownerEmail.touched),
  );

  readonly ownerPasswordInvalid = computed(
    () =>
      this.form.controls.ownerPassword.invalid &&
      (this.form.controls.ownerPassword.dirty ||
        this.form.controls.ownerPassword.touched),
  );

  readonly confirmPasswordHasError = computed(() => {
    const confirm = this.form.controls.confirmPassword;
    return (
      (confirm.invalid &&
        (confirm.dirty || confirm.touched || this.form.touched)) ||
      this.confirmPasswordMismatch()
    );
  });

  readonly confirmPasswordRequiredInvalid = computed(() => {
    const confirm = this.form.controls.confirmPassword;
    return (
      confirm.hasError('required') &&
      (confirm.dirty || confirm.touched || this.form.touched)
    );
  });

  readonly confirmPasswordMismatch = computed(() => {
    const confirm = this.form.controls.confirmPassword;
    return (
      this.form.hasError('passwordsMismatch') &&
      confirm.value !== '' &&
      (confirm.dirty || confirm.touched || this.form.touched)
    );
  });

  async onSubmit(): Promise<void> {
    this.submitError.set(null);

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const request: RegisterBusinessRequest = {
      companyName: raw.companyName.trim(),
      companyDomain: raw.companyDomain.trim(),
      ownerFullName: raw.ownerFullName.trim(),
      ownerEmail: raw.ownerEmail.trim(),
      ownerPassword: raw.ownerPassword,
    };

    this.isSubmitting.set(true);
    try {
      const response = await firstValueFrom(this.authApi.register(request));
      if (response.success && response.data !== null) {
        const slug = response.data.tenantSlug;
        this.toast.success('Business registered. Sign in with your owner email.');
        await this.router.navigate(['/auth'], {
          queryParams: { registered: '1', tenant: slug },
        });
        return;
      }

      const message = formatEnvelopeErrors(response);
      this.submitError.set(message ?? 'Registration could not be completed.');
    } catch (error: unknown) {
      const message = formatHttpError(error);
      this.submitError.set(message);
    } finally {
      this.isSubmitting.set(false);
    }
  }
}

function formatEnvelopeErrors(
  envelope: ApiEnvelope<RegisterBusinessResult>,
): string | null {
  if (!envelope.errors?.length) {
    return null;
  }
  return envelope.errors.map((e) => e.message).filter(Boolean).join(' ');
}

function formatHttpError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    const body = error.error;
    if (typeof body === 'object' && body !== null && 'errors' in body) {
      const errors = (body as { errors?: Array<{ message?: string }> }).errors;
      if (Array.isArray(errors) && errors.length > 0) {
        return errors.map((e) => e.message).join(' ');
      }
    }
    if (error.status === 0) {
      return 'Network error. Check your connection and try again.';
    }
  }
  return 'Registration failed. Please try again.';
}
