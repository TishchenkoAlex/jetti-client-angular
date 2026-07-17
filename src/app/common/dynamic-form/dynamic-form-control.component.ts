import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  Input,
  OnDestroy,
  OnInit,
  Output,
  EventEmitter,
} from "@angular/core";
import { UntypedFormGroup } from "@angular/forms";
import { Subscription } from "rxjs";
import { ApiService } from "../../services/api.service";
import { FormControlInfo } from "./dynamic-form-base";
import { DocService } from "../doc.service";
import { getFormGroup } from "./dynamic-form.service";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "j-control",
  templateUrl: "dynamic-form-control.component.html",
})
export class DynamicFormControlComponent implements OnInit, OnDestroy {
  readonly scriptEditorOptions = { language: 'javascript', theme: 'vs' };

  @Input() control: FormControlInfo;
  @Input() form: UntypedFormGroup;
  @Input() appendTo;
  @Output() change = new EventEmitter();
  get formControl() { return this.form.get(this.control.key); }

  valueChanges$: Subscription = Subscription.EMPTY;

  _dateTimeValue: Date | null | string;
  get dateTimeValue() {
    return this._dateTimeValue instanceof Date ? this._dateTimeValue : null;
  }
  set dateTimeValue(value: null | string | Date) {
    this._dateTimeValue = value instanceof Date ? value : null;
  }
  get isEMPTY() {
    return !this.formControl.value;
  }

  // parseDate(dateString: string) {
  //   const date = dateString ? new Date(dateString) : null;
  //   if (date instanceof Date) {
  //     if (!dateString.includes('T'))
  //       date.setHours(0, 0, 0, 0);
  //     this.formControl.setValue(date);
  //   } else if (!date && this.control.required) this.formControl.setErrors({ 'invalid date': true });
  //   else if (!date && !this.control.required) this.formControl.setValue(date);
  // }

  parseDate(dateString: string) {
    var raw = dateString ? dateString.trim() : "";

    // Пусто
    if (!raw) {
      if (this.control && this.control.required) {
        this.formControl.setErrors({ invalidDate: true });
      } else {
        this.formControl.setErrors(null);
        this.formControl.setValue(null);
      }
      return;
    }

    // Fix для "+02" / "+0200" приклеенного в начале перед годом
    var normalized = raw
      .replace(/^\+02(?=\d{4}-)/, "")
      .replace(/^\+0200(?=\d{4}-)/, "");

    var date = new Date(normalized);

    // Не дата
    if (isNaN(date.getTime())) {
      this.formControl.setErrors({ invalidDate: true });
      return;
    }

    // === НОВОЕ: 01.01.0001 считаем пустым ===
    var year = date.getFullYear();
    var month = date.getMonth(); // 0-based
    var day = date.getDate();

    if (year === 1 && month === 0 && day === 1) {
      if (this.control && this.control.required) {
        this.formControl.setErrors({ required: true });
      } else {
        this.formControl.setErrors(null);
        this.formControl.setValue(null);
      }
      return;
    }

    // Если нет времени — ставим начало дня
    if (normalized.indexOf("T") === -1) {
      date.setHours(0, 0, 0, 0);
    }

    // Жесткий диапазон лет 1900..2099
    var year = date.getFullYear();
    if (year < 1900 || year > 2099) {
      this.formControl.setErrors({
        yearOutOfRange: { minYear: 1900, maxYear: 2099, actualYear: year },
      });
      return;
    }

    // Дополнительно фиксируем границы по времени (на всякий случай)
    var minDate = new Date(1900, 0, 1, 0, 0, 0, 0);
    var maxDate = new Date(2099, 11, 31, 23, 59, 59, 999);

    var t = date.getTime();
    if (t < minDate.getTime()) {
      this.formControl.setErrors({ minDate: true });
      return;
    }
    if (t > maxDate.getTime()) {
      this.formControl.setErrors({ maxDate: true });
      return;
    }

    // OK
    this.formControl.setErrors(null);
    this.formControl.setValue(date);
  }

  constructor(
    public api: ApiService,
    private cd: ChangeDetectorRef,
    private ds: DocService,
  ) {}

  ngOnInit() {
    this.dateTimeValue = this.formControl.value;

    this.valueChanges$ = this.formControl.valueChanges.subscribe(
      async (value) => {
        this.change.emit(value);
        if (this.form.root["metadata"] && this.form.root["metadata"].module) {
          const func = new Function("", this.form.root["metadata"].module).bind(
            this,
          )();
          const method = func[this.control.key + "_OnChange"];
          if (method) await method();
        }
        if (
          this.formControl &&
          (this.control.onChange || this.control.onChangeServer)
        ) {
          if (this.control.onChange) {
            const funcBody = (this.control.onChange
              .toString()
              .match(/function[^{]+\{([\s\S]*)\}$/) || [])[1].replace(
              /\api\./g,
              "await api.",
            );
            const func = new Function(
              "doc, value, api, body",
              `
            var AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
            var func = new AsyncFunction('doc, value, api', body);
            return func(doc, value, api, body);
            `,
            );
            const patch = await func(
              this.form.getRawValue(),
              value,
              this.api,
              funcBody,
            );
            if (patch !== undefined) {
              this.form.patchValue(patch || {});
              this.cd.markForCheck();
            }
          }

          if (this.control.onChangeServer) {
            this.api
              .valueChanges(
                (this.form.root as UntypedFormGroup).getRawValue(),
                this.control.key,
                value,
              )
              .then((patch) => {
                const form = getFormGroup(patch.schema, patch.model, true);
                form["metadata"] = patch.metadata;
                this.ds.form(form);
              });
          }
        }
      },
    );
  }

  emptyValueByType = (type: string) => {
    switch (type) {
      case "number":
        return 0;
      default:
        return "";
    }
  };

  handleReset = (event: Event) =>
    this.formControl.setValue(this.emptyValueByType(this.control.type));
  handleOpenURL = (event?: Event) =>
    window.open(this.formControl.value, "_blank");

  marginTop() {
    if (!this.control.showLabel) return;
    if (this.control.type === "datetime" || this.control.type === "date")
      return "24px";
    else return "24px";
  }

  ngOnDestroy() {
    this.valueChanges$.unsubscribe();
  }
}
