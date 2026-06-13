import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  forwardRef,
  inject,
  input,
  signal,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

import { ClientSummary } from '@/app/core/api/services/client-api.service';

@Component({
  selector: 'app-searchable-client-filter',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableClientFilterComponent),
      multi: true,
    },
  ],
  template: `
    <div class="relative w-full sm:w-64" #root>
      <button
        type="button"
        class="flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-border/80 bg-background px-3 text-sm outline-none transition-colors hover:border-neutral-400 focus-visible:border-neutral-400"
        [attr.aria-expanded]="isOpen()"
        aria-haspopup="listbox"
        (click)="togglePanel($event)"
      >
        <span class="truncate text-left" [class.text-muted-foreground]="!selectedClientId()">
          {{ selectedLabel() }}
        </span>
        <svg
          class="h-4 w-4 shrink-0 text-muted-foreground transition-transform"
          [class.rotate-180]="isOpen()"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.75" d="m6 9 6 6 6-6" />
        </svg>
      </button>

      @if (isOpen()) {
        <div
          class="absolute top-[calc(100%+0.25rem)] z-50 w-full overflow-hidden rounded-lg border border-border/80 bg-background shadow-lg"
          role="listbox"
        >
          <div class="border-b border-border/70 p-2">
            <div class="relative">
              <svg
                class="pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="m21 21-4.35-4.35M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
                />
              </svg>
              <input
                type="search"
                class="h-8 w-full rounded-md border border-border/70 bg-background py-1 pr-2 pl-8 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-neutral-400"
                placeholder="Search clients..."
                [value]="clientSearch()"
                (input)="onClientSearchInput($event)"
                (click)="$event.stopPropagation()"
              />
            </div>
          </div>

          <ul class="max-h-56 overflow-y-auto py-1">
            <li>
              <button
                type="button"
                class="flex w-full px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                [class.bg-muted]="selectedClientId() === null"
                [class.font-medium]="selectedClientId() === null"
                (click)="selectClient(null)"
              >
                All clients
              </button>
            </li>
            @for (client of filteredClients(); track client.id) {
              <li>
                <button
                  type="button"
                  class="flex w-full flex-col px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                  [class.bg-muted]="selectedClientId() === client.id"
                  (click)="selectClient(client.id)"
                >
                  <span class="truncate font-medium">{{ client.companyName }}</span>
                  <span class="truncate text-xs text-muted-foreground">{{ client.contactName }}</span>
                </button>
              </li>
            } @empty {
              <li class="px-3 py-4 text-center text-sm text-muted-foreground">No clients match your search.</li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class SearchableClientFilterComponent implements ControlValueAccessor {
  private readonly rootRef = inject(ElementRef<HTMLElement>);

  readonly clients = input.required<ReadonlyArray<ClientSummary>>();

  protected readonly isOpen = signal(false);
  protected readonly clientSearch = signal('');
  protected readonly selectedClientId = signal<string | null>(null);

  protected readonly filteredClients = computed(() => {
    const query = this.clientSearch().trim().toLowerCase();
    const clients = this.clients();

    if (query === '') {
      return clients;
    }

    return clients.filter(
      (client) =>
        client.companyName.toLowerCase().includes(query) ||
        client.contactName.toLowerCase().includes(query) ||
        client.email.toLowerCase().includes(query),
    );
  });

  protected readonly selectedLabel = computed(() => {
    const clientId = this.selectedClientId();
    if (clientId === null || clientId === '') {
      return 'All clients';
    }

    const client = this.clients().find((item) => item.id === clientId);
    return client?.companyName ?? 'All clients';
  });

  private onChange: (value: string | null) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.selectedClientId.set(value === '' ? null : value);
  }

  registerOnChange(fn: (value: string | null) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState?(_isDisabled: boolean): void {
    // Read-only filter; no disabled UI needed.
  }

  @HostListener('document:click', ['$event'])
  protected onDocumentClick(event: MouseEvent): void {
    if (!this.isOpen()) {
      return;
    }

    const target = event.target;
    if (!(target instanceof Node) || !this.rootRef.nativeElement.contains(target)) {
      this.closePanel();
    }
  }

  protected togglePanel(event: MouseEvent): void {
    event.stopPropagation();
    if (this.isOpen()) {
      this.closePanel();
      return;
    }

    this.clientSearch.set('');
    this.isOpen.set(true);
  }

  protected onClientSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.clientSearch.set(input.value);
  }

  protected selectClient(clientId: string | null): void {
    this.selectedClientId.set(clientId);
    this.onChange(clientId);
    this.onTouched();
    this.closePanel();
  }

  private closePanel(): void {
    this.isOpen.set(false);
    this.clientSearch.set('');
  }
}
