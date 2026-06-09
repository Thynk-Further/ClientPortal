import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  PLATFORM_ID,
  inject,
  input,
  output,
  viewChild,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { UserAccountMenuComponent } from './user-account-menu.component';

@Component({
  selector: 'app-dashboard-top-bar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [UserAccountMenuComponent],
  template: `
    <header
      class="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/80 bg-background px-4 sm:px-6"
    >
      <div class="flex shrink-0 items-center gap-2.5">
        <div class="grid h-8 w-8 place-content-center rounded-[9px] bg-foreground text-background">
          <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              d="M12 2 20 12 12 22 4 12 12 2Z"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
            />
          </svg>
        </div>

        <div class="leading-none">
          <p class="text-sm font-semibold tracking-tight text-foreground">Zenith</p>
          <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            Dashboard
          </p>
        </div>
      </div>

      <div class="flex min-w-0 flex-1 justify-center px-2 sm:px-6">
        <div class="relative w-full max-w-xl">
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
            class="h-10 w-full rounded-full border border-border bg-background py-2 pl-10 pr-[4.5rem] text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
            placeholder="Search anything..."
            aria-label="Search"
          />

          <kbd
            class="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded-md border border-border bg-muted/60 px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline-flex"
          >
            {{ searchShortcutLabel() }}
          </kbd>
        </div>
      </div>

      <div class="flex shrink-0 items-center gap-2.5 sm:gap-3">
        <button
          type="button"
          class="inline-flex h-9 items-center gap-1.5 rounded-lg bg-foreground px-3.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90"
          (click)="newClient.emit()"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 5v14M5 12h14" />
          </svg>
          New Client
        </button>

        <span class="hidden h-6 w-px bg-border sm:block" aria-hidden="true"></span>

        <div class="flex items-center gap-0.5 sm:gap-1">
          <button
            type="button"
            class="grid h-9 w-9 place-content-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            (click)="themeToggle.emit()"
            [attr.aria-label]="isDark() ? 'Switch to light mode' : 'Switch to dark mode'"
          >
            @if (isDark()) {
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

          <button
            type="button"
            class="grid h-9 w-9 place-content-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Theme settings"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M12 22a8 8 0 0 1-8-8c0-4.4 3.6-8 8-8 1.5 0 3 .4 4.3 1.2M12 6a2 2 0 1 0 0-4 2 2 0 0 0 0 4Zm-5 7a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm3 5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Zm6-2a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3Z"
              />
            </svg>
          </button>

          <button
            type="button"
            class="relative grid h-9 w-9 place-content-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Open notifications"
          >
            <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="1.75"
                d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
              />
            </svg>
          </button>
        </div>

        <app-user-account-menu layout="topbar" />
      </div>
    </header>
  `,
})
export class DashboardTopBarComponent {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  readonly isDark = input(false);

  readonly newClient = output<void>();
  readonly themeToggle = output<void>();

  protected searchShortcutLabel(): string {
    if (!isPlatformBrowser(this.platformId)) {
      return '⌘K';
    }

    return /Mac|iPhone|iPad|iPod/i.test(navigator.userAgent) ? '⌘K' : 'Ctrl+K';
  }

  @HostListener('document:keydown', ['$event'])
  onSearchShortcut(event: KeyboardEvent): void {
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
