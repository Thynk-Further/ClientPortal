import {
  ChangeDetectionStrategy,
  Component,
  ContentChild,
  ElementRef,
  computed,
  input,
  output,
} from '@angular/core';

import { cn } from '@/components/lib/utils';
import { ButtonComponent } from './button.component';

@Component({
  selector: 'ui-empty-state',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ButtonComponent],
  template: `
    <section [class]="classes()">
      <div class="mb-4 flex justify-center text-muted-foreground">
        @if (hasIllustrationTemplate()) {
          <ng-content select="[illustration]" />
        } @else {
          <div class="flex h-14 w-14 items-center justify-center rounded-full border border-dashed text-xl">
            ∅
          </div>
        }
      </div>

      <h3 class="text-lg font-semibold">{{ title() }}</h3>
      <p class="mt-1 text-sm text-muted-foreground">{{ message() }}</p>

      @if (actionLabel() !== '') {
        <div class="mt-5">
          <ui-button
            variant="outline"
            [label]="actionLabel()"
            (clicked)="actionClicked.emit()"
          />
        </div>
      }
    </section>
  `,
})
export class EmptyStateComponent {
  @ContentChild('[illustration]', { read: ElementRef })
  private illustrationElement?: ElementRef<HTMLElement>;

  readonly title = input('Nothing here yet');
  readonly message = input('There is no data to display yet.');
  readonly actionLabel = input('');
  readonly class = input('');

  readonly actionClicked = output<void>();

  readonly classes = computed(() =>
    cn(
      'rounded-xl border border-dashed bg-card p-8 text-center text-card-foreground',
      this.class(),
    ),
  );

  hasIllustrationTemplate(): boolean {
    return this.illustrationElement !== undefined;
  }
}
