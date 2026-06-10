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

      @if (footnote() !== '') {
        <p class="mt-3 text-xs text-muted-foreground">{{ footnote() }}</p>
      }
    </article>
  `,
})
export class StatCardComponent {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly iconPath = input.required<string>();
  readonly accentColor = input.required<string>();
  readonly accentBg = input.required<string>();
  readonly footnote = input('');
  readonly class = input('');

  readonly classes = computed(() =>
    cn(
      'overflow-hidden rounded-2xl border border-border/70 bg-card p-4 text-card-foreground shadow-sm',
      this.class(),
    ),
  );
}
