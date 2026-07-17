import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { take } from 'rxjs/operators';
import {
  BusinessProcessEvent,
  BusinessProcessInstance,
} from '../../models/business-process.models';
import { BusinessProcessApiService } from '../../services/business-process-api.service';

@Component({
  selector: 'bp-process-panel',
  templateUrl: './process-panel.component.html'
})
export class ProcessPanelComponent implements OnChanges {
  @Input() objectType: string;
  @Input() objectId: string;

  instance: BusinessProcessInstance;
  events: BusinessProcessEvent[] = [];
  loading = false;
  error = '';

  constructor(private readonly api: BusinessProcessApiService) {}

  ngOnChanges(changes: SimpleChanges) {
    if (changes.objectType || changes.objectId) {
      this.load();
    }
  }

  load() {
    this.instance = null;
    this.events = [];
    this.error = '';

    if (!this.objectType || !this.objectId) return;

    this.loading = true;
    this.api.getInstanceByObject(this.objectType, this.objectId).pipe(take(1)).subscribe(
      instance => {
        this.loading = false;
        this.instance = instance;
        if (this.instance) this.loadEvents(this.instance.id);
      },
      error => this.handleError(error)
    );
  }

  private loadEvents(instanceId: string) {
    this.api.getEvents(instanceId).pipe(take(1)).subscribe(
      events => this.events = events || [],
      error => this.handleError(error)
    );
  }

  private handleError(error: any) {
    this.loading = false;
    this.error = this.getErrorMessage(error, 'Business-process data loading failed');
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (error && error.error && error.error.message) return error.error.message;
    if (error && error.message) return error.message;
    return fallback;
  }
}
