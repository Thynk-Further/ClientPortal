import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

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
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

interface TeamMember {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly role: string;
}

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
            Manage branding, team members, notification preferences, and tax configuration.
          </p>
        </header>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Branding</ui-card-title>
              <ui-card-description>
                Upload logo and configure primary color for portal identity.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
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
                <ui-button label="Save Branding" type="submit" />
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Team Members</ui-card-title>
              <ui-card-description>
                Maintain internal members with role assignment.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <div class="space-y-3">
                @for (member of teamMembers(); track member.id) {
                  <article class="rounded-lg border p-3">
                    <div class="flex items-center justify-between gap-2">
                      <div>
                        <p class="text-sm font-medium">{{ member.name }}</p>
                        <p class="text-xs text-muted-foreground">{{ member.email }}</p>
                      </div>
                      <span class="rounded-full border px-2 py-0.5 text-xs">{{ member.role }}</span>
                    </div>
                    <div class="mt-2">
                      <ui-button
                        variant="outline"
                        label="Remove"
                        (clicked)="removeTeamMember(member.id)"
                      />
                    </div>
                  </article>
                }
              </div>

              <form [formGroup]="teamForm" class="mt-4 space-y-3" (ngSubmit)="onAddTeamMember()">
                <ui-input formControlName="name" placeholder="Member name" />
                <ui-input formControlName="email" type="email" placeholder="member@company.com" />
                <ui-input formControlName="role" placeholder="Role (e.g. Admin)" />
                <ui-button type="submit" label="Add Team Member" />
              </form>
            </ui-card-content>
          </ui-card>
        </section>

        <section class="grid grid-cols-1 gap-6 xl:grid-cols-2">
          <ui-card>
            <ui-card-header>
              <ui-card-title>Notification Preferences</ui-card-title>
              <ui-card-description>
                Select channels for operational updates.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="notificationsForm" class="space-y-2" (ngSubmit)="onSaveNotificationPrefs()">
                @for (control of notificationControls.controls; track $index) {
                  <label class="flex items-center justify-between rounded-lg border p-3 text-sm">
                    <span>{{ control.controls.label.value }}</span>
                    <input type="checkbox" [formControl]="control.controls.enabled" />
                  </label>
                }
                <ui-button label="Save Preferences" type="submit" />
              </form>
            </ui-card-content>
          </ui-card>

          <ui-card>
            <ui-card-header>
              <ui-card-title>Tax Configuration</ui-card-title>
              <ui-card-description>
                Set tax rules and default rates used in billing workflows.
              </ui-card-description>
            </ui-card-header>
            <ui-card-content>
              <form [formGroup]="taxForm" class="space-y-3" (ngSubmit)="onSaveTaxConfig()">
                <ui-input formControlName="taxLabel" placeholder="VAT" />
                <ui-input formControlName="taxPercentage" type="number" placeholder="15" />
                <ui-input formControlName="taxRegistrationNumber" placeholder="TX-123456789" />
                <ui-textarea
                  formControlName="taxNotes"
                  [rows]="3"
                  placeholder="Additional jurisdiction notes"
                />
                <ui-button label="Save Tax Configuration" type="submit" />
              </form>
            </ui-card-content>
          </ui-card>
        </section>
      </section>
    </main>
  `,
})
export class BusinessSettingsComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly brandingForm = this.formBuilder.nonNullable.group({
    logoFile: [null as File | null],
    primaryColor: ['#2563eb', [Validators.required]],
  });

  protected readonly teamForm = this.formBuilder.nonNullable.group({
    name: ['', [Validators.required]],
    email: ['', [Validators.required, Validators.email]],
    role: ['', [Validators.required]],
  });

  protected readonly notificationsForm = this.formBuilder.nonNullable.group({
    channels: this.formBuilder.array([
      this.createNotificationChannel('Email alerts', true),
      this.createNotificationChannel('In-app alerts', true),
      this.createNotificationChannel('SMS critical alerts', false),
      this.createNotificationChannel('Weekly digest', true),
    ]),
  });

  protected readonly taxForm = this.formBuilder.nonNullable.group({
    taxLabel: ['VAT', [Validators.required]],
    taxPercentage: [15, [Validators.required, Validators.min(0), Validators.max(100)]],
    taxRegistrationNumber: ['', [Validators.required]],
    taxNotes: [''],
  });

  protected readonly teamMembers = signal<ReadonlyArray<TeamMember>>([
    {
      id: 'member-001',
      name: 'Amina S.',
      email: 'amina@clientportal.local',
      role: 'Owner',
    },
    {
      id: 'member-002',
      name: 'Kai N.',
      email: 'kai@clientportal.local',
      role: 'Operations Manager',
    },
  ]);

  protected get notificationControls(): FormArray<
    ReturnType<BusinessSettingsComponent['createNotificationChannel']>
  > {
    return this.notificationsForm.controls.channels;
  }

  protected onSaveBranding(): void {
    if (this.brandingForm.invalid) {
      this.brandingForm.markAllAsTouched();
      return;
    }

    this.toast.success('Branding settings saved.');
  }

  protected onAddTeamMember(): void {
    if (this.teamForm.invalid) {
      this.teamForm.markAllAsTouched();
      return;
    }

    const value = this.teamForm.getRawValue();
    const newMember: TeamMember = {
      id: `member-${Date.now()}`,
      name: value.name.trim(),
      email: value.email.trim(),
      role: value.role.trim(),
    };

    this.teamMembers.update((current) => [...current, newMember]);
    this.teamForm.reset({ name: '', email: '', role: '' });
    this.toast.success('Team member added.');
  }

  protected removeTeamMember(memberId: string): void {
    this.teamMembers.update((current) =>
      current.filter((member) => member.id !== memberId),
    );
    this.toast.info('Team member removed.');
  }

  protected onSaveNotificationPrefs(): void {
    if (this.notificationsForm.invalid) {
      return;
    }

    this.toast.success('Notification preferences saved.');
  }

  protected onSaveTaxConfig(): void {
    if (this.taxForm.invalid) {
      this.taxForm.markAllAsTouched();
      return;
    }

    this.toast.success('Tax configuration saved.');
  }

  private createNotificationChannel(label: string, enabled: boolean) {
    return this.formBuilder.nonNullable.group({
      label: [label, [Validators.required]],
      enabled: [enabled],
    });
  }
}
