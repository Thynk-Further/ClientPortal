import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { cn } from '@/components/lib/utils';

type BadgeVariant =
  | 'neutral'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'muted';

const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  active: 'success',
  completed: 'success',
  paid: 'success',
  approved: 'success',
  sent: 'info',
  inprogress: 'info',
  todo: 'muted',
  blocked: 'danger',
  done: 'success',
  low: 'muted',
  medium: 'warning',
  high: 'danger',
  critical: 'danger',
  open: 'danger',
  mitigated: 'info',
  closed: 'success',
  planned: 'info',
  pending: 'warning',
  draft: 'muted',
  overdue: 'danger',
  failed: 'danger',
  cancelled: 'muted',
  archived: 'muted',
  inactive: 'muted',
};

@Component({
  selector: 'ui-status-badge',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span [class]="classes()">
      {{ label() }}
    </span>
  `,
})
export class StatusBadgeComponent {
  readonly status = input.required<string>();
  readonly class = input('');

  readonly normalizedStatus = computed(() =>
    this.status().trim().toLowerCase().replace(/[\s_-]/g, ''),
  );

  readonly variant = computed<BadgeVariant>(
    () => STATUS_VARIANT_MAP[this.normalizedStatus()] ?? 'neutral',
  );

  readonly label = computed(() => this.toReadableLabel(this.status()));

  readonly classes = computed(() =>
    cn(
      'inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium',
      this.variantClasses(this.variant()),
      this.class(),
    ),
  );

  private variantClasses(variant: BadgeVariant): string {
    switch (variant) {
      case 'success':
        return 'border-emerald-200 bg-emerald-50 text-emerald-700';
      case 'warning':
        return 'border-amber-200 bg-amber-50 text-amber-700';
      case 'danger':
        return 'border-red-200 bg-red-50 text-red-700';
      case 'info':
        return 'border-blue-200 bg-blue-50 text-blue-700';
      case 'muted':
        return 'border-zinc-200 bg-zinc-100 text-zinc-700';
      default:
        return 'border-slate-200 bg-slate-100 text-slate-700';
    }
  }

  private toReadableLabel(rawStatus: string): string {
    if (rawStatus.trim() === '') {
      return 'Unknown';
    }

    return rawStatus
      .replace(/[_-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}
