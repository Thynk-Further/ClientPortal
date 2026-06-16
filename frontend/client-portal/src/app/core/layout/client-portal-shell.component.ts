import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { ThemeService } from '../theme/theme.service';
import { CLIENT_PORTAL_NAV_ITEMS } from './client-portal-nav.config';
import { ClientPortalMessagesSummaryService } from '../messaging/client-portal-messages-summary.service';
import { ClientPortalNoticesSummaryService } from '../notices/client-portal-notices-summary.service';
import { ClientPortalSidebarComponent } from './client-portal-sidebar.component';
import { ClientPortalTopBarComponent } from './client-portal-top-bar.component';
import { PageBreadcrumbComponent } from './page-breadcrumb.component';

@Component({
  selector: 'app-client-portal-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    ClientPortalSidebarComponent,
    ClientPortalTopBarComponent,
    PageBreadcrumbComponent,
  ],
  template: `
    <div class="flex min-h-screen bg-background font-sans text-foreground antialiased">
      <app-client-portal-sidebar />

      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <app-client-portal-top-bar />

        <div class="min-h-0 flex-1 overflow-y-auto">
          <nav
            class="flex gap-1 overflow-x-auto border-b border-border/70 bg-background px-4 py-2 lg:hidden"
            aria-label="Client portal mobile"
          >
            @for (item of navItems; track item.route) {
              <a
                [routerLink]="item.route"
                routerLinkActive="bg-muted text-foreground"
                class="relative whitespace-nowrap rounded-lg px-3 py-1.5 text-[13px] font-medium text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground"
                [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
              >
                {{ item.label }}
                @if (item.showUnreadBadge && unreadCount(item) > 0) {
                  <span
                    class="ml-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground"
                  >
                    {{ unreadCount(item) }}
                  </span>
                }
              </a>
            }
          </nav>

          <app-page-breadcrumb />
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class ClientPortalShellComponent implements OnInit {
  private readonly themeService = inject(ThemeService);
  private readonly messagesSummary = inject(ClientPortalMessagesSummaryService);
  private readonly noticesSummary = inject(ClientPortalNoticesSummaryService);

  protected readonly navItems = CLIENT_PORTAL_NAV_ITEMS;

  ngOnInit(): void {
    this.themeService.initialize();
  }

  protected unreadCount(item: (typeof CLIENT_PORTAL_NAV_ITEMS)[number]): number {
    if (!item.showUnreadBadge) {
      return 0;
    }

    return item.route === '/messages'
      ? this.messagesSummary.unreadCount()
      : this.noticesSummary.unreadCount();
  }
}
