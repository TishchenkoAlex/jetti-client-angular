import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { take } from 'rxjs/operators';
import { BusinessProcessTask } from '../../models/business-process.models';
import { BusinessProcessApiService } from '../../services/business-process-api.service';

@Component({
  selector: 'bp-my-tasks-page',
  templateUrl: './my-tasks-page.component.html'
})
export class MyTasksPageComponent implements OnInit {
  tasks: BusinessProcessTask[] = [];
  loading = false;
  error = '';
  includeCompleted = false;
  limit = 50;

  columns = [
    { field: 'title', header: 'Title', type: 'string', style: { width: '18em' } },
    { field: 'objectType', header: 'Object type', type: 'string', style: { width: '14em' } },
    { field: 'objectId', header: 'Object ID', type: 'string', style: { width: '18em' } },
    { field: 'stepKey', header: 'Step', type: 'string', style: { width: '12em' } },
    { field: 'status', header: 'Status', type: 'string', style: { width: '10em' } },
    { field: 'activeFrom', header: 'Active from', type: 'date', style: { width: '12em' } },
    { field: 'dueAt', header: 'Due at', type: 'date', style: { width: '12em' } },
    { field: 'penaltyAmount', header: 'Penalty', type: 'number', style: { width: '8em', 'text-align': 'right' } }
  ];

  constructor(private readonly api: BusinessProcessApiService, private readonly router: Router) {}

  ngOnInit() {
    this.loadTasks();
  }

  loadTasks() {
    this.loading = true;
    this.error = '';
    this.api.getMyTasks({
      includeCompleted: this.includeCompleted,
      limit: this.limit
    }).pipe(take(1)).subscribe(
      tasks => {
        this.tasks = tasks || [];
        this.loading = false;
      },
      error => {
        this.error = this.getErrorMessage(error, 'Task loading failed');
        this.loading = false;
      }
    );
  }

  open(task: BusinessProcessTask) {
    if (!task || !task.objectType || !task.objectId) return;
    this.router.navigate([task.objectType, task.objectId]);
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (error && error.error && error.error.message) return error.error.message;
    if (error && error.message) return error.message;
    return fallback;
  }
}
