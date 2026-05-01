import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

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
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { AuthStore } from '@/app/core/stores/auth.store';

@Component({
  selector: 'app-login-screen',
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
          <ui-card-title class="text-xl">Sign in</ui-card-title>
          <ui-card-description>
            Access the business portal with your account credentials.
          </ui-card-description>
        </ui-card-header>

        <ui-card-content>
          <form [formGroup]="form" class="space-y-4" (ngSubmit)="onSubmit()">
            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="email">Email</label>
              <ui-input
                id="email"
                type="email"
                placeholder="name@company.com"
                formControlName="email"
                [class]="emailInvalid() ? 'border-destructive' : ''"
              />
              @if (emailInvalid()) {
                <p class="text-sm text-destructive">Enter a valid email address.</p>
              }
            </div>

            <div class="space-y-1.5">
              <label class="text-sm font-medium" for="password">Password</label>
              <ui-input
                id="password"
                type="password"
                placeholder="Enter your password"
                formControlName="password"
                [class]="passwordInvalid() ? 'border-destructive' : ''"
              />
              @if (passwordInvalid()) {
                <p class="text-sm text-destructive">Password is required.</p>
              }
            </div>

            <div class="flex items-center justify-between gap-3">
              <label class="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  class="h-4 w-4 rounded border-input text-primary focus-visible:ring-[3px] focus-visible:ring-ring/40"
                  formControlName="rememberMe"
                />
                Remember me
              </label>

              <a
                routerLink="/auth/forgot-password"
                class="text-sm text-primary underline-offset-4 hover:underline"
              >
                Forgot password?
              </a>
            </div>

            @if (authError() !== null) {
              <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ authError() }}
              </p>
            }

            <ui-button
              class="w-full"
              type="submit"
              [disabled]="isSubmitting()"
              [label]="isSubmitting() ? 'Signing in...' : 'Sign in'"
            />
          </form>
        </ui-card-content>

        <ui-card-footer>
          <p class="text-xs text-muted-foreground">
            Protected by secure authentication and tenant isolation controls.
          </p>
        </ui-card-footer>
      </ui-card>
    </main>
  `,
})
export class LoginScreenComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly toast = inject(ToastNotificationService);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
    rememberMe: [false],
  });

  readonly isSubmitting = computed(() => this.authStore.isLoading());
  readonly authError = computed(() => this.authStore.error());
  readonly emailInvalid = computed(
    () =>
      this.form.controls.email.invalid &&
      (this.form.controls.email.dirty || this.form.controls.email.touched),
  );
  readonly passwordInvalid = computed(
    () =>
      this.form.controls.password.invalid &&
      (this.form.controls.password.dirty || this.form.controls.password.touched),
  );

  constructor() {
    this.authStore.hydrateSession();
    if (this.authStore.isAuthenticated()) {
      void this.router.navigate(['/dashboard']);
    }
  }

  async onSubmit(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const request = this.form.getRawValue();
    await this.authStore.login(request);

    if (!this.authStore.isAuthenticated()) {
      return;
    }

    this.toast.success('Signed in successfully.');
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    const safeReturnUrl =
      returnUrl !== null && returnUrl.startsWith('/') ? returnUrl : '/dashboard';
    await this.router.navigateByUrl(safeReturnUrl);
  }
}
