import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { DatePickerComponent } from '@/components/ui/date-picker.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { InvoiceStore } from '@/app/core/stores/invoice.store';

type WizardStep = 1 | 2 | 3;

@Component({
  selector: 'app-create-invoice-wizard',
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
    DatePickerComponent,
    TextareaComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-4xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Create Invoice Wizard</h1>
          <p class="text-sm text-muted-foreground">
            Complete billing setup in 3 steps: parties, timeline, and line item details.
          </p>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Step {{ currentStep() }} of 3</ui-card-title>
            <ui-card-description>{{ stepDescription() }}</ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <form [formGroup]="form" class="space-y-4">
              @if (currentStep() === 1) {
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Client ID</label>
                    <ui-input formControlName="clientId" placeholder="client-01" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Currency Code</label>
                    <ui-input formControlName="currencyCode" placeholder="USD" />
                  </div>
                </div>
              }

              @if (currentStep() === 2) {
                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Issue Date</label>
                    <ui-date-picker formControlName="issueDateUtc" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Due Date</label>
                    <ui-date-picker formControlName="dueDateUtc" />
                  </div>
                </div>
              }

              @if (currentStep() === 3) {
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Line Description</label>
                  <ui-textarea
                    formControlName="lineDescription"
                    [rows]="3"
                    placeholder="Implementation and rollout services"
                  />
                </div>

                <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Quantity</label>
                    <ui-input type="number" formControlName="quantity" placeholder="1" />
                  </div>
                  <div class="space-y-1.5">
                    <label class="text-sm font-medium">Unit Price</label>
                    <ui-input type="number" formControlName="unitPrice" placeholder="1000" />
                  </div>
                </div>
              }

              @if (validationMessage() !== null) {
                <p class="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {{ validationMessage() }}
                </p>
              }
            </form>

            <div class="mt-5 flex flex-wrap items-center justify-between gap-3">
              <a [routerLink]="['/finance']" class="text-sm text-muted-foreground hover:underline">
                Cancel
              </a>
              <div class="flex items-center gap-2">
                <ui-button
                  variant="outline"
                  label="Back"
                  [disabled]="currentStep() === 1 || invoiceStore.isLoading()"
                  (clicked)="goBack()"
                />
                @if (currentStep() < 3) {
                  <ui-button
                    label="Next"
                    [disabled]="invoiceStore.isLoading()"
                    (clicked)="goNext()"
                  />
                } @else {
                  <ui-button
                    [label]="invoiceStore.isLoading() ? 'Creating...' : 'Create Invoice'"
                    [disabled]="invoiceStore.isLoading()"
                    (clicked)="onSubmit()"
                  />
                }
              </div>
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class CreateInvoiceWizardComponent {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly invoiceStore = inject(InvoiceStore);
  private readonly toast = inject(ToastNotificationService);
  private readonly router = inject(Router);

  protected readonly currentStep = signal<WizardStep>(1);
  protected readonly validationMessage = signal<string | null>(null);

  protected readonly form = this.formBuilder.nonNullable.group({
    clientId: ['', [Validators.required]],
    currencyCode: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    issueDateUtc: ['', [Validators.required]],
    dueDateUtc: ['', [Validators.required]],
    lineDescription: ['', [Validators.required]],
    quantity: [1, [Validators.required, Validators.min(1)]],
    unitPrice: [1000, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly stepDescription = computed(() => {
    switch (this.currentStep()) {
      case 1:
        return 'Select the client and billing currency.';
      case 2:
        return 'Define the issue and due dates.';
      default:
        return 'Add line item detail for invoice generation.';
    }
  });

  protected goNext(): void {
    if (!this.validateCurrentStep()) {
      return;
    }

    const next = Math.min(3, this.currentStep() + 1) as WizardStep;
    this.currentStep.set(next);
    this.validationMessage.set(null);
  }

  protected goBack(): void {
    const previous = Math.max(1, this.currentStep() - 1) as WizardStep;
    this.currentStep.set(previous);
    this.validationMessage.set(null);
  }

  protected async onSubmit(): Promise<void> {
    if (!this.validateCurrentStep()) {
      return;
    }

    const values = this.form.getRawValue();
    await this.invoiceStore.createInvoice({
      clientId: values.clientId.trim(),
      currencyCode: values.currencyCode.trim().toUpperCase(),
      issueDateUtc: values.issueDateUtc,
      dueDateUtc: values.dueDateUtc,
      lineItems: [
        {
          description: values.lineDescription.trim(),
          quantity: values.quantity,
          unitPrice: values.unitPrice,
        },
      ],
    });

    if (this.invoiceStore.error() !== null) {
      this.validationMessage.set(this.invoiceStore.error());
      return;
    }

    this.toast.success('Invoice created successfully.');
    await this.router.navigate(['/finance']);
  }

  private validateCurrentStep(): boolean {
    const controlsByStep: Record<WizardStep, Array<keyof ReturnType<typeof this.form.getRawValue>>> =
      {
        1: ['clientId', 'currencyCode'],
        2: ['issueDateUtc', 'dueDateUtc'],
        3: ['lineDescription', 'quantity', 'unitPrice'],
      };

    const stepControls = controlsByStep[this.currentStep()];
    let hasInvalidField = false;

    for (const key of stepControls) {
      const control = this.form.controls[key];
      control.markAsTouched();
      control.updateValueAndValidity();
      if (control.invalid) {
        hasInvalidField = true;
      }
    }

    const values = this.form.getRawValue();
    if (
      this.currentStep() >= 2 &&
      values.issueDateUtc !== '' &&
      values.dueDateUtc !== '' &&
      values.dueDateUtc < values.issueDateUtc
    ) {
      this.validationMessage.set('Due date must be on or after issue date.');
      return false;
    }

    this.validationMessage.set(hasInvalidField ? 'Please complete all required fields for this step.' : null);
    return !hasInvalidField;
  }
}
