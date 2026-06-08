import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { cn } from '@/components/lib/utils';
import { ProjectHealth } from '@/app/core/api/services/project-api.service';

@Component({
  selector: 'app-project-health-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes()">{{ label() }}</span>
  `,
})
export class ProjectHealthBadgeComponent {
  readonly health = input.required<ProjectHealth>();

  readonly label = computed(() => {
    switch (this.health()) {
      case 1:
        return 'Green';
      case 2:
        return 'Amber';
      case 3:
        return 'Red';
      default:
        return 'Unknown';
    }
  });

  readonly classes = computed(() =>
    cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
      this.variantClasses(),
    ),
  );

  private variantClasses(): string {
    switch (this.health()) {
      case 1:
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 2:
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 3:
        return 'border-red-200 bg-red-50 text-red-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  }
}
