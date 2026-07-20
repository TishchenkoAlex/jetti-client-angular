import { Component, EventEmitter, forwardRef, Input, Output } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CheckboxModule } from 'primeng/checkbox';

export interface TriStateCheckboxChangeEvent {
  originalEvent: Event;
  value: boolean | null;
}

@Component({
  selector: 'j-tri-state-checkbox',
  standalone: true,
  imports: [CheckboxModule, FormsModule],
  template: `
    <p-checkbox
      [binary]="true"
      [disabled]="disabled"
      [indeterminate]="value === null"
      [ngModel]="value === true"
      (onChange)="toggle($event.originalEvent)"
    />
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TriStateCheckboxComponent),
      multi: true,
    },
  ],
})
export class TriStateCheckboxComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Output() readonly triStateChange = new EventEmitter<TriStateCheckboxChangeEvent>();

  value: boolean | null = null;

  private propagateChange: (value: boolean | null) => void = () => undefined;
  private propagateTouched: () => void = () => undefined;

  toggle(originalEvent: Event): void {
    this.value = this.value === null ? true : this.value ? false : null;
    this.propagateChange(this.value);
    this.propagateTouched();
    this.triStateChange.emit({ originalEvent, value: this.value });
  }

  writeValue(value: boolean | null | undefined): void {
    this.value = value ?? null;
  }

  registerOnChange(fn: (value: boolean | null) => void): void {
    this.propagateChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.propagateTouched = fn;
  }

  setDisabledState(disabled: boolean): void {
    this.disabled = disabled;
  }
}
