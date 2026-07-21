import { Injectable } from '@angular/core';
import { UntypedFormArray } from '@angular/forms';
import { Observable, Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class DynamicTableRefreshService {
  private readonly streams = new WeakMap<UntypedFormArray, Subject<void>>();

  changes(formArray: UntypedFormArray): Observable<void> {
    return this.stream(formArray).asObservable();
  }

  refresh(formArray: UntypedFormArray): void {
    this.stream(formArray).next();
  }

  private stream(formArray: UntypedFormArray): Subject<void> {
    let stream = this.streams.get(formArray);
    if (!stream) {
      stream = new Subject<void>();
      this.streams.set(formArray, stream);
    }
    return stream;
  }
}
