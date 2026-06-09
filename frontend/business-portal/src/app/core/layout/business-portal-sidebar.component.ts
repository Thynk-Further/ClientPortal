import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

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
      class="flex min-h-screen flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 transition-all duration-300"
      [class.w-64]="!sidebarCollapsed()"
      [class.w-20]="sidebarCollapsed()"
    >
      <div class="mb-6 flex items-center justify-between gap-2">
        <a routerLink="/dashboard" class="flex items-center gap-2">
          <div class="grid h-9 w-9 place-content-center rounded-lg bg-primary text-primary-foreground">
            Z
          </div>
          @if (!sidebarCollapsed()) {
            <div>
              <p class="text-sm font-semibold leading-4">Business Portal</p>
              <p class="text-xs text-muted-foreground">Operations</p>
            </div>
          }
        </a>

        <button
          type="button"
          class="grid h-8 w-8 place-content-center rounded-md border bg-background hover:bg-muted"
          (click)="toggleSidebar()"
          [attr.aria-label]="sidebarCollapsed() ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          <svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </div>

      <nav class="flex-1 space-y-5" aria-label="Sidebar">
        @for (section of sidebarSections(); track section.id) {
          <div class="space-y-1.5">
            @if (!sidebarCollapsed()) {
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md px-2 py-1 text-left hover:bg-muted/50"
                [attr.aria-label]="'Toggle ' + section.label + ' section'"
                [attr.aria-expanded]="isSidebarSectionExpanded(section.id)"
                (click)="toggleSidebarSection(section.id)"
              >
                <span class="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground/80">
                  {{ section.label }}
                </span>
                <svg
                  class="h-3.5 w-3.5 text-muted-foreground/70 transition-transform duration-200"
                  [class.rotate-90]="isSidebarSectionExpanded(section.id)"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
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
                  class="flex items-center rounded-lg px-3 py-2 text-sm transition-colors"
                  [class.bg-sidebar-accent]="isItemActive(item)"
                  [class.text-sidebar-accent-foreground]="isItemActive(item)"
                  [class.text-muted-foreground]="!isItemActive(item)"
                  [class.hover:bg-muted]="!isItemActive(item)"
                >
                  <svg class="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path
                      [attr.d]="item.iconPath"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="1.8"
                    />
                  </svg>
                  @if (!sidebarCollapsed()) {
                    <span class="ml-3 flex-1">{{ item.label }}</span>
                    @if (item.badgeCount !== undefined) {
                      <span
                        class="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold leading-4 text-foreground"
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

      <div class="mt-4 border-t border-sidebar-border pt-4">
        @if (sidebarCollapsed()) {
          <app-user-account-menu />
        } @else {
          <app-user-account-menu layout="sidebar" />
        }
      </div>
    </aside>
  `,
})
export class BusinessPortalSidebarComponent implements OnInit {
  private readonly router = inject(Router);
  private readonly clientStore = inject(ClientStore);

  protected readonly sidebarCollapsed = signal(false);
  protected readonly expandedSidebarSections = signal<ReadonlySet<string>>(
    new Set(BUSINESS_PORTAL_NAV_SECTIONS.map((section) => section.id)),
  );
  protected readonly currentUrl = signal(this.router.url);

  protected readonly sidebarSections = computed<ReadonlyArray<BusinessPortalNavSection>>(() => {
    const clientCount = this.clientStore.totalCount();

    return BUSINESS_PORTAL_NAV_SECTIONS.map((section) => {
      if (section.id !== 'clients') {
        return section;
      }

      return {
        ...section,
        items: section.items.map((item) =>
          item.id === 'client-list' ? { ...item, badgeCount: clientCount } : item,
        ),
      };
    });
  });

  ngOnInit(): void {
    void this.clientStore.loadClients({ page: 1, pageSize: 1 });

    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe(() => {
        this.currentUrl.set(this.router.url);
      });
  }

  protected toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => !value);
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

  protected isItemActive(item: BusinessPortalNavItem): boolean {
    const path = this.currentUrl().split('?')[0].split('#')[0];

    if (item.exact) {
      return path === item.route;
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }
}
