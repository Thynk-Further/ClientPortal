import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { UserSessionService } from '../auth/user-session.service';
import { AuthStore } from '../stores/auth.store';

@Component({
  selector: 'app-client-user-account-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative">
      <button
        type="button"
        class="grid h-9 w-9 place-content-center rounded-full bg-muted text-xs font-semibold text-foreground transition-colors hover:bg-muted/80"
        [attr.aria-expanded]="menuOpen()"
        aria-haspopup="menu"
        aria-label="Account menu"
        (click)="toggleMenu($event)"
      >
        {{ initials() }}
      </button>

      @if (menuOpen()) {
        <div
          class="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-border bg-background py-1 text-foreground shadow-lg"
          role="menu"
        >
          <div class="px-4 py-3">
            <p class="truncate text-sm font-semibold">{{ displayName() }}</p>
            @if (email() !== null) {
              <p class="mt-0.5 truncate text-sm text-muted-foreground">{{ email() }}</p>
            }
          </div>

          <div class="border-t border-border"></div>

          <div class="py-1">
            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
              (click)="navigateToProfile()"
            >
              <svg class="h-[18px] w-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M20 21a8 8 0 1 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
                />
              </svg>
              Profile
            </button>

            <button
              type="button"
              role="menuitem"
              class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
              [disabled]="authStore.isLoading()"
              (click)="signOut()"
            >
              <svg class="h-[18px] w-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                  d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                />
              </svg>
              {{ authStore.isLoading() ? 'Signing out...' : 'Log out' }}
            </button>
          </div>
        </div>
      }
    </div>
  `,
})
export class ClientUserAccountMenuComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);
  private readonly elementRef = inject(ElementRef);

  protected readonly menuOpen = signal(false);

  protected readonly displayName = computed(
    () => this.userSession.getUser()?.fullName ?? 'Signed in user',
  );

  protected readonly email = computed(() => this.userSession.getUser()?.email ?? null);

  protected readonly initials = computed(() =>
    this.userSession.getInitials(this.userSession.getUser()?.fullName),
  );

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.menuOpen()) {
      return;
    }

    const target = event.target;
    if (target instanceof Node && !this.elementRef.nativeElement.contains(target)) {
      this.menuOpen.set(false);
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    this.menuOpen.set(false);
  }

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected async navigateToProfile(): Promise<void> {
    this.menuOpen.set(false);
    await this.router.navigate(['/profile']);
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.authStore.logout();
    await this.router.navigate(['/auth']);
  }
}
