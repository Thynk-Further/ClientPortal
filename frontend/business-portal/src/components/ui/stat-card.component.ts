import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { cn } from '@/components/lib/utils';

type TrendDirection = 'up' | 'down' | 'neutral';

@Component({
  selector: 'ui-stat-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article [class]="classes()">
      <div class="flex items-start justify-between gap-3">
        <p class="text-sm font-medium text-muted-foreground">{{ label() }}</p>
        <span
          class="grid h-9 w-9 shrink-0 place-content-center rounded-full"
          [style.background-color]="accentBg()"
          [style.color]="accentColor()"
        >
          <svg class="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
            <path
              [attr.d]="iconPath()"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="1.75"
            />
          </svg>
        </span>
      </div>

      <p class="mt-2 text-[1.75rem] font-semibold leading-none tracking-tight text-foreground">
        {{ value() }}
      </p>

      <svg
        class="mt-4 h-10 w-full"
        viewBox="0 0 100 24"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <filter [attr.id]="filterId" x="-10%" y="-40%" width="120%" height="180%">
            <feDropShadow
              dx="0"
              dy="0"
              [attr.stdDeviation]="sparklineGlow()"
              [attr.flood-color]="accentColor()"
              flood-opacity="0.55"
            />
          </filter>
        </defs>
        <polyline
          [attr.points]="sparklinePoints()"
          fill="none"
          [attr.stroke]="accentColor()"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          [attr.filter]="'url(#' + filterId + ')'"
        />
      </svg>

      @if (showTrend()) {
        <p [class]="trendClasses()">
          <span class="font-semibold">{{ trendPrefix() }}{{ trendValue() }}</span>
          @if (trendLabel() !== '') {
            <span class="font-normal text-muted-foreground">{{ trendLabel() }}</span>
          }
        </p>
      } @else if (footnote() !== '') {
        <p class="mt-2 text-xs text-muted-foreground">{{ footnote() }}</p>
      }
    </article>
  `,
})
export class StatCardComponent {
  private static nextId = 0;

  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly iconPath = input.required<string>();
  readonly accentColor = input.required<string>();
  readonly accentBg = input.required<string>();
  readonly sparkline = input<ReadonlyArray<number>>([12, 16, 14, 20, 18, 24, 22, 26, 28, 30, 27, 32]);
  readonly trendValue = input<string | number>('');
  readonly trendLabel = input('');
  readonly trendDirection = input<TrendDirection>('neutral');
  readonly footnote = input('');
  readonly class = input('');

  protected readonly filterId = `stat-sparkline-${StatCardComponent.nextId++}`;

  readonly showTrend = computed(() => `${this.trendValue()}`.trim() !== '');

  readonly classes = computed(() =>
    cn(
      'overflow-hidden rounded-2xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm dark:border-white/10 dark:bg-card dark:shadow-[0_12px_40px_rgba(0,0,0,0.35)]',
      this.class(),
    ),
  );

  protected sparklineGlow(): string {
    return '1.2';
  }

  protected sparklinePoints(): string {
    const values = this.sparkline();
    if (values.length === 0) {
      return '';
    }

    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    return values
      .map((point, index) => {
        const x = values.length === 1 ? 50 : (index / (values.length - 1)) * 100;
        const y = 22 - ((point - min) / range) * 18;
        return `${x},${y}`;
      })
      .join(' ');
  }

  trendPrefix(): string {
    if (this.trendDirection() === 'up') {
      return '+';
    }

    if (this.trendDirection() === 'down') {
      return '-';
    }

    return '';
  }

  trendClasses(): string {
    const base = 'mt-2 text-xs font-medium';
    switch (this.trendDirection()) {
      case 'up':
        return `${base} text-emerald-600 dark:text-emerald-400`;
      case 'down':
        return `${base} text-red-500 dark:text-red-400`;
      default:
        return `${base} text-muted-foreground`;
    }
  }
}
