import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { TenantBrandingService } from '../branding/tenant-branding.service';
import { UserSessionService } from '../auth/user-session.service';
import { ClientPortalMessagesSummaryService } from '../messaging/client-portal-messages-summary.service';
import { ClientPortalNoticesSummaryService } from '../notices/client-portal-notices-summary.service';

interface ClientNavItem {
  readonly label: string;
  readonly route: string;
  readonly showUnreadBadge?: boolean;
  readonly unreadCount?: () => number;
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
          <div class="flex min-w-0 items-center gap-3">
            @if (brandingService.branding()?.logoUrl; as logoUrl) {
              <img
                [src]="logoUrl"
                [alt]="tenantDisplayName() + ' logo'"
                class="h-9 w-auto max-w-[140px] object-contain"
              />
            }
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold text-foreground">{{ tenantDisplayName() }}</p>
              <p class="text-xs text-muted-foreground">Client portal</p>
            </div>
          </div>

          <nav class="flex flex-wrap gap-1" aria-label="Client portal">
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-primary text-primary-foreground"
                class="relative rounded-md px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                [routerLinkActiveOptions]="{ exact: item.route === '/dashboard' }"
              >
                {{ item.label }}
                @if (item.showUnreadBadge && item.unreadCount !== undefined && item.unreadCount() > 0) {
                  <span
                    class="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground"
                    [attr.aria-label]="item.unreadCount() + ' unread ' + item.label.toLowerCase()"
                  >
                    {{ item.unreadCount() }}
                  </span>
                }
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
export class ClientPortalShellComponent implements OnInit {
  private readonly userSession = inject(UserSessionService);
  protected readonly brandingService = inject(TenantBrandingService);
  protected readonly messagesSummary = inject(ClientPortalMessagesSummaryService);
  protected readonly noticesSummary = inject(ClientPortalNoticesSummaryService);

  protected readonly navItems: ReadonlyArray<ClientNavItem> = [
    { label: 'Dashboard', route: '/dashboard' },
    { label: 'Projects', route: '/projects' },
    { label: 'Requests', route: '/requests' },
    { label: 'Invoices', route: '/invoices' },
    { label: 'Documents', route: '/documents' },
    { label: 'Messages', route: '/messages', showUnreadBadge: true, unreadCount: () => this.messagesSummary.unreadCount() },
    { label: 'Meetings', route: '/meetings' },
    { label: 'Notices', route: '/notices', showUnreadBadge: true, unreadCount: () => this.noticesSummary.unreadCount() },
    { label: 'Profile', route: '/profile' },
  ];

  async ngOnInit(): Promise<void> {
    await Promise.all([this.messagesSummary.refresh(), this.noticesSummary.refresh()]);
  }

  protected greetingName(): string {
    const user = this.userSession.getUser();
    if (user?.fullName?.trim()) {
      return user.fullName.trim();
    }

    return 'Welcome';
  }

  protected tenantDisplayName(): string {
    return this.brandingService.branding()?.tenantName ?? 'Client Portal';
  }
}
