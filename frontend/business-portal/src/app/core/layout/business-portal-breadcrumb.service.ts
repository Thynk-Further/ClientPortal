import { Injectable, computed, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
  BUSINESS_PORTAL_NAV_SECTIONS,
  BusinessPortalNavItem,
  BusinessPortalNavSection,
} from './business-portal-nav.config';

export interface BreadcrumbItem {
  readonly label: string;
  readonly route?: string;
}

const OVERVIEW_SECTION_ID = 'overview';

@Injectable({ providedIn: 'root' })
export class BusinessPortalBreadcrumbService {
  private readonly currentPath = signal('');
  private readonly leafBreadcrumb = signal<string | null>(null);
  private readonly leafTitle = signal<string | null>(null);
  private readonly dynamicTrail = signal<ReadonlyArray<BreadcrumbItem>>([]);

  readonly items = computed<ReadonlyArray<BreadcrumbItem> | null>(() => {
    const path = this.currentPath();
    if (path === '' || path === '/dashboard') {
      return null;
    }

    const section = this.findSectionForPath(path);
    if (section === null || section.id === OVERVIEW_SECTION_ID) {
      return null;
    }

    const crumbs: BreadcrumbItem[] = [
      { label: 'Dashboard', route: '/dashboard' },
      {
        label: section.breadcrumbLabel,
        route: this.getSectionLandingRoute(section),
      },
    ];

    const dynamicTrail = this.dynamicTrail();

    if (dynamicTrail.length === 0) {
      const navItem = this.findBestNavItem(path);
      const pageLabel =
        this.leafBreadcrumb()
        ?? (navItem !== null && this.isExactNavPage(path, navItem) ? navItem.label : null)
        ?? this.leafTitle();

      if (pageLabel !== null && pageLabel !== section.breadcrumbLabel) {
        crumbs.push({ label: pageLabel });
      }
    } else {
      for (const item of dynamicTrail) {
        const last = crumbs[crumbs.length - 1];
        if (last?.label === item.label) {
          continue;
        }
        crumbs.push(item);
      }
    }

    const last = crumbs[crumbs.length - 1];
    if (last !== undefined) {
      crumbs[crumbs.length - 1] = { label: last.label };
    }

    return crumbs;
  });

  bindRouter(router: Router): void {
    const sync = (): void => {
      this.currentPath.set(this.normalizePath(router.url));
      const leaf = this.getLeafRoute(router.routerState.snapshot.root);
      this.leafBreadcrumb.set(this.readDataString(leaf.data['breadcrumb']));
      this.leafTitle.set(this.readDataString(leaf.data['title']));
      this.clearDynamicTrail();
    };

    sync();

    router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe(() => {
      sync();
    });
  }

  setDynamicTrail(trail: ReadonlyArray<BreadcrumbItem>): void {
    this.dynamicTrail.set(trail);
  }

  clearDynamicTrail(): void {
    this.dynamicTrail.set([]);
  }

  private isExactNavPage(path: string, item: BusinessPortalNavItem): boolean {
    return path === item.route;
  }

  private readDataString(value: unknown): string | null {
    if (typeof value === 'string' && value.trim() !== '') {
      return value;
    }

    return null;
  }

  private getLeafRoute(route: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
    if (route.firstChild === null) {
      return route;
    }

    return this.getLeafRoute(route.firstChild);
  }

  private findSectionForPath(path: string): BusinessPortalNavSection | null {
    const segment = path.split('/').filter((part) => part.length > 0)[0];
    if (segment === undefined) {
      return null;
    }

    return (
      BUSINESS_PORTAL_NAV_SECTIONS.find(
        (section) => section.pathPrefix === segment && section.id !== OVERVIEW_SECTION_ID,
      ) ?? null
    );
  }

  private findBestNavItem(path: string): BusinessPortalNavItem | null {
    let bestMatch: BusinessPortalNavItem | null = null;

    for (const section of BUSINESS_PORTAL_NAV_SECTIONS) {
      for (const item of section.items) {
        if (!this.pathMatchesNavItem(path, item)) {
          continue;
        }

        if (bestMatch === null || item.route.length > bestMatch.route.length) {
          bestMatch = item;
        }
      }
    }

    return bestMatch;
  }

  private pathMatchesNavItem(path: string, item: BusinessPortalNavItem): boolean {
    if (item.exact) {
      return path === item.route;
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }

  private getSectionLandingRoute(section: BusinessPortalNavSection): string {
    const listItem = section.items.find((item) => item.id.includes('list'));
    if (listItem !== undefined) {
      return listItem.route;
    }

    return section.items[0]?.route ?? `/${section.pathPrefix}`;
  }

  private normalizePath(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
}
