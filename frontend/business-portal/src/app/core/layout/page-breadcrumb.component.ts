import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { BusinessPortalBreadcrumbService } from './business-portal-breadcrumb.service';

@Component({
  selector: 'app-page-breadcrumb',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterLink],
  template: `
    @if (breadcrumbService.items(); as crumbs) {
      <nav
        class="px-5 pt-5 text-sm text-muted-foreground sm:px-8"
        aria-label="Breadcrumb"
      >
        <ol class="flex flex-wrap items-center gap-1.5">
          @for (crumb of crumbs; track crumb.label; let last = $last) {
            <li class="flex items-center gap-1.5">
              @if (!last && crumb.route) {
                <a
                  [routerLink]="crumb.route"
                  class="transition-colors hover:text-foreground"
                >
                  {{ crumb.label }}
                </a>
              } @else {
                <span [class.text-foreground]="last" [class.font-medium]="last">
                  {{ crumb.label }}
                </span>
              }

              @if (!last) {
                <span class="text-muted-foreground/60" aria-hidden="true">&gt;</span>
              }
            </li>
          }
        </ol>
      </nav>
    }
  `,
})
export class PageBreadcrumbComponent implements OnInit {
  protected readonly breadcrumbService = inject(BusinessPortalBreadcrumbService);
  private readonly router = inject(Router);

  ngOnInit(): void {
    this.breadcrumbService.bindRouter(this.router);
  }
}
