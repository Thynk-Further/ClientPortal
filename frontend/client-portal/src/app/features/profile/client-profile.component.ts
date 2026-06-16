import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import { ClientPortalApiService } from '@/app/core/api/client-portal-api.service';
import { readHttpErrorMessage } from '@/app/core/api/api-envelope.util';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';

const PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;

const NOTIFICATION_FREQUENCY_OPTIONS = [
  { value: 1, label: 'Immediate' },
  { value: 2, label: 'Daily digest' },
  { value: 3, label: 'Off' },
] as const;

@Component({
  selector: 'app-client-profile',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    ButtonComponent,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
  ],
  template: `
    <main class="space-y-6 px-5 pb-10 sm:px-8">
      <header class="space-y-1">
        <h1 class="text-[1.75rem] font-semibold tracking-tight text-foreground">Profile</h1>
        <p class="text-sm text-muted-foreground">
          Update your contact details, password, and notification preferences.
        </p>
      </header>

      @if (successMessage() !== null) {
        <p class="rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-800 dark:text-emerald-200">
          {{ successMessage() }}
        </p>
      }

      @if (errorMessage() !== null) {
        <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {{ errorMessage() }}
        </p>
      }

      @if (isLoading()) {
        <p class="text-sm text-muted-foreground">Loading profile...</p>
      } @else {
        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Contact details</ui-card-title>
              <ui-card-description>
                Your company name and email are managed by your business team.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form class="space-y-3" [formGroup]="contactForm" (ngSubmit)="saveContactDetails()">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="companyName">
                    Company
                  </label>
                  <ui-input id="companyName" formControlName="companyName" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="contactName">
                    Contact name
                  </label>
                  <ui-input id="contactName" formControlName="contactName" autocomplete="name" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="email">Email</label>
                  <ui-input id="email" formControlName="email" type="email" />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="phone">Phone</label>
                  <ui-input
                    id="phone"
                    formControlName="phone"
                    autocomplete="tel"
                    placeholder="+27123456789"
                  />
                  <p class="text-xs text-muted-foreground">Use international format, e.g. +27123456789</p>
                </div>
                <ui-button
                  type="submit"
                  [disabled]="contactForm.invalid || isSavingContact()"
                  label="{{ isSavingContact() ? 'Saving...' : 'Save contact details' }}"
                />
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Change password</ui-card-title>
              <ui-card-description>
                Choose a strong password with at least 8 characters.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form class="space-y-3" [formGroup]="passwordForm" (ngSubmit)="changePassword()">
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="currentPassword">
                    Current password
                  </label>
                  <ui-input
                    id="currentPassword"
                    formControlName="currentPassword"
                    type="password"
                    autocomplete="current-password"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="newPassword">
                    New password
                  </label>
                  <ui-input
                    id="newPassword"
                    formControlName="newPassword"
                    type="password"
                    autocomplete="new-password"
                  />
                </div>
                <div class="space-y-1">
                  <label class="text-xs font-medium text-muted-foreground" for="confirmPassword">
                    Confirm new password
                  </label>
                  <ui-input
                    id="confirmPassword"
                    formControlName="confirmPassword"
                    type="password"
                    autocomplete="new-password"
                  />
                </div>
                <ui-button
                  type="submit"
                  [disabled]="passwordForm.invalid || isChangingPassword()"
                  label="{{ isChangingPassword() ? 'Updating...' : 'Update password' }}"
                />
              </form>
            </ui-card-content>
          </ui-card>
        </section>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Notification preferences</ui-card-title>
            <ui-card-description>
              Choose how you receive updates about invoices, documents, and messages.
            </ui-card-description>
          </ui-card-header>
          <ui-card-content>
            <form class="space-y-4" [formGroup]="notificationsForm" (ngSubmit)="saveNotificationPreferences()">
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>Email notifications</span>
                  <input type="checkbox" formControlName="emailEnabled" />
                </label>
                <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>In-app notifications</span>
                  <input type="checkbox" formControlName="inAppEnabled" />
                </label>
                <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>WhatsApp alerts</span>
                  <input type="checkbox" formControlName="whatsAppEnabled" />
                </label>
                <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                  <span>SMS alerts</span>
                  <input type="checkbox" formControlName="smsEnabled" />
                </label>
              </div>

              <div class="space-y-1">
                <label class="text-xs font-medium text-muted-foreground" for="frequency">
                  Delivery frequency
                </label>
                <select
                  id="frequency"
                  class="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  formControlName="frequency"
                >
                  @for (option of frequencyOptions; track option.value) {
                    <option [value]="option.value">{{ option.label }}</option>
                  }
                </select>
              </div>

              <ui-button
                type="submit"
                [disabled]="notificationsForm.invalid || isSavingNotifications()"
                label="{{ isSavingNotifications() ? 'Saving...' : 'Save notification preferences' }}"
              />
            </form>
          </ui-card-content>
        </ui-card>
      }
    </main>
  `,
})
export class ClientProfileComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly clientPortalApi = inject(ClientPortalApiService);
  private readonly userSession = inject(UserSessionService);

  protected readonly frequencyOptions = NOTIFICATION_FREQUENCY_OPTIONS;
  protected readonly isLoading = signal(true);
  protected readonly isSavingContact = signal(false);
  protected readonly isChangingPassword = signal(false);
  protected readonly isSavingNotifications = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly successMessage = signal<string | null>(null);

  protected readonly contactForm = this.formBuilder.nonNullable.group({
    companyName: [{ value: '', disabled: true }],
    contactName: ['', [Validators.required, Validators.maxLength(200)]],
    email: [{ value: '', disabled: true }],
    phone: ['', [Validators.required, Validators.pattern(PHONE_PATTERN)]],
  });

  protected readonly passwordForm = this.formBuilder.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.minLength(8)]],
      confirmPassword: ['', [Validators.required]],
    },
    {
      validators: (group) => {
        const newPassword = group.get('newPassword')?.value ?? '';
        const confirmPassword = group.get('confirmPassword')?.value ?? '';
        return newPassword === confirmPassword ? null : { passwordMismatch: true };
      },
    },
  );

  protected readonly notificationsForm = this.formBuilder.nonNullable.group({
    emailEnabled: [true],
    whatsAppEnabled: [false],
    smsEnabled: [false],
    inAppEnabled: [true],
    frequency: [1, [Validators.required]],
  });

  async ngOnInit(): Promise<void> {
    await this.loadProfile();
  }

  protected async saveContactDetails(): Promise<void> {
    if (this.contactForm.invalid) {
      this.contactForm.markAllAsTouched();
      return;
    }

    this.isSavingContact.set(true);
    this.clearFeedback();

    try {
      const value = this.contactForm.getRawValue();
      const profile = await firstValueFrom(
        this.clientPortalApi.updateProfile({
          contactName: value.contactName.trim(),
          phone: value.phone.trim(),
        }),
      );

      this.contactForm.patchValue({
        companyName: profile.companyName,
        contactName: profile.contactName,
        email: profile.email,
        phone: profile.phone,
      });

      this.updateSessionName(profile.contactName);
      this.successMessage.set('Contact details saved.');
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to save contact details.'));
    } finally {
      this.isSavingContact.set(false);
    }
  }

  protected async changePassword(): Promise<void> {
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }

    this.isChangingPassword.set(true);
    this.clearFeedback();

    try {
      const value = this.passwordForm.getRawValue();
      await firstValueFrom(
        this.clientPortalApi.changePassword({
          currentPassword: value.currentPassword,
          newPassword: value.newPassword,
        }),
      );

      this.passwordForm.reset({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });
      this.successMessage.set('Password updated successfully.');
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to change password.'));
    } finally {
      this.isChangingPassword.set(false);
    }
  }

  protected async saveNotificationPreferences(): Promise<void> {
    if (this.notificationsForm.invalid) {
      return;
    }

    this.isSavingNotifications.set(true);
    this.clearFeedback();

    try {
      const value = this.notificationsForm.getRawValue();
      const preferences = await firstValueFrom(
        this.clientPortalApi.updateNotificationPreferences({
          emailEnabled: value.emailEnabled,
          whatsAppEnabled: value.whatsAppEnabled,
          smsEnabled: value.smsEnabled,
          inAppEnabled: value.inAppEnabled,
          frequency: Number(value.frequency),
        }),
      );

      this.notificationsForm.patchValue({
        emailEnabled: preferences.emailEnabled,
        whatsAppEnabled: preferences.whatsAppEnabled,
        smsEnabled: preferences.smsEnabled,
        inAppEnabled: preferences.inAppEnabled,
        frequency: preferences.frequency,
      });
      this.successMessage.set('Notification preferences saved.');
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to save notification preferences.'));
    } finally {
      this.isSavingNotifications.set(false);
    }
  }

  private async loadProfile(): Promise<void> {
    this.isLoading.set(true);
    this.clearFeedback();

    try {
      const [profile, preferences] = await Promise.all([
        firstValueFrom(this.clientPortalApi.getProfile()),
        firstValueFrom(this.clientPortalApi.getNotificationPreferences()),
      ]);

      this.contactForm.patchValue({
        companyName: profile.companyName,
        contactName: profile.contactName,
        email: profile.email,
        phone: profile.phone,
      });

      this.notificationsForm.patchValue({
        emailEnabled: preferences.emailEnabled,
        whatsAppEnabled: preferences.whatsAppEnabled,
        smsEnabled: preferences.smsEnabled,
        inAppEnabled: preferences.inAppEnabled,
        frequency: preferences.frequency,
      });
    } catch (error) {
      this.errorMessage.set(readHttpErrorMessage(error, 'Failed to load profile.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private updateSessionName(fullName: string): void {
    const user = this.userSession.getUser();
    if (user === null) {
      return;
    }

    this.userSession.setUser({ ...user, fullName });
  }

  private clearFeedback(): void {
    this.errorMessage.set(null);
    this.successMessage.set(null);
  }
}
