import {
  ChangeDetectionStrategy,
  Component,
  OnInit,
  PLATFORM_ID,
  inject,
  signal,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router, RouterOutlet } from '@angular/router';

import { BusinessPortalSidebarComponent } from './business-portal-sidebar.component';
import { DashboardTopBarComponent } from './dashboard-top-bar.component';
import { PageBreadcrumbComponent } from './page-breadcrumb.component';

@Component({
  selector: 'app-authenticated-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, BusinessPortalSidebarComponent, DashboardTopBarComponent, PageBreadcrumbComponent],
  template: `
    <div class="flex min-h-screen bg-background font-sans text-foreground antialiased">
      <app-business-portal-sidebar />

      <div class="flex min-h-screen min-w-0 flex-1 flex-col">
        <app-dashboard-top-bar
          [isDark]="isDark()"
          (themeToggle)="toggleTheme()"
          (newClient)="onNewClient()"
        />

        <div class="min-h-0 flex-1 overflow-y-auto">
          <app-page-breadcrumb />
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AuthenticatedToolbarComponent implements OnInit {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly router = inject(Router);
  private readonly storageKey = 'business-portal-theme';

  protected readonly isDark = signal(false);

  ngOnInit(): void {
    this.initializeTheme();
  }

  protected toggleTheme(): void {
    const nextValue = !this.isDark();
    this.isDark.set(nextValue);
    this.applyTheme(nextValue);
  }

  protected onNewClient(): void {
    void this.router.navigate(['/clients/invite-onboarding']);
  }

  private initializeTheme(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedTheme = window.localStorage.getItem(this.storageKey);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    this.isDark.set(shouldUseDark);
    this.applyTheme(shouldUseDark);
  }

  private applyTheme(useDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.classList.toggle('dark', useDark);
    window.localStorage.setItem(this.storageKey, useDark ? 'dark' : 'light');
  }
}
