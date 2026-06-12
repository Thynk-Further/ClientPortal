import {
  ChangeDetectionStrategy,
  Component,
  forwardRef,
  input,
} from '@angular/core';
import {
  ControlValueAccessor,
  NG_VALUE_ACCESSOR,
} from '@angular/forms';

import { cn } from '@/components/lib/utils';

@Component({
  selector: 'ui-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => InputComponent),
      multi: true,
    },
  ],
  template: `
    <input
      [type]="type()"
      [value]="value"
      [placeholder]="placeholder()"
      [disabled]="disabled"
      [class]="classes()"
      (input)="onInput($event)"
      (blur)="onBlur()"
    />
  `,
})
export class InputComponent implements ControlValueAccessor {
  readonly type = input<'text' | 'email' | 'password' | 'number' | 'search'>(
    'text',
  );
  readonly placeholder = input('');
  readonly class = input('');

  value = '';
  disabled = false;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  classes(): string {
    return cn(
      'h-9 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none transition-colors',
      'placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40',
      this.class(),
    );
  }

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }

  onInput(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.value = target.value;
    this.onChange(this.value);
  }

  onBlur(): void {
    this.onTouched();
  }
}
