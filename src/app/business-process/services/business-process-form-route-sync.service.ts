import { Injectable } from '@angular/core';
import { UntypedFormArray, UntypedFormGroup } from '@angular/forms';

import { cloneFormGroup, patchOptionsNoEvents } from '../../common/dynamic-form/dynamic-form.service';
import { DynamicTableRefreshService } from '../../common/dynamic-form/dynamic-table-refresh.service';
import { BusinessProcessBpmnRoutePreview } from '../models/business-process-bpmn-preview.models';

export interface BusinessProcessFormRouteSyncResult {
  applied: boolean;
  changed: boolean;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class BusinessProcessFormRouteSyncService {
  constructor(private readonly tableRefresh: DynamicTableRefreshService) {}

  apply(
    form: UntypedFormGroup,
    preview: BusinessProcessBpmnRoutePreview
  ): BusinessProcessFormRouteSyncResult {
    if (!preview.valid) return { applied: false, changed: false, error: 'BPMN route preview is invalid' };

    const steps = form.get('steps');
    const transitions = form.get('transitions');
    if (!(steps instanceof UntypedFormArray) || !(transitions instanceof UntypedFormArray)) {
      return {
        applied: false,
        changed: false,
        error: 'Steps and transitions controls must be table FormArrays'
      };
    }

    if (!this.sample(steps)) return this.missingSample('steps');
    if (!this.sample(transitions)) return this.missingSample('transitions');

    const stepRows = this.projectRows(steps, this.mergeExistingRows(
      steps,
      preview.route.steps,
      'key',
      ['key', 'title', 'type']
    ));
    const transitionRows = this.projectRows(transitions, this.mergeExistingRows(
      transitions,
      preview.route.transitions,
      'key',
      ['key', 'from', 'on', 'to']
    ));
    const stepsChanged = this.rowsChanged(steps, stepRows);
    const transitionsChanged = this.rowsChanged(transitions, transitionRows);
    if (!stepsChanged && !transitionsChanged) return { applied: true, changed: false };

    if (stepsChanged) this.replaceRows(steps, stepRows);
    if (transitionsChanged) this.replaceRows(transitions, transitionRows);
    return { applied: true, changed: true };
  }

  private replaceRows(formArray: UntypedFormArray, rows: Record<string, unknown>[]): void {
    const sample = this.sample(formArray) as UntypedFormGroup;
    const controls = rows.map((row, index) => {
      const control = cloneFormGroup(sample);
      control.patchValue({ ...row, index }, patchOptionsNoEvents);
      return control;
    });

    formArray.clear({ emitEvent: false });
    controls.forEach(control => formArray.push(control, { emitEvent: false }));
    formArray.markAsDirty();
    formArray.updateValueAndValidity({ emitEvent: true });
    this.tableRefresh.refresh(formArray);
  }

  private mergeExistingRows<T extends object>(
    formArray: UntypedFormArray,
    rows: T[],
    identityField: string,
    synchronizedFields: string[]
  ): Record<string, unknown>[] {
    const existingByKey: { [key: string]: Record<string, unknown> } = {};
    (formArray.getRawValue() as Array<Record<string, unknown>>).forEach(row => {
      const key = String(row?.[identityField] || '').trim();
      if (key) existingByKey[key] = row;
    });
    return rows.map(row => {
      const record = row as Record<string, unknown>;
      const key = String(record[identityField] || '').trim();
      const existing = existingByKey[key];
      if (!existing) return { ...record };

      const merged = { ...record, ...existing };
      synchronizedFields.forEach(field => merged[field] = record[field]);
      return merged;
    });
  }

  private projectRows(
    formArray: UntypedFormArray,
    rows: Record<string, unknown>[]
  ): Record<string, unknown>[] {
    const sample = this.sample(formArray) as UntypedFormGroup;
    const fields = Object.keys(sample.controls).filter(field => field !== 'index');
    return rows.map(row => fields.reduce((result, field) => {
      result[field] = row[field];
      return result;
    }, {} as Record<string, unknown>));
  }

  private rowsChanged(formArray: UntypedFormArray, nextRows: Record<string, unknown>[]): boolean {
    const current = (formArray.getRawValue() as Array<Record<string, unknown>>)
      .map(row => this.withoutIndex(row));
    const next = nextRows.map(row => this.withoutIndex(row));
    return JSON.stringify(current) !== JSON.stringify(next);
  }

  private withoutIndex(row: Record<string, unknown>): Record<string, unknown> {
    const result = { ...row };
    delete result['index'];
    return result;
  }

  private sample(formArray: UntypedFormArray): UntypedFormGroup | undefined {
    const sample = formArray['sample'];
    return sample instanceof UntypedFormGroup ? sample : undefined;
  }

  private missingSample(table: string): BusinessProcessFormRouteSyncResult {
    return {
      applied: false,
      changed: false,
      error: `Dynamic table sample is missing for ${table}`
    };
  }
}
