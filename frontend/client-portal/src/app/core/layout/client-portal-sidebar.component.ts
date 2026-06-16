import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

import { TenantBrandingService } from '../branding/tenant-branding.service';
import { ClientPortalMessagesSummaryService } from '../messaging/client-portal-messages-summary.service';
import { ClientPortalNoticesSummaryService } from '../notices/client-portal-notices-summary.service';
import {
  CLIENT_PORTAL_NAV_ITEMS,
  ClientPortalNavItemConfig,
} from './client-portal-nav.config';

interface ClientNavItem extends ClientPortalNavItemConfig {
  readonly unreadCount?: () => number;
}

@Component({
  selector: 'app-client-portal-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    <aside
      class="relative sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border/70 bg-sidebar transition-[width] duration-300 ease-in-out lg:flex"
      [class.w-64]="!sidebarCollapsed()"
      [class.w-[4.5rem]]="sidebarCollapsed()"
    >
      <button
        type="button"
        class="absolute -right-3 top-[4.75rem] z-10 grid h-6 w-6 place-content-center rounded-full border border-border/80 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
        (click)="toggleSidebar()"
        [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        [attr.aria-expanded]="!sidebarCollapsed()"
      >
        <svg
          class="h-3.5 w-3.5 transition-transform duration-300"
          [class.rotate-180]="sidebarCollapsed()"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            d="m15 6-6 6 6 6"
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
          />
        </svg>
      </button>

      <div class="shrink-0 border-b border-border/70 px-4 pb-4 pt-5" [class.px-3]="sidebarCollapsed()">
        <div
          class="flex min-w-0 items-center gap-2.5"
          [class.justify-center]="sidebarCollapsed()"
        >
          @if (brandingService.branding()?.logoUrl; as logoUrl) {
            <img
              [src]="logoUrl"
              [alt]="tenantDisplayName() + ' logo'"
              class="h-8 w-8 shrink-0 object-contain"
              [class.h-9]="!sidebarCollapsed()"
              [class.w-auto]="!sidebarCollapsed()"
              [class.max-w-[140px]]="!sidebarCollapsed()"
            />
          } @else {
            <div
              class="grid h-8 w-8 shrink-0 place-content-center rounded-[9px] bg-foreground text-xs font-semibold text-background"
              [attr.aria-label]="tenantDisplayName()"
            >
              {{ tenantInitial() }}
            </div>
          }
          @if (!sidebarCollapsed()) {
            <div class="min-w-0 leading-none">
              <p class="truncate text-sm font-semibold tracking-tight text-foreground">
                {{ tenantDisplayName() }}
              </p>
              <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
                Client portal
              </p>
            </div>
          }
        </div>
      </div>

      <nav
        class="zenith-sidebar-scroll min-h-0 flex-1 space-y-1 px-3 py-2"
        [class.px-2]="sidebarCollapsed()"
        aria-label="Client portal"
      >
        @for (item of navItems; track item.route) {
          <a
            [routerLink]="item.route"
            [attr.title]="sidebarCollapsed() ? item.label : null"
            class="relative flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors"
            [class.justify-center]="sidebarCollapsed()"
            [class.px-2.5]="!sidebarCollapsed()"
            [class.px-0]="sidebarCollapsed()"
            [class.bg-muted]="isItemActive(item)"
            [class.text-foreground]="isItemActive(item)"
            [class.text-muted-foreground]="!isItemActive(item)"
            [class.hover:bg-muted/70]="!isItemActive(item)"
            [class.hover:text-foreground]="!isItemActive(item)"
          >
            <span class="relative shrink-0">
              <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  [attr.d]="item.iconPath"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="1.75"
                />
              </svg>
              @if (
                sidebarCollapsed() &&
                item.showUnreadBadge &&
                item.unreadCount !== undefined &&
                item.unreadCount() > 0
              ) {
                <span
                  class="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive"
                  [attr.aria-label]="item.unreadCount() + ' unread ' + item.label.toLowerCase()"
                ></span>
              }
            </span>
            @if (!sidebarCollapsed()) {
              <span class="ml-2.5 flex-1 truncate">{{ item.label }}</span>
              @if (item.showUnreadBadge && item.unreadCount !== undefined && item.unreadCount() > 0) {
                <span
                  class="grid h-5 min-w-5 place-content-center rounded-full bg-destructive px-1.5 text-[10px] font-semibold text-destructive-foreground"
                >
                  {{ item.unreadCount() }}
                </span>
              }
            }
          </a>
        }
      </nav>
    </aside>
  `,
})
export class ClientPortalSidebarComponent implements OnInit {
  private readonly router = inject(Router);
  protected readonly brandingService = inject(TenantBrandingService);
  private readonly messagesSummary = inject(ClientPortalMessagesSummaryService);
  private readonly noticesSummary = inject(ClientPortalNoticesSummaryService);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly currentUrl = signal(this.router.url);

  protected readonly navItems: ReadonlyArray<ClientNavItem> = CLIENT_PORTAL_NAV_ITEMS.map((item) => ({
    ...item,
    unreadCount: item.showUnreadBadge
      ? () =>
          item.route === '/messages'
            ? this.messagesSummary.unreadCount()
            : this.noticesSummary.unreadCount()
      : undefined,
  }));

  async ngOnInit(): Promise<void> {
    await Promise.all([this.messagesSummary.refresh(), this.noticesSummary.refresh()]);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.currentUrl.set(event.urlAfterRedirects ?? event.url);
      });
  }

  protected tenantDisplayName(): string {
    return this.brandingService.branding()?.tenantName ?? 'Client Portal';
  }

  protected tenantInitial(): string {
    return this.tenantDisplayName().trim().charAt(0).toUpperCase() || 'C';
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected isItemActive(item: ClientNavItem): boolean {
    const path = this.currentUrl().split('?')[0].split('#')[0];
    return this.pathMatchesNavItem(path, item);
  }

  private pathMatchesNavItem(path: string, item: ClientNavItem): boolean {
    if (item.exact) {
      return path === item.route;
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }
}
