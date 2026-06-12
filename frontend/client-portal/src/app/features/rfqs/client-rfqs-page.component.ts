import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  inject,
  signal,
} from '@angular/core';
import { FormArray, FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';

import {
  ClientPortalApiService,
  ClientPortalProjectListItem,
  ClientPortalRfqListItem,
} from '@/app/core/api/client-portal-api.service';
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
import { TextareaComponent } from '@/components/ui/textarea.component';

const RFQ_STATUS: Record<number, string> = {
  1: 'Draft',
  2: 'Submitted',
  3: 'Quoted',
  4: 'Accepted',
  5: 'Rejected',
  6: 'Cancelled',
};

@Component({
  selector: 'app-client-rfqs-page',
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
    <div class="space-y-6">
      <header>
        <h1 class="text-2xl font-semibold tracking-tight">Requests for quotation</h1>
        <p class="text-sm text-muted-foreground">Submit item lists and review quotations from your provider.</p>
      </header>

      <ui-card>
        <ui-card-header>
          <ui-card-title>Create RFQ</ui-card-title>
        </ui-card-header>
        <ui-card-content>
          <form [formGroup]="form" class="space-y-3" (ngSubmit)="createRfq()">
            <p class="text-sm text-muted-foreground">
              RFQ numbers are assigned automatically from your provider and company initials plus today&apos;s date.
            </p>
            <ui-input formControlName="currency" placeholder="Currency (e.g. ZAR)" />
            <select formControlName="projectId" class="w-full rounded-md border px-3 py-2 text-sm">
              <option value="">Select project</option>
              @for (project of projects(); track project.id) {
                <option [value]="project.id">{{ project.name }}</option>
              }
            </select>
            <div formArrayName="lineItems" class="space-y-2">
              @for (item of lineItems.controls; track $index) {
                <div class="grid grid-cols-2 gap-2" [formGroupName]="$index">
                  <ui-input formControlName="description" placeholder="Description" />
                  <ui-input formControlName="quantity" type="number" placeholder="Qty" />
                </div>
              }
            </div>
            <ui-button type="button" variant="outline" (click)="addLineItem()">Add line item</ui-button>
            <ui-textarea formControlName="notes" placeholder="Notes (optional)" />
            <ui-button type="submit" [disabled]="isSaving()">Save draft RFQ</ui-button>
          </form>
        </ui-card-content>
      </ui-card>

      <ui-card>
        <ui-card-header>
          <ui-card-title>Your RFQs</ui-card-title>
        </ui-card-header>
        <ui-card-content class="space-y-2">
          @for (rfq of rfqs(); track rfq.id) {
            <a
              class="block rounded-lg border p-3 hover:bg-muted"
              [routerLink]="['/rfqs', rfq.id]"
            >
              <p class="font-medium">{{ rfq.rfqNumber }}</p>
              <p class="text-xs text-muted-foreground">{{ statusLabel(rfq.status) }}</p>
            </a>
          }
        </ui-card-content>
      </ui-card>
    </div>
  `,
})
export class ClientRfqsPageComponent implements OnInit {
  private readonly api = inject(ClientPortalApiService);
  private readonly fb = inject(FormBuilder);

  protected readonly rfqs = signal<ClientPortalRfqListItem[]>([]);
  protected readonly projects = signal<ClientPortalProjectListItem[]>([]);
  protected readonly isSaving = signal(false);

  protected readonly form = this.fb.group({
    currency: ['ZAR', Validators.required],
    projectId: ['', Validators.required],
    notes: [''],
    lineItems: this.fb.array([this.createLineItemGroup()]),
  });

  protected get lineItems(): FormArray {
    return this.form.get('lineItems') as FormArray;
  }

  async ngOnInit(): Promise<void> {
    const [rfqsResult, projectsResult] = await Promise.all([
      firstValueFrom(this.api.getRfqs()),
      firstValueFrom(this.api.getProjects()),
    ]);
    this.rfqs.set(rfqsResult.rfqs.items);
    this.projects.set(projectsResult.projects);
  }

  protected statusLabel(status: number): string {
    return RFQ_STATUS[status] ?? 'Unknown';
  }

  protected addLineItem(): void {
    this.lineItems.push(this.createLineItemGroup());
  }

  protected async createRfq(): Promise<void> {
    if (this.form.invalid) {
      return;
    }

    this.isSaving.set(true);
    try {
      const value = this.form.getRawValue();
      await firstValueFrom(
        this.api.createRfq({
          projectId: value.projectId ?? '',
          currency: value.currency ?? 'ZAR',
          notes: value.notes,
          lineItems: this.lineItems.controls.map((ctrl) => ({
            description: ctrl.value.description ?? '',
            quantity: Number(ctrl.value.quantity ?? 0),
          })),
        }),
      );
      const result = await firstValueFrom(this.api.getRfqs());
      this.rfqs.set(result.rfqs.items);
      this.form.reset({ currency: 'ZAR' });
    } catch (error) {
      console.error(readHttpErrorMessage(error, 'Failed to create RFQ.'));
    } finally {
      this.isSaving.set(false);
    }
  }

  private createLineItemGroup() {
    return this.fb.group({
      description: ['', Validators.required],
      quantity: [1, [Validators.required, Validators.min(0.01)]],
    });
  }
}
