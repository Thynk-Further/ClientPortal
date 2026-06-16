import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  inject,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';

import { ThemeService } from '../theme/theme.service';
import { ClientUserAccountMenuComponent } from './client-user-account-menu.component';

@Component({
  selector: 'app-client-portal-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ClientUserAccountMenuComponent],
  template: `
    <header
      class="sticky top-0 z-40 flex h-14 shrink-0 items-center gap-4 border-b border-border/70 bg-background px-5 sm:px-6"
    >
      <div class="flex min-w-0 flex-1 items-center gap-3">
        <div class="relative w-full max-w-2xl">
          <svg
            class="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m21 21-4.3-4.3M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14Z"
            />
          </svg>

          <input
            #searchInput
            type="search"
            class="h-10 w-full rounded-full border border-border bg-background py-2 pl-10 pr-4 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30"
            placeholder="Search projects, invoices, documents..."
            aria-label="Search workspace"
          />
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          class="hidden h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-sm font-medium text-background shadow-sm transition-colors hover:bg-foreground/90 sm:inline-flex"
          (click)="onNewRequest()"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14" />
          </svg>
          New request
        </button>

        <span class="hidden h-6 w-px bg-border sm:block" aria-hidden="true"></span>

        <button
          type="button"
          class="grid h-9 w-9 place-content-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          (click)="themeService.toggle()"
          [attr.aria-label]="themeService.isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
        >
          @if (themeService.isDark()) {
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M12 3v2m0 14v2m9-9h-2M5 12H3m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0L16.95 7.05M7.05 16.95l-1.414 1.414M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z"
              />
            </svg>
          } @else {
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M21 12.79A9 9 0 1 1 11.21 3c-.03.22-.05.44-.05.67A7.33 7.33 0 0 0 18.33 11c.23 0 .45-.02.67-.05Z"
              />
            </svg>
          }
        </button>

        <app-client-user-account-menu />
      </div>
    </header>
  `,
})
export class ClientPortalTopBarComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly themeService = inject(ThemeService);

  protected onNewRequest(): void {
    void this.router.navigate(['/requests']);
  }

  @HostListener('document:keydown', ['$event'])
  onSearchShortcut(event: KeyboardEvent): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const isModifier = event.metaKey || event.ctrlKey;
    if (!isModifier || event.key.toLowerCase() !== 'k' || event.shiftKey || event.altKey) {
      return;
    }

    const target = event.target;
    if (
      target instanceof HTMLElement
      && (target.isContentEditable || target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')
    ) {
      return;
    }

    event.preventDefault();
    this.searchInput()?.nativeElement.focus();
  }
}
