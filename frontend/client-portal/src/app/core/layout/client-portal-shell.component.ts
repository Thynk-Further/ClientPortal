import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { UserSessionService } from '../auth/user-session.service';

interface ClientNavItem {
  readonly label: string;
  readonly route: string;
}

@Component({
  selector: 'app-client-portal-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="flex min-h-screen flex-col bg-muted/30">
      <header class="border-b border-border/70 bg-card">
        <div class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">Client Portal</p>
            <p class="text-sm font-semibold text-foreground">{{ greetingName() }}</p>
          </div>

          <nav class="flex flex-wrap gap-1" aria-label="Client portal">
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary text-primary-foreground"
                class="rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              >
                {{ item.label }}
              </a>
            }
          </nav>
        </div>
      </header>

      <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6">
        <router-outlet />
      </main>
    </div>
  `,
})
export class ClientPortalShellComponent {
  private readonly userSession = inject(UserSessionService);

  protected readonly navItems: ReadonlyArray<ClientNavItem> = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Projects', route: '/projects' },
    { label: 'Invoices', route: '/invoices' },
    { label: 'Documents', route: '/documents' },
    { label: 'Messages', route: '/messages' },
    { label: 'Meetings', route: '/meetings' },
    { label: 'Profile', route: '/profile' },
  ];

  protected greetingName(): string {
    const user = this.userSession.getUser();
    if (user?.fullName?.trim()) {
      return user.fullName.trim();
    }

    return 'Welcome';
  }
}
