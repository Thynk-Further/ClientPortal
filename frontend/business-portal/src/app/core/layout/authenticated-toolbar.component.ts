import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';

import { UserAccountMenuComponent } from './user-account-menu.component';

@Component({
  selector: 'app-authenticated-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink, RouterOutlet, UserAccountMenuComponent],
  template: `
    <div class="min-h-screen bg-muted/30">
      <header
        class="sticky top-0 z-40 flex items-center justify-between gap-3 border-b bg-background px-4 py-3 sm:px-6"
      >
        <a
          routerLink="/dashboard"
          class="text-sm font-semibold tracking-tight text-foreground hover:text-primary"
        >
          Business Portal
        </a>

        <app-user-account-menu />
      </header>

      <router-outlet />
    </div>
  `,
})
export class AuthenticatedToolbarComponent {}
