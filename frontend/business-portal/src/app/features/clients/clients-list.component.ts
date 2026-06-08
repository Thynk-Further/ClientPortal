import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { startWith } from 'rxjs';

import { ClientSummary } from '@/app/core/api/services/client-api.service';
import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { ClientStore } from '@/app/core/stores/client.store';
import { ButtonComponent } from '@/components/ui/button.component';
import {
  CardComponent,
  CardContentComponent,
  CardDescriptionComponent,
  CardHeaderComponent,
  CardTitleComponent,
} from '@/components/ui/card.component';
import { InputComponent } from '@/components/ui/input.component';
import { SelectComponent, SelectOption } from '@/components/ui/select.component';

const CLIENT_STATUS_INVITED = 1;

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
  ],
  template: `
    <main class="min-h-screen bg-muted/30 p-4 sm:p-6">
      <section class="mx-auto max-w-7xl space-y-6">
        <ui-card>
          <ui-card-header>
            <ui-card-title>Clients</ui-card-title>
            <ui-card-description>
              View active clients and pending invitations. Resend invites to clients who have not yet accepted.
            </ui-card-description>
          </ui-card-header>

          <ui-card-content>
            <form
              class="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_220px_auto_auto]"
              [formGroup]="filtersForm"
              (ngSubmit)="applyFilters()"
            >
              <ui-input
                type="search"
                placeholder="Search by company, contact, or email"
                formControlName="searchTerm"
              />

              <ui-select
                [options]="statusOptions"
                placeholder="All statuses"
                formControlName="status"
              />

              <ui-button
                type="submit"
                variant="outline"
                class="w-full md:w-auto"
                [disabled]="clientStore.isLoading()"
                label="Apply"
              />

              <ui-button
                class="w-full md:w-auto"
                label="Invite Client"
                (clicked)="goToInviteOnboarding()"
              />
            </form>

            @if (clientStore.error() !== null) {
              <p class="mb-4 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {{ clientStore.error() }}
              </p>
            }

            <div class="overflow-x-auto rounded-xl border">
              <table class="w-full min-w-[720px] text-sm">
                <thead class="bg-muted/40">
                  <tr>
                    <th class="px-4 py-3 text-left font-semibold">Company</th>
                    <th class="px-4 py-3 text-left font-semibold">Contact</th>
                    <th class="px-4 py-3 text-left font-semibold">Email</th>
                    <th class="px-4 py-3 text-left font-semibold">Status</th>
                    <th class="px-4 py-3 text-left font-semibold">Invited</th>
                    <th class="px-4 py-3 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  @if (clientStore.isLoading()) {
                    <tr class="border-t">
                      <td class="px-4 py-8 text-center text-muted-foreground" colspan="6">
                        Loading clients...
                      </td>
                    </tr>
                  } @else if (filteredClients().length === 0) {
                    <tr class="border-t">
                      <td class="px-4 py-8 text-center text-muted-foreground" colspan="6">
                        No clients matched your search or filter criteria.
                      </td>
                    </tr>
                  } @else {
                    @for (client of filteredClients(); track client.id) {
                      <tr class="border-t">
                        <td class="px-4 py-3">
                          <a
                            class="font-medium text-primary underline-offset-4 hover:underline"
                            [routerLink]="['/clients', client.id]"
                          >
                            {{ client.companyName }}
                          </a>
                        </td>
                        <td class="px-4 py-3">{{ client.contactName }}</td>
                        <td class="px-4 py-3">{{ client.email }}</td>
                        <td class="px-4 py-3">
                          <span [class]="statusBadgeClass(client.status)">
                            {{ formatStatus(client.status) }}
                          </span>
                        </td>
                        <td class="px-4 py-3 text-muted-foreground">
                          {{ formatDate(client.invitedAt) }}
                        </td>
                        <td class="px-4 py-3">
                          @if (isPendingInvite(client.status)) {
                            <ui-button
                              variant="outline"
                              [disabled]="resendingClientId() === client.id"
                              [label]="resendingClientId() === client.id ? 'Sending...' : 'Resend invite'"
                              (clicked)="resendInvite(client.id)"
                            />
                          } @else {
                            <span class="text-xs text-muted-foreground">—</span>
                          }
                        </td>
                      </tr>
                    }
                  }
                </tbody>
              </table>
            </div>

            <p class="mt-3 text-xs text-muted-foreground">
              Showing {{ filteredClients().length }} of {{ clientStore.totalCount() }} clients
            </p>
          </ui-card-content>
        </ui-card>
      </section>
    </main>
  `,
})
export class ClientsListComponent implements OnInit {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly toast = inject(ToastNotificationService);

  protected readonly clientStore = inject(ClientStore);
  protected readonly resendingClientId = signal<string | null>(null);

  protected readonly filtersForm = this.formBuilder.nonNullable.group({
    searchTerm: [''],
    status: [''],
  });

  private readonly filtersValue = toSignal(
    this.filtersForm.valueChanges.pipe(startWith(this.filtersForm.getRawValue())),
    { initialValue: this.filtersForm.getRawValue() },
  );

  protected readonly statusOptions: ReadonlyArray<SelectOption> = [
    { value: '1', label: 'Pending invite' },
    { value: '2', label: 'Active' },
    { value: '3', label: 'Inactive' },
    { value: '4', label: 'Suspended' },
  ];

  protected readonly filteredClients = computed<ReadonlyArray<ClientSummary>>(() => {
    const filters = this.filtersValue();
    const searchTerm = (filters.searchTerm ?? '').trim().toLowerCase();
    const clients = this.clientStore.clients();

    if (searchTerm === '') {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.companyName.toLowerCase().includes(searchTerm) ||
        client.contactName.toLowerCase().includes(searchTerm) ||
        client.email.toLowerCase().includes(searchTerm),
    );
  });

  ngOnInit(): void {
    void this.loadClients();
  }

  protected applyFilters(): void {
    void this.loadClients();
  }

  protected goToInviteOnboarding(): void {
    void this.router.navigate(['/clients/invite-onboarding']);
  }

  protected isPendingInvite(status: ClientSummary['status']): boolean {
    return normalizeStatus(status) === CLIENT_STATUS_INVITED;
  }

  protected formatStatus(status: ClientSummary['status']): string {
    switch (normalizeStatus(status)) {
      case 1:
        return 'Pending invite';
      case 2:
        return 'Active';
      case 3:
        return 'Inactive';
      case 4:
        return 'Suspended';
      default:
        return 'Unknown';
    }
  }

  protected statusBadgeClass(status: ClientSummary['status']): string {
    const base = 'inline-flex rounded-full px-2 py-0.5 text-xs font-medium';
    switch (normalizeStatus(status)) {
      case 1:
        return `${base} bg-amber-100 text-amber-900`;
      case 2:
        return `${base} bg-emerald-100 text-emerald-900`;
      case 3:
        return `${base} bg-slate-100 text-slate-700`;
      case 4:
        return `${base} bg-rose-100 text-rose-900`;
      default:
        return `${base} bg-muted text-muted-foreground`;
    }
  }

  protected formatDate(value: string): string {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      return '—';
    }

    return parsed.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected async resendInvite(clientId: string): Promise<void> {
    this.resendingClientId.set(clientId);
    try {
      const success = await this.clientStore.resendClientInvitation(clientId);
      if (success) {
        this.toast.success('Invitation email resent successfully.');
      }
    } finally {
      this.resendingClientId.set(null);
    }
  }

  private async loadClients(): Promise<void> {
    const filters = this.filtersForm.getRawValue();
    const statusValue = filters.status.trim();

    await this.clientStore.loadClients({
      page: 1,
      pageSize: 100,
      status: statusValue === '' ? undefined : statusValue,
    });
  }
}

function normalizeStatus(status: ClientSummary['status']): number {
  if (typeof status === 'number') {
    return status;
  }

  const parsed = Number.parseInt(String(status), 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}
