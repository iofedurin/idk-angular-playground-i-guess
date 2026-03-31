import { ChangeDetectionStrategy, Component, forwardRef, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { DEPARTMENT_ICON_OPTIONS } from '../../lib/department-icon-map';

@Component({
  selector: 'app-department-icon-picker',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => DepartmentIconPickerComponent),
      multi: true,
    },
  ],
  template: `
    <div class="flex flex-wrap gap-1">
      <button
        type="button"
        class="btn btn-sm btn-ghost"
        [class.btn-active]="!selectedValue()"
        (click)="select('')"
        title="No icon"
      >
        <span class="text-base-content/40">—</span>
      </button>
      @for (opt of icons; track opt.key) {
        <button
          type="button"
          class="btn btn-sm btn-ghost"
          [class.btn-active]="selectedValue() === opt.key"
          (click)="select(opt.key)"
          [title]="opt.label"
        >
          <i [class]="'airy-' + opt.key"></i>
        </button>
      }
    </div>
  `,
})
export class DepartmentIconPickerComponent implements ControlValueAccessor {
  protected readonly selectedValue = signal('');
  protected readonly icons = DEPARTMENT_ICON_OPTIONS;

  private onChange = (_: string) => {};
  private onTouched = () => {};

  writeValue(value: string): void {
    this.selectedValue.set(value ?? '');
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  protected select(key: string): void {
    this.selectedValue.set(key);
    this.onChange(key);
    this.onTouched();
  }
}
