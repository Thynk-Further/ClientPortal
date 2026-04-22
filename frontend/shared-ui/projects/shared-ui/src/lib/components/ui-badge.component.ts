import { ChangeDetectionStrategy, Component, input } from '@angular/core';

@Component({
  selector: 'ui-badge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <span class="ui-badge">{{ label() }}</span>
  `,
  styles: `
    .ui-badge {
      display: inline-flex;
      align-items: center;
      border-radius: 9999px;
      background: #eef2ff;
      color: #3730a3;
      font-size: 0.75rem;
      font-weight: 600;
      line-height: 1;
      padding: 0.25rem 0.625rem;
    }
  `,
})
export class UiBadgeComponent {
  readonly label = input.required<string>();
}
