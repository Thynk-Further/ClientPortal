import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  HostListener,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';

import { ToastNotificationService } from '@/app/core/notifications/toast-notification.service';
import { UserSessionService } from '@/app/core/auth/user-session.service';
import { AuthStore } from '@/app/core/stores/auth.store';
import { ButtonComponent } from '@/components/ui/button.component';

@Component({
  selector: 'app-user-account-menu',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    @if (layout() === 'sidebar-footer') {
      <div class="flex items-center gap-2.5 rounded-xl border border-border/60 bg-background p-2">
        <div class="grid h-9 w-9 shrink-0 place-content-center rounded-full bg-muted text-xs font-semibold text-foreground">
          {{ initials() }}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold leading-tight">{{ compactDisplayName() }}</p>
          <p class="truncate text-xs text-muted-foreground">{{ userRole() }}</p>
        </div>
        <button
          type="button"
          class="grid h-8 w-8 shrink-0 place-content-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-60"
          [disabled]="authStore.isLoading()"
          aria-label="Log out"
          (click)="signOut()"
        >
          <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
              d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
            />
          </svg>
        </button>
      </div>
    } @else if (layout() === 'sidebar') {
      <div class="space-y-2 px-1">
        @if (displayName() !== null) {
          <div class="px-2">
            <p class="truncate text-sm font-medium">{{ displayName() }}</p>
            @if (email() !== null) {
              <p class="truncate text-xs text-muted-foreground">{{ email() }}</p>
            }
          </div>
        }

        <ui-button
          class="w-full"
          variant="outline"
          [disabled]="authStore.isLoading()"
          [label]="authStore.isLoading() ? 'Signing out...' : 'Sign out'"
          (clicked)="signOut()"
        />
      </div>
    } @else {
      <div class="relative">
        <button
          type="button"
          class="grid h-9 w-9 place-content-center rounded-full text-xs font-semibold"
          [class.bg-muted]="layout() === 'topbar'"
          [class.text-foreground]="layout() === 'topbar'"
          [class.hover:bg-muted/80]="layout() === 'topbar'"
          [class.bg-primary]="layout() !== 'topbar'"
          [class.text-primary-foreground]="layout() !== 'topbar'"
          [class.hover:bg-primary/90]="layout() !== 'topbar'"
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
              <p class="truncate text-sm font-semibold">{{ compactDisplayName() }}</p>
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
                (click)="navigateTo('/settings')"
              >
                <svg class="h-[18px] w-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z"
                  />
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"
                  />
                </svg>
                Settings
              </button>

              <button
                type="button"
                role="menuitem"
                class="flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted"
                (click)="navigateTo('/settings', 'notification-preferences')"
              >
                <svg class="h-[18px] w-[18px] text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                  <path
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="1.75"
                    d="M15 17h5l-1.4-1.4A2 2 0 0 1 18 14.2V11a6 6 0 1 0-12 0v3.2a2 2 0 0 1-.6 1.4L4 17h5m6 0a3 3 0 1 1-6 0m6 0H9"
                  />
                </svg>
                Notifications
              </button>
            </div>

            <div class="border-t border-border"></div>

            <div class="py-1">
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
    }
  `,
})
export class UserAccountMenuComponent {
  protected readonly authStore = inject(AuthStore);
  private readonly router = inject(Router);
  private readonly userSession = inject(UserSessionService);
  private readonly toast = inject(ToastNotificationService);
  private readonly elementRef = inject(ElementRef);

  readonly layout = input<'header' | 'sidebar' | 'sidebar-footer' | 'topbar'>('header');

  protected readonly menuOpen = signal(false);

  protected readonly displayName = computed(
    () => this.userSession.getUser()?.fullName ?? 'Signed in user',
  );

  protected readonly compactDisplayName = computed(() => {
    const fullName = this.userSession.getUser()?.fullName;
    if (fullName === null || fullName === undefined || fullName.trim() === '') {
      return 'Signed in user';
    }

    const parts = fullName.trim().split(/\s+/).filter((part) => part.length > 0);
    if (parts.length === 0) {
      return 'Signed in user';
    }

    if (parts.length === 1) {
      return parts[0];
    }

    const lastInitial = parts[parts.length - 1]?.[0] ?? '';
    return `${parts[0]} ${lastInitial}.`;
  });

  protected readonly email = computed(() => this.userSession.getUser()?.email ?? null);

  protected readonly initials = computed(() =>
    this.userSession.getInitials(this.userSession.getUser()?.fullName),
  );

  protected readonly userRole = computed(() => {
    const primaryRole = this.authStore.roles()[0];
    return primaryRole ?? 'Admin';
  });

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

  protected async navigateTo(path: string, fragment?: string): Promise<void> {
    this.menuOpen.set(false);
    await this.router.navigate([path], { fragment });
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.authStore.logout();
    this.toast.success('Signed out successfully.');
    await this.router.navigate(['/auth']);
  }
}
