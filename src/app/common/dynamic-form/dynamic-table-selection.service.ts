import { Injectable } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import { Observable, Subject } from 'rxjs';

export interface DynamicTableSelectionEvent {
  source: 'TABLE' | 'EXTERNAL';
  row?: Record<string, unknown>;
  identityField?: string;
  identity?: unknown;
}

@Injectable({ providedIn: 'root' })
export class DynamicTableSelectionService {
  private readonly streams = new WeakMap<UntypedFormArray, Subject<DynamicTableSelectionEvent>>();

  changes(formArray: UntypedFormArray): Observable<DynamicTableSelectionEvent> {
    return this.stream(formArray).asObservable();
  }

  selectFromTable(formArray: UntypedFormArray, row?: Record<string, unknown>): void {
    this.stream(formArray).next({ source: 'TABLE', row });
  }

  selectExternal(formArray: UntypedFormArray, identityField: string, identity?: unknown): void {
    this.stream(formArray).next({ source: 'EXTERNAL', identityField, identity });
  }

  private stream(formArray: UntypedFormArray): Subject<DynamicTableSelectionEvent> {
    let stream = this.streams.get(formArray);
    if (!stream) {
      stream = new Subject<DynamicTableSelectionEvent>();
      this.streams.set(formArray, stream);
    }
    return stream;
  }
}
