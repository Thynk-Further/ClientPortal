import { Injectable, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const CLIENT_PORTAL_THEME_STORAGE_KEY = 'client-portal-theme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly platformId = inject(PLATFORM_ID);

  readonly isDark = signal(false);

  initialize(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const storedTheme = window.localStorage.getItem(CLIENT_PORTAL_THEME_STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldUseDark = storedTheme ? storedTheme === 'dark' : prefersDark;

    this.isDark.set(shouldUseDark);
    this.applyTheme(shouldUseDark);
  }

  toggle(): void {
    const nextValue = !this.isDark();
    this.isDark.set(nextValue);
    this.applyTheme(nextValue);
  }

  private applyTheme(useDark: boolean): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    document.documentElement.classList.toggle('dark', useDark);
    window.localStorage.setItem(CLIENT_PORTAL_THEME_STORAGE_KEY, useDark ? 'dark' : 'light');
  }
}
