import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'ui-icon-action-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button
      type="button"
      class="group relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-muted/50 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
      [disabled]="disabled()"
      [attr.aria-label]="label()"
      [attr.title]="label()"
      (click)="clicked.emit($event)"
    >
      <ng-content />

      <span
        class="pointer-events-none absolute bottom-[calc(100%+0.4rem)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-xs font-medium text-background opacity-0 shadow-md transition-opacity duration-150 group-hover:opacity-100 group-focus-visible:opacity-100"
        role="tooltip"
      >
        {{ label() }}
      </span>
    </button>
  `,
})
export class IconActionButtonComponent {
  readonly label = input.required<string>();
  readonly disabled = input(false);

  readonly clicked = output<MouseEvent>();
}
