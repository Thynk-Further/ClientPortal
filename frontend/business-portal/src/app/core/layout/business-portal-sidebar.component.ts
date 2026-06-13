import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, firstValueFrom } from 'rxjs';

import { RfqApiService } from '@/app/core/api/services/rfq-api.service';
import { ClientStore } from '@/app/core/stores/client.store';
import {
  BUSINESS_PORTAL_NAV_SECTIONS,
  BusinessPortalNavItem,
  BusinessPortalNavSection,
} from './business-portal-nav.config';
import { UserAccountMenuComponent } from './user-account-menu.component';

@Component({
  selector: 'app-business-portal-sidebar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, UserAccountMenuComponent],
  template: `
    <aside
      class="relative sticky top-0 flex h-screen shrink-0 flex-col border-r border-border/70 bg-sidebar transition-[width] duration-300 ease-in-out"
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

      <div class="shrink-0 px-4 pb-4 pt-5" [class.px-3]="sidebarCollapsed()">
        <a
          routerLink="/dashboard"
          class="flex items-center gap-2.5"
          [class.justify-center]="sidebarCollapsed()"
        >
          <div class="grid h-8 w-8 shrink-0 place-content-center rounded-[9px] bg-foreground text-background">
            <svg class="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
              <path
                d="M12 2 20 12 12 22 4 12 12 2Z"
                stroke-linecap="round"
                stroke-linejoin="round"
                stroke-width="2"
              />
            </svg>
          </div>
          @if (!sidebarCollapsed()) {
            <div class="leading-none">
              <p class="text-sm font-semibold tracking-tight text-foreground">Zenith</p>
              <p class="mt-0.5 text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Dashboard
              </p>
            </div>
          }
        </a>
      </div>

      <nav
        class="zenith-sidebar-scroll min-h-0 flex-1 space-y-5 px-3"
        [class.px-2]="sidebarCollapsed()"
        aria-label="Sidebar"
      >
        @for (section of sidebarSections(); track section.id) {
          <div class="space-y-1">
            @if (!sidebarCollapsed()) {
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left transition-colors hover:bg-muted/50"
                [attr.aria-label]="'Toggle ' + section.label + ' section'"
                [attr.aria-expanded]="isSidebarSectionExpanded(section.id)"
                (click)="toggleSidebarSection(section.id)"
              >
                <span class="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
                  {{ section.label }}
                </span>
                <svg
                  class="h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200"
                  [class.rotate-90]="isSidebarSectionExpanded(section.id)"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    d="m9 6 6 6-6 6"
                    stroke-linecap="round"
                    stroke-linejoin="round"
                    stroke-width="2"
                  />
                </svg>
              </button>
            }

            @if (sidebarCollapsed() || isSidebarSectionExpanded(section.id)) {
              @for (item of section.items; track item.id) {
                <a
                  [routerLink]="item.route"
                  [attr.title]="sidebarCollapsed() ? item.label : null"
                  class="flex items-center rounded-lg py-2 text-[13px] font-medium transition-colors"
                  [class.justify-center]="sidebarCollapsed()"
                  [class.px-2.5]="!sidebarCollapsed()"
                  [class.px-0]="sidebarCollapsed()"
                  [class.bg-muted]="isItemActive(item)"
                  [class.text-foreground]="isItemActive(item)"
                  [class.text-muted-foreground]="!isItemActive(item)"
                  [class.hover:bg-muted/70]="!isItemActive(item)"
                  [class.hover:text-foreground]="!isItemActive(item)"
                >
                  <svg class="h-[18px] w-[18px] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      [attr.d]="item.iconPath"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.75"
                    />
                  </svg>
                  @if (!sidebarCollapsed()) {
                    <span class="ml-2.5 flex-1 truncate">{{ item.label }}</span>
                    @if (item.badgeCount !== undefined) {
                      <span
                        class="grid h-5 min-w-5 place-content-center rounded-full bg-muted px-1.5 text-[10px] font-semibold text-muted-foreground"
                      >
                        {{ item.badgeCount }}
                      </span>
                    }
                  }
                </a>
              }
            }
          </div>
        }
      </nav>

      @if (!sidebarCollapsed()) {
        <div class="shrink-0 border-t border-border/70 px-3 py-3">
          <app-user-account-menu layout="sidebar-footer" />
        </div>
      }
    </aside>
  `,
})
export class BusinessPortalSidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly clientStore = inject(ClientStore);
  private readonly rfqApi = inject(RfqApiService);

  protected readonly submittedRfqCount = signal(0);
  protected readonly sidebarCollapsed = signal(false);
  protected readonly expandedSidebarSections = signal<ReadonlySet<string>>(
    new Set(BUSINESS_PORTAL_NAV_SECTIONS.map((section) => section.id)),
  );
  protected readonly currentUrl = signal(this.router.url);

  protected readonly sidebarSections = computed<ReadonlyArray<BusinessPortalNavSection>>(() => {
    const clientCount = this.clientStore.totalCount();
    const submittedRfqs = this.submittedRfqCount();

    const applyRfqBadge = (item: BusinessPortalNavItem): BusinessPortalNavItem =>
      (item.id === 'rfq-list' || item.id === 'rfq-inbox') && submittedRfqs > 0
        ? { ...item, badgeCount: submittedRfqs }
        : item;

    return BUSINESS_PORTAL_NAV_SECTIONS.map((section) => {
      if (section.id === 'clients') {
        return {
          ...section,
          items: section.items.map((item) =>
            item.id === 'client-list' ? { ...item, badgeCount: clientCount } : item,
          ),
        };
      }

      if (section.id === 'overview' || section.id === 'finance') {
        return {
          ...section,
          items: section.items.map(applyRfqBadge),
        };
      }

      return section;
    });
  });

  ngOnInit(): void {
    void this.clientStore.loadClients({ page: 1, pageSize: 1 });
    void this.loadSubmittedRfqCount();

    this.syncExpandedSectionsForUrl(this.router.url);

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event) => {
        const url = event.urlAfterRedirects ?? event.url;
        this.currentUrl.set(url);
        this.syncExpandedSectionsForUrl(url);
      });
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((collapsed) => !collapsed);
  }

  protected toggleSidebarSection(sectionId: string): void {
    this.expandedSidebarSections.update((current) => {
      const next = new Set(current);

      if (next.has(sectionId)) {
        next.delete(sectionId);
      } else {
        next.add(sectionId);
      }

      return next;
    });
  }

  protected isSidebarSectionExpanded(sectionId: string): boolean {
    return this.expandedSidebarSections().has(sectionId);
  }

  private async loadSubmittedRfqCount(): Promise<void> {
    try {
      const result = await firstValueFrom(this.rfqApi.getRfqs(undefined, 2, 1, 1));
      this.submittedRfqCount.set(result.totalCount);
      if (result.totalCount > 0) {
        this.ensureSectionExpanded('overview');
        this.ensureSectionExpanded('finance');
      }
    } catch {
      this.submittedRfqCount.set(0);
    }
  }

  private syncExpandedSectionsForUrl(url: string): void {
    const path = url.split('?')[0].split('#')[0];

    for (const section of BUSINESS_PORTAL_NAV_SECTIONS) {
      const matchesSection = section.items.some((item) =>
        item.exact ? path === item.route : path === item.route || path.startsWith(`${item.route}/`),
      );

      if (matchesSection) {
        this.ensureSectionExpanded(section.id);
      }
    }
  }

  private ensureSectionExpanded(sectionId: string): void {
    this.expandedSidebarSections.update((current) => {
      if (current.has(sectionId)) {
        return current;
      }

      const next = new Set(current);
      next.add(sectionId);
      return next;
    });
  }

  protected isItemActive(item: BusinessPortalNavItem): boolean {
    const path = this.currentUrl().split('?')[0].split('#')[0];

    if (item.exact) {
      return path === item.route;
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }
}
