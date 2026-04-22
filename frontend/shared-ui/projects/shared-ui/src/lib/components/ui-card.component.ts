import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'ui-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <article class="ui-card">
      <ng-content />
    </article>
  `,
  styles: `
    .ui-card {
      border: 1px solid #e2e8f0;
      border-radius: 0.75rem;
      background: #ffffff;
      padding: 1rem;
      box-shadow: 0 1px 2px rgb(15 23 42 / 0.08);
    }
  `,
})
export class UiCardComponent {}
