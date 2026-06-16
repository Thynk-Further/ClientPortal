import { Injectable, computed, signal } from '@angular/core';
import { ActivatedRouteSnapshot, NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';

import {
  CLIENT_PORTAL_NAV_ITEMS,
  ClientPortalNavItemConfig,
} from './client-portal-nav.config';

export interface BreadcrumbItem {
  readonly label: string;
  readonly route?: string;
}

@Injectable({ providedIn: 'root' })
export class ClientPortalBreadcrumbService {
  private readonly currentPath = signal('');
  private readonly leafBreadcrumb = signal<string | null>(null);
  private readonly leafTitle = signal<string | null>(null);
  private readonly dynamicTrail = signal<ReadonlyArray<BreadcrumbItem>>([]);

  readonly items = computed<ReadonlyArray<BreadcrumbItem> | null>(() => {
    const path = this.currentPath();
    if (path === '' || path === '/dashboard') {
      return null;
    }

    const crumbs: BreadcrumbItem[] = [{ label: 'Dashboard', route: '/dashboard' }];
    const navItem = this.findBestNavItem(path);
    const dynamicTrail = this.dynamicTrail();

    if (dynamicTrail.length > 0) {
      for (const item of dynamicTrail) {
        const last = crumbs[crumbs.length - 1];
        if (last?.label === item.label) {
          continue;
        }
        crumbs.push(item);
      }
    } else if (navItem !== null) {
      const pageLabel =
        this.leafBreadcrumb()
        ?? (this.isExactNavPage(path, navItem) ? navItem.label : null)
        ?? this.leafTitle();

      if (pageLabel !== null && pageLabel !== navItem.label) {
        crumbs.push({ label: navItem.label, route: navItem.route });
        if (pageLabel !== navItem.label) {
          crumbs.push({ label: pageLabel });
        }
      } else if (!this.isExactNavPage(path, navItem)) {
        crumbs.push({ label: navItem.label, route: navItem.route });
        const detailLabel = this.leafBreadcrumb() ?? this.leafTitle();
        if (detailLabel !== null && detailLabel !== navItem.label) {
          crumbs.push({ label: detailLabel });
        }
      }
    }

    if (crumbs.length <= 1) {
      return null;
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

  private isExactNavPage(path: string, item: ClientPortalNavItemConfig): boolean {
    if (item.exact) {
      return path === item.route;
    }

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

  private findBestNavItem(path: string): ClientPortalNavItemConfig | null {
    let bestMatch: ClientPortalNavItemConfig | null = null;

    for (const item of CLIENT_PORTAL_NAV_ITEMS) {
      if (!this.pathMatchesNavItem(path, item)) {
        continue;
      }

      if (bestMatch === null || item.route.length > bestMatch.route.length) {
        bestMatch = item;
      }
    }

    return bestMatch;
  }

  private pathMatchesNavItem(path: string, item: ClientPortalNavItemConfig): boolean {
    if (item.exact) {
      return path === item.route;
    }

    return path === item.route || path.startsWith(`${item.route}/`);
  }

  private normalizePath(url: string): string {
    return url.split('?')[0].split('#')[0];
  }
}
