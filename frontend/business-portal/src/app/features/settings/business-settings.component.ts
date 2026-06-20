import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

import {
  TeamMember,
  TenantSettingsApiService,
} from '@/app/core/api/services/tenant-settings-api.service';
import { applyTenantCssVariables, uploadTenantLogo } from '@/app/core/branding/tenant-branding.util';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { FilePickerComponent } from '@/components/ui/file-picker.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';

const TEAM_ROLES = ['Owner', 'Admin', 'Staff'] as const;

@Component({
  selector: 'app-business-settings',
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
    FilePickerComponent,
    InputComponent,
    TextareaComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Settings</h1>
          <p class="text-sm text-muted-foreground">
            Manage branding, team members, company notification channels, and tax configuration.
          </p>
        </header>

        @if (isLoading()) {
          <p class="text-sm text-muted-foreground">Loading settings...</p>
        } @else {
          <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ui-card>
              <ui-card-header>
                <ui-card-title>Branding</ui-card-title>
                <ui-card-description>
                  Upload logo and configure primary color for portal identity.
                </ui-card-description>
              </ui-card-header>
              <ui-card-content>
                @if (currentLogoUrl()) {
                  <div class="mb-3">
                    <img
                      [src]="currentLogoUrl()!"
                      alt="Current company logo"
                      class="h-12 max-w-[12rem] object-contain"
                    />
                  </div>
                }
                <form [formGroup]="brandingForm" class="space-y-3" (ngSubmit)="onSaveBranding()">
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Company Logo</label>
                    <ui-file-picker formControlName="logoFile" accept=".png,.jpg,.jpeg,.svg" />
                  </div>
                  <div class="space-y-1">
                    <label class="text-xs text-muted-foreground">Primary Colour</label>
                    <input
                      type="color"
                      class="h-10 w-20 rounded-md border border-input bg-background p-1"
                      formControlName="primaryColor"
                    />
                  </div>
                  <ui-button
                    label="Save Branding"
                    type="submit"
                    [disabled]="isSavingBranding()"
                  />
                </form>
              </ui-card-content>
            </ui-card>

            <ui-card>
              <ui-card-header>
                <ui-card-title>Team Members</ui-card-title>
                <ui-card-description>
                  Invite internal members and assign roles.
                </ui-card-description>
              </ui-card-header>
              <ui-card-content>
                <div class="space-y-3">
                  @for (member of teamMembers(); track member.id) {
                    <article class="rounded-lg border p-3">
                      <div class="flex items-center justify-between gap-2">
                        <div>
                          <p class="text-sm font-medium">{{ member.fullName }}</p>
                          <p class="text-xs text-muted-foreground">{{ member.email }}</p>
                        </div>
                        <span class="rounded-full border px-2 py-0.5 text-xs">{{ member.role }}</span>
                      </div>
                      @if (member.isActive) {
                        <div class="mt-2">
                          <ui-button
                            variant="outline"
                            label="Remove"
                            [disabled]="isTeamActionPending()"
                            (clicked)="removeTeamMember(member)"
                          />
                        </div>
                      }
                    </article>
                  }
                </div>

                <form [formGroup]="teamForm" class="mt-4 space-y-3" (ngSubmit)="onAddTeamMember()">
                  <ui-input formControlName="fullName" placeholder="Member name" />
                  <ui-input formControlName="email" type="email" placeholder="member@company.com" />
                  <select
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    formControlName="role"
                  >
                    @for (role of teamRoles; track role) {
                      <option [value]="role">{{ role }}</option>
                    }
                  </select>
                  <ui-button
                    type="submit"
                    label="Invite Team Member"
                    [disabled]="isTeamActionPending()"
                  />
                </form>
              </ui-card-content>
            </ui-card>
          </section>

          <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
            <ui-card id="notification-preferences">
              <ui-card-header>
                <ui-card-title>Company Notification Channels</ui-card-title>
                <ui-card-description>
                  Tenant-wide channels used for operational updates.
                </ui-card-description>
              </ui-card-header>
              <ui-card-content>
                <form [formGroup]="notificationsForm" class="space-y-2" (ngSubmit)="onSaveNotificationPrefs()">
                  <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>Email alerts</span>
                    <input type="checkbox" formControlName="emailEnabled" />
                  </label>
                  <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>In-app alerts</span>
                    <input type="checkbox" formControlName="inAppEnabled" />
                  </label>
                  <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>SMS critical alerts</span>
                    <input type="checkbox" formControlName="smsEnabled" />
                  </label>
                  <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>Weekly digest</span>
                    <input type="checkbox" formControlName="weeklyDigestEnabled" />
                  </label>
                  <ui-button
                    label="Save Channels"
                    type="submit"
                    [disabled]="isSavingNotifications()"
                  />
                </form>
              </ui-card-content>
            </ui-card>

            <ui-card>
              <ui-card-header>
                <ui-card-title>Tax Configuration</ui-card-title>
                <ui-card-description>
                  Set tax rules and default rates used in quotations and billing.
                </ui-card-description>
              </ui-card-header>
              <ui-card-content>
                <form [formGroup]="taxForm" class="space-y-3" (ngSubmit)="onSaveTaxConfig()">
                  <ui-input formControlName="taxLabel" placeholder="VAT" />
                  <ui-input formControlName="taxPercentage" type="number" placeholder="15" />
                  <ui-input formControlName="taxRegistrationNumber" placeholder="TX-123456789" />
                  <ui-input formControlName="countryCode" placeholder="Country code (e.g. ZA)" />
                  <select
                    class="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    formControlName="pricingMode"
                  >
                    <option value="Exclusive">Tax-exclusive pricing</option>
                    <option value="Inclusive">Tax-inclusive pricing</option>
                  </select>
                  <ui-textarea
                    formControlName="taxNotes"
                    [rows]="3"
                    placeholder="Additional jurisdiction notes"
                  />
                  <ui-button
                    label="Save Tax Configuration"
                    type="submit"
                    [disabled]="isSavingTax()"
                  />
                </form>
              </ui-card-content>
            </ui-card>
          </section>
        }
      </section>
    </main>
  `,
})
export class BusinessSettingsComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly settingsApi = inject(TenantSettingsApiService);

  protected readonly teamRoles = TEAM_ROLES;
  protected readonly isLoading = signal(true);
  protected readonly isSavingBranding = signal(false);
  protected readonly isSavingTax = signal(false);
  protected readonly isSavingNotifications = signal(false);
  protected readonly isTeamActionPending = signal(false);
  protected readonly currentLogoUrl = signal<string | null>(null);
  protected readonly teamMembers = signal<ReadonlyArray<TeamMember>>([]);

  protected readonly brandingForm = this.formBuilder.nonNullable.group({
    logoFile: [null as File | null],
    primaryColor: ['#2563eb', [Validators.required]],
  });

  protected readonly teamForm = this.formBuilder.nonNullable.group({
    fullName: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['Staff', [Validators.required]],
  });

  protected readonly notificationsForm = this.formBuilder.nonNullable.group({
    emailEnabled: [true],
    inAppEnabled: [true],
    smsEnabled: [false],
    weeklyDigestEnabled: [true],
  });

  protected readonly taxForm = this.formBuilder.nonNullable.group({
    taxLabel: ['VAT', [Validators.required]],
    taxPercentage: [15, [Validators.required, Validators.min(0), Validators.max(100)]],
    taxRegistrationNumber: ['', [Validators.required]],
    countryCode: [''],
    pricingMode: ['Exclusive', [Validators.required]],
    taxNotes: [''],
  });

  async ngOnInit(): Promise<void> {
    await this.loadSettings();
  }

  protected async onSaveBranding(): Promise<void> {
    if (this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }

    this.isSavingBranding.set(true);
    try {
      const raw = this.brandingForm.getRawValue();
      let logoUrl = this.currentLogoUrl();

      if (raw.logoFile) {
        logoUrl = await uploadTenantLogo(raw.logoFile, async (file) => {
          const result = await firstValueFrom(
            this.settingsApi.getLogoUploadUrl(file.name, file.type || 'application/octet-stream'),
          );
          return { uploadUrl: result.uploadUrl, logoUrl: result.logoUrl };
        });
      }

      const result = await firstValueFrom(
        this.settingsApi.updateBranding({
          brandColour: raw.primaryColor,
          logoUrl,
        }),
      );

      this.currentLogoUrl.set(result.logoUrl);
      applyTenantCssVariables(result.brandColour);
      this.brandingForm.patchValue({ logoFile: null });
      this.toast.success('Branding settings saved.');
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to save branding settings.'));
    } finally {
      this.isSavingBranding.set(false);
    }
  }

  protected async onAddTeamMember(): Promise<void> {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const value = this.teamForm.getRawValue();
    this.isTeamActionPending.set(true);
    try {
      await firstValueFrom(
        this.settingsApi.inviteTeamMember({
          fullName: value.fullName.trim(),
          email: value.email.trim(),
          role: value.role,
        }),
      );
      this.teamForm.reset({ fullName: '', email: '', role: 'Staff' });
      await this.loadTeamMembers();
      this.toast.success('Invitation sent to team member.');
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to invite team member.'));
    } finally {
      this.isTeamActionPending.set(false);
    }
  }

  protected async removeTeamMember(member: TeamMember): Promise<void> {
    this.isTeamActionPending.set(true);
    try {
      await firstValueFrom(this.settingsApi.deactivateTeamMember(member.id));
      await this.loadTeamMembers();
      this.toast.info('Team member deactivated.');
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to remove team member.'));
    } finally {
      this.isTeamActionPending.set(false);
    }
  }

  protected async onSaveNotificationPrefs(): Promise<void> {
    if (this.notificationsForm.invalid) {
      return;
    }

    this.isSavingNotifications.set(true);
    try {
      await firstValueFrom(this.settingsApi.updateNotifications(this.notificationsForm.getRawValue()));
      this.toast.success('Notification channels saved.');
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to save notification channels.'));
    } finally {
      this.isSavingNotifications.set(false);
    }
  }

  protected async onSaveTaxConfig(): Promise<void> {
    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      return;
    }

    const raw = this.taxForm.getRawValue();
    this.isSavingTax.set(true);
    try {
      await firstValueFrom(
        this.settingsApi.updateTax({
          label: raw.taxLabel,
          taxPercentage: Number(raw.taxPercentage),
          registrationNumber: raw.taxRegistrationNumber,
          notes: raw.taxNotes,
          countryCode: raw.countryCode,
          pricingMode: raw.pricingMode,
        }),
      );
      this.toast.success('Tax configuration saved.');
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to save tax configuration.'));
    } finally {
      this.isSavingTax.set(false);
    }
  }

  private async loadSettings(): Promise<void> {
    this.isLoading.set(true);
    try {
      const settings = await firstValueFrom(this.settingsApi.getSettings());
      this.currentLogoUrl.set(settings.logoUrl);
      this.brandingForm.patchValue({ primaryColor: settings.brandColour });
      applyTenantCssVariables(settings.brandColour);

      this.taxForm.patchValue({
        taxLabel: settings.tax.label,
        taxPercentage: settings.tax.taxPercentage,
        taxRegistrationNumber: settings.tax.registrationNumber,
        countryCode: settings.tax.countryCode,
        pricingMode: settings.tax.pricingMode,
        taxNotes: settings.tax.notes,
      });

      this.notificationsForm.patchValue({
        emailEnabled: settings.notifications.emailEnabled,
        inAppEnabled: settings.notifications.inAppEnabled,
        smsEnabled: settings.notifications.smsEnabled,
        weeklyDigestEnabled: settings.notifications.weeklyDigestEnabled,
      });

      await this.loadTeamMembers();
    } catch (error) {
      this.toast.error(readErrorMessage(error, 'Unable to load settings.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async loadTeamMembers(): Promise<void> {
    const members = await firstValueFrom(this.settingsApi.listTeamMembers());
    this.teamMembers.set(members);
  }
}

function readErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim() !== '') {
    return error.message;
  }

  return fallback;
}
