import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { map } from 'rxjs/operators';
import { StorageType } from 'jetti-middle/dist';
import { ApiService } from '../../services/api.service';
// tslint:disable-next-line:max-line-length
import { AutocompleteFormControl, BooleanFormControl, DateFormControl, DateTimeFormControl, EnumFormControl, FormControlInfo, IFormControlInfo, NumberFormControl, ScriptFormControl, TableDynamicControl, TextareaFormControl, TextboxFormControl, ControlTypes, LinkFormControl, URLFormControl, HTMLFormControl, IFormControlPlacing as IFormControlPlacement } from './dynamic-form-base';

export function cloneFormGroup(formGroup: FormGroup): FormGroup {
  const newFormGroup = new FormGroup({});
  Object.keys(formGroup.controls).forEach(key => {
    const sourceFormControl = formGroup.controls[key] as FormControl;
    const cloneValue = typeof sourceFormControl.value === 'object'
      && !(sourceFormControl.value instanceof Date) ?
      { ...sourceFormControl.value } : sourceFormControl.value;
    const cloneFormControl = sourceFormControl.validator ?
      new FormControl(cloneValue, { validators: sourceFormControl.validator }) :
      new FormControl(cloneValue);
    newFormGroup.registerControl(key, cloneFormControl);
  });
  return newFormGroup;
}

const getControlValidators = (control: FormControlInfo): any[] => {
  const result = [];
  if (control.required) result.push(Validators.required);
  if (control.validators) {
    for (const validator of control.validators) {
      if (validator.value) result.push(Validators[validator.key](validator.value));
      else result.push(Validators[validator.key]);
    }
  }
  return result;
};

function toFormGroup(controls: FormControlInfo[]) {
  const group: { [key: string]: AbstractControl } = {};

  controls.forEach(control => {
    if (control instanceof TableDynamicControl) {
      const Row: { [key: string]: AbstractControl } = {};
      const arr: FormGroup[] = [];
      for (const item of control.controls) {
        Row[item.key] = new FormControl(item.value, getControlValidators(item));
        Row[item.key]['formControlInfo'] = item;
      }
      arr.push(new FormGroup(Row));
      group[control.key] = new FormArray(arr, getControlValidators(control));
    } else {
      group[control.key] = new FormControl(control.value, getControlValidators(control));
    }
    group[control.key]['formControlInfo'] = control;
  });
  const result = new FormGroup(group);
  return result;
}

export const patchOptionsNoEvents = { onlySelf: false, emitEvent: false, emitModelToViewChange: false, emitViewToModelChange: false };

export function getFormGroup(schema: { [x: string]: any }, model: { [x: string]: any }, isExists: boolean): FormGroup {
  let controls: FormControlInfo[] = [];

  const processRecursive = (v: { [x: string]: any }, f: FormControlInfo[]) => {
    Object.keys(v).map(key => {
      const prop = v[key];
      const hidden = !!prop['hidden'];
      const order = hidden ? -1 : prop['order'] * 1 || 999;
      const label: string = prop['label'] || key.toString();
      const type = prop['type'] || 'string' as string;
      const controlType = prop['controlType'] || prop['type'] || 'string' as ControlTypes;
      const required = !!prop['required'];
      const readOnly = !!prop['readOnly'];
      const disabled = !!prop['disabled'];
      const isAdditional = !!prop['isAdditional'];
      const style = prop['style'];
      const totals = prop['totals'];
      const change = prop['change'];
      const owner = prop['owner'] || null;
      const onChange = prop['onChange'];
      const onChangeServer = !!prop['onChangeServer'];
      const storageType = prop['storageType'] as StorageType || 'elements';
      const headerStyle = prop['headerStyle'];
      const showLabel = prop['showLabel'] || true;
      const valuesOptions = prop['valuesOptions'] || [];
      const validators = prop['validators'];
      const panel = prop['panel'];
      const fieldset = prop['fieldset'];
      let value = prop['value'];
      let newControl: FormControlInfo;
      const controlOptions: IFormControlInfo = {
        key, label, type: controlType, required, readOnly, headerStyle, showLabel, valuesOptions, controlType,
        hidden, disabled, change, order, style, onChange, owner, totals, onChangeServer, value, storageType,
        isAdditional, validators, panel: panel, fieldset: fieldset
      };
      switch (controlType) {
        case 'table':
          value = [];
          processRecursive(v[key][key] || {}, value);
          newControl = new TableDynamicControl(controlOptions);
          (newControl as TableDynamicControl).controls = value;
          break;
        case 'boolean':
          newControl = new BooleanFormControl(controlOptions);
          break;
        case 'date':
          newControl = new DateFormControl(controlOptions);
          break;
        case 'datetime':
          newControl = new DateTimeFormControl(controlOptions);
          break;
        case 'number':
          newControl = new NumberFormControl(controlOptions);
          break;
        case 'javascript': case 'json':
          newControl = new ScriptFormControl(controlOptions);
          break;
        case 'textarea':
          newControl = new TextareaFormControl(controlOptions);
          break;
        case 'enum':
          newControl = new EnumFormControl(controlOptions);
          break;
        case 'link':
          newControl = new LinkFormControl(controlOptions);
          break;
        case 'URL':
          newControl = new URLFormControl(controlOptions);
          break;
        case 'HTML':
          newControl = new HTMLFormControl(controlOptions);
          break;
        default:
          if (type.includes('.')) {
            controlOptions.type = controlType; // здесь нужен тип ссылки
            newControl = new AutocompleteFormControl(controlOptions);
            break;
          }
          newControl = new TextboxFormControl(controlOptions);
          break;
      }
      f.push(newControl);
    });
    f.sort((a, b) => a.order - b.order);
  };

  processRecursive(schema, controls);
  const companyControl = controls.find(e =>
    e.controlType === 'autocomplete'
    && e.type === 'Catalog.Company'
    && !e.required
    && !e.disabled
    && (e.order || 1) > 0
    && !e.hidden);
  if (companyControl) companyControl.required = true;
  const formGroup = toFormGroup(controls);

  // Create formArray's for table parts of document
  Object.keys(formGroup.controls)
    .filter(property => formGroup.controls[property] instanceof FormArray)
    .forEach(property => {
      const sample = (formGroup.controls[property] as FormArray).controls[0] as FormGroup;
      sample.addControl('index', new FormControl(0));
      const formArray = formGroup.controls[property] as FormArray;
      if (isExists) {
        if (!model[property]) { model[property] = []; }
        for (let i = 0; i < model[property].length; i++) {
          const newFormGroup = cloneFormGroup(sample);
          newFormGroup.controls['index'].setValue(i, patchOptionsNoEvents);
          formArray.push(newFormGroup);
        }
      }
      formArray['sample'] = cloneFormGroup(formArray.at(0) as FormGroup);
      formArray.removeAt(0);
    });

  if (!model.timestamp)
    model.company = { id: null, code: null, value: null, type: 'Catalog.Company' };

  formGroup.patchValue(model, patchOptionsNoEvents);
  formGroup['schema'] = schema;

  controls = [
    ...controls.filter(el => el.order > 0 && el.controlType !== 'table' && !(el.key === 'f1' || el.key === 'f2' || el.key === 'f3')),
    ...controls.filter(el => el.order > 0 && el.controlType === 'table' && !(el.key === 'f1' || el.key === 'f2' || el.key === 'f3')),
    ...controls.filter(el => el.order <= 0 && !(el.key === 'f1' || el.key === 'f2' || el.key === 'f3'))
  ];
  const byKeyControls: { [s: string]: FormControlInfo } = {};
  controls.forEach(c => { byKeyControls[c.key] = c; });

  const controlsSeparator = (panel: string, control: FormControlInfo[]): IFormControlPlacement => {
    const result: IFormControlPlacement = { panel: panel };
    const fielsets = [...new Set(control.filter(el => el.fieldset).map(el => el.fieldset))];
    result.fieldsets = fielsets.map(fieldset => ({
      fieldset: fieldset,
      controls: control.filter(el => el.fieldset === fieldset)
    }));
    result.tables = control.filter(el => el.controlType === 'table');
    result.standalone = control.filter(el => !['table', 'textarea', 'script', 'HTML'].includes(el.controlType) && !el.fieldset);
    result.fullwidth = control.filter(el => ['textarea', 'script', 'HTML'].includes(el.controlType));
    return result;
  };

  const panels = [...new Set(controls.filter(el => el.panel).map(el => el.panel))];
  const controlsPlacement: IFormControlPlacement[] = [
    controlsSeparator('Main', controls.filter(el => !el.panel && !el.isAdditional && !el.hidden)),
    controlsSeparator('Additional info', controls.filter(el => ['parent', 'user'].includes(el.key) && !el.hidden)),
    controlsSeparator('Additional fields', controls.filter(el => !el.panel && el.isAdditional && !el.hidden)),
    ...panels.map(panel => controlsSeparator(panel, controls.filter(el => el.panel === panel && !el.hidden)))
  ];

  formGroup['orderedControls'] = controls;
  formGroup['byKeyControls'] = byKeyControls;
  formGroup['controlsPlacement'] = controlsPlacement
    .filter(e => e.fieldsets.length || e.standalone.length || e.tables.length || e.fullwidth.length);

  return formGroup;
}

@Injectable()
export class DynamicFormService {

  constructor(public api: ApiService) { }

  getViewModel$(docType: string, docID = '', queryParams: { [key: string]: any } = {}) {
    return this.api.getViewModel(docType, docID, queryParams).pipe(
      map(response => {
        const form = getFormGroup(response.schema, response.model, docID !== 'new');
        form['metadata'] = response.metadata;
        return form;
      }));
  }

  getFormView$(type: string) {
    return this.api.getFormView(type).pipe(
      map(response => {
        const form = getFormGroup(response.schema, {}, false);
        form['metadata'] = response.metadata;
        return form;
      }));
  }

  // getFormView$(type: string) {
  //   const form = createForm({ type: type });
  //   const view = form.Props();
  //   const result = getFormGroup(view, {}, false);
  //   result['metadata'] = form.Prop();
  //   return of(result);
  // }

}
