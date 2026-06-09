import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { BusinessPortalSidebarComponent } from './business-portal-sidebar.component';

@Component({
  selector: 'app-authenticated-toolbar',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet, BusinessPortalSidebarComponent],
  template: `
    <div class="min-h-screen bg-muted/30 text-foreground">
      <div class="flex min-h-screen">
        <app-business-portal-sidebar />

        <div class="flex min-w-0 flex-1 flex-col">
          <router-outlet />
        </div>
      </div>
    </div>
  `,
})
export class AuthenticatedToolbarComponent {}
