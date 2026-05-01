import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { startWith } from 'rxjs';

import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import {
  DataTableColumn,
  DataTableComponent,
  DataTableRow,
} from '@/components/ui/data-table.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';

interface ClientRow extends DataTableRow {
  readonly id: string;
  readonly name: string;
  readonly email: string;
  readonly status: 'Active' | 'Pending' | 'Inactive';
  readonly projects: number;
  readonly totalRevenue: string;
}

@Component({
  selector: 'app-clients-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    CardComponent,
    CardHeaderComponent,
    CardTitleComponent,
    CardDescriptionComponent,
    CardContentComponent,
    InputComponent,
    SelectComponent,
    ButtonComponent,
    DataTableComponent,
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Clients</ui-card-title>
            <ui-card-description>
              Search client records, filter by lifecycle status, and invite new clients.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <form
              class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto]"
              [formGroup]="filtersForm"
            >
              <ui-input
                type="search"
                placeholder="Search by client name or email"
                formControlName="searchTerm"
              />

              <ui-select
                [options]="statusOptions"
                placeholder="Filter by status"
                formControlName="status"
              />

              <ui-button
                class="w-full md:w-auto"
                label="Invite Client"
                (clicked)="onInviteClient()"
              />
            </form>

            <ui-data-table
              [columns]="columns"
              [rows]="filteredRows()"
              rowTrackByKey="id"
              emptyStateMessage="No clients matched your search/filter criteria."
              [defaultPageSize]="10"
              [pageSizeOptions]="[10, 20, 50]"
            />

            <div class="mt-4 rounded-lg border border-dashed p-3">
              <p class="text-xs text-muted-foreground">Open client details:</p>
              <div class="mt-2 flex flex-wrap gap-2">
                @for (client of filteredRows(); track client.id) {
                  <a
                    class="rounded-md border px-2 py-1 text-xs hover:bg-muted"
                    [routerLink]="['/clients', client.id]"
                  >
                    {{ client.name }}
                  </a>
                }
              </div>
            </div>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ClientsListComponent {
  private readonly formBuilder = inject(FormBuilder);
  private readonly toast = inject(ToastNotificationService);

  protected readonly filtersForm = this.formBuilder.nonNullable.group({
    searchTerm: [''],
    status: [''],
  });

  private readonly filtersValue = toSignal(
    this.filtersForm.valueChanges.pipe(startWith(this.filtersForm.getRawValue())),
    { initialValue: this.filtersForm.getRawValue() },
  );

  protected readonly statusOptions: ReadonlyArray<SelectOption> = [
    { value: 'Active', label: 'Active' },
    { value: 'Pending', label: 'Pending' },
    { value: 'Inactive', label: 'Inactive' },
  ];

  protected readonly columns: ReadonlyArray<DataTableColumn> = [
    { key: 'name', header: 'Client', sortable: true },
    { key: 'email', header: 'Email', sortable: true },
    { key: 'status', header: 'Status', sortable: true },
    { key: 'projects', header: 'Projects', sortable: true },
    { key: 'totalRevenue', header: 'Total Revenue', sortable: true },
  ];

  private readonly allClients: ReadonlyArray<ClientRow> = [
    {
      id: 'client-01',
      name: 'Contoso Architects',
      email: 'ops@contoso-arch.com',
      status: 'Active',
      projects: 6,
      totalRevenue: '$128,400',
    },
    {
      id: 'client-02',
      name: 'Northwind Retail',
      email: 'finance@northwind-retail.com',
      status: 'Pending',
      projects: 2,
      totalRevenue: '$34,900',
    },
    {
      id: 'client-03',
      name: 'Fabrikam Manufacturing',
      email: 'hello@fabrikam-mfg.com',
      status: 'Active',
      projects: 4,
      totalRevenue: '$92,750',
    },
    {
      id: 'client-04',
      name: 'Adventure Works',
      email: 'accounts@adventure-works.io',
      status: 'Inactive',
      projects: 1,
      totalRevenue: '$11,200',
    },
    {
      id: 'client-05',
      name: 'Blue Yonder Logistics',
      email: 'billing@blueyonder-logistics.com',
      status: 'Active',
      projects: 5,
      totalRevenue: '$74,640',
    },
  ];

  protected readonly filteredRows = computed<ReadonlyArray<ClientRow>>(() => {
    const filters = this.filtersValue();
    const searchTerm = (filters.searchTerm ?? '').trim().toLowerCase();
    const selectedStatus = filters.status ?? '';

    return this.allClients.filter((client) => {
      const matchesSearch =
        searchTerm === '' ||
        client.name.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm);

      const matchesStatus = selectedStatus === '' || client.status === selectedStatus;
      return matchesSearch && matchesStatus;
    });
  });

  protected onInviteClient(): void {
    this.toast.info('Invite client flow will be connected in the next task.');
  }
}
