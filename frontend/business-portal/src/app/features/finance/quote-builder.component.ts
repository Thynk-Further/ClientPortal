import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';
import { TextareaComponent } from '@/components/ui/textarea.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

@Component({
  selector: 'app-quote-builder',
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
    TextareaComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-5xl space-y-6">
        <header class="space-y-1">
          <h1 class="text-2xl font-semibold tracking-tight">Quote Builder</h1>
          <p class="text-sm text-muted-foreground">
            Add line items, calculate quote totals, and prepare for client delivery.
          </p>
        </header>

        <ui-card>
          <ui-card-header>
            <ui-card-title>Quote Details</ui-card-title>
            <ui-card-description>
              Provide client and service context before sending.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <form [formGroup]="form" class="space-y-4" (ngSubmit)="onCreateQuote()">
              <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Client Name</label>
                  <ui-input formControlName="clientName" placeholder="Contoso Architects" />
                </div>
                <div class="space-y-1.5">
                  <label class="text-sm font-medium">Currency</label>
                  <ui-input formControlName="currencyCode" placeholder="USD" />
                </div>
              </div>

              <div class="space-y-1.5">
                <label class="text-sm font-medium">Summary</label>
                <ui-textarea
                  formControlName="summary"
                  [rows]="3"
                  placeholder="Website redesign and phased rollout."
                />
              </div>

              <div class="space-y-3">
                <div class="flex items-center justify-between">
                  <h2 class="text-sm font-semibold">Line Items</h2>
                  <ui-button
                    variant="outline"
                    label="Add Line Item"
                    type="button"
                    (clicked)="addLineItem()"
                  />
                </div>

                @for (item of lineItems.controls; track $index) {
                  <div class="grid grid-cols-1 gap-3 rounded-lg border p-3 md:grid-cols-12">
                    <div class="md:col-span-6">
                      <label class="mb-1 block text-xs text-muted-foreground">Description</label>
                      <ui-input [formControl]="item.controls.description" placeholder="Service item" />
                    </div>
                    <div class="md:col-span-2">
                      <label class="mb-1 block text-xs text-muted-foreground">Qty</label>
                      <ui-input type="number" [formControl]="item.controls.quantity" placeholder="1" />
                    </div>
                    <div class="md:col-span-3">
                      <label class="mb-1 block text-xs text-muted-foreground">Unit Price</label>
                      <ui-input type="number" [formControl]="item.controls.unitPrice" placeholder="0.00" />
                    </div>
                    <div class="md:col-span-1 flex items-end">
                      <ui-button
                        class="w-full"
                        variant="destructive"
                        label="X"
                        type="button"
                        [disabled]="lineItems.length <= 1"
                        (clicked)="removeLineItem($index)"
                      />
                    </div>
                  </div>
                }
              </div>

              <div class="rounded-lg border bg-muted/20 p-3">
                <p class="text-sm">
                  Estimated total:
                  <span class="font-semibold">{{ formattedTotal() }}</span>
                </p>
              </div>

              <div class="flex items-center justify-between gap-3">
                <a [routerLink]="['/finance/quotes']" class="text-sm text-muted-foreground hover:underline">
                  Cancel
                </a>
                <ui-button label="Create Quote" type="submit" />
              </div>
            </form>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class QuoteBuilderComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);
  private readonly router = inject(Router);

  protected readonly form = this.formBuilder.nonNullable.group({
    clientName: ['', [Validators.required]],
    currencyCode: ['USD', [Validators.required, Validators.minLength(3), Validators.maxLength(3)]],
    summary: ['', [Validators.required]],
    lineItems: this.formBuilder.array([this.createLineItemGroup()]),
  });

  protected readonly lineItems = this.form.controls.lineItems as FormArray<
    ReturnType<QuoteBuilderComponent['createLineItemGroup']>
  >;

  protected readonly formattedTotal = computed(() => {
    const values = this.lineItems.getRawValue();
    const total = values.reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
      0,
    );

    const currency = this.form.controls.currencyCode.value || 'USD';
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(total);
  });

  protected addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup());
  }

  protected removeLineItem(index: number): void {
    if (this.lineItems.length <= 1) {
      return;
    }

    this.lineItems.removeAt(index);
  }

  protected async onCreateQuote(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.toast.success('Quote created in draft status.');
    await this.router.navigate(['/finance/quotes']);
  }

  private createLineItemGroup() {
    return this.formBuilder.nonNullable.group({
      description: ['', [Validators.required]],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unitPrice: [0, [Validators.required, Validators.min(0)]],
    });
  }
}
