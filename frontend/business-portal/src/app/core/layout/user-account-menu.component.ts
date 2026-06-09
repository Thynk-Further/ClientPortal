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
    @if (layout() === 'sidebar') {
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
            class="absolute right-0 z-50 mt-2 w-64 rounded-lg border bg-popover p-2 text-popover-foreground shadow-lg"
            role="menu"
          >
            <div class="px-2 py-2">
              @if (displayName() !== null) {
                <p class="truncate text-sm font-medium">{{ displayName() }}</p>
              }
              @if (email() !== null) {
                <p class="truncate text-xs text-muted-foreground">{{ email() }}</p>
              }
            </div>

            <div class="my-1 border-t"></div>

            <ui-button
              class="w-full justify-start"
              variant="ghost"
              [disabled]="authStore.isLoading()"
              [label]="authStore.isLoading() ? 'Signing out...' : 'Sign out'"
              (clicked)="signOut()"
            />
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

  readonly layout = input<'header' | 'sidebar' | 'topbar'>('header');

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

  protected toggleMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.menuOpen.update((open) => !open);
  }

  protected async signOut(): Promise<void> {
    this.menuOpen.set(false);
    await this.authStore.logout();
    this.toast.success('Signed out successfully.');
    await this.router.navigate(['/auth']);
  }
}
