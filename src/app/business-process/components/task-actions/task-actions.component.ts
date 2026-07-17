import { Component, EventEmitter, Input, Output } from '@angular/core';
import { take } from 'rxjs/operators';
import {
  BusinessProcessTask,
  BusinessProcessTaskActionResult,
  BusinessProcessTaskUserAction,
  TaskDelegateRequest,
  TaskRedirectRequest,
} from '../../models/business-process.models';
import { BusinessProcessApiService } from '../../services/business-process-api.service';
import {
  TaskActionDialogAction,
  TaskActionDialogResult,
} from '../task-action-dialog/task-action-dialog.component';

@Component({
  selector: 'bp-task-actions',
  templateUrl: './task-actions.component.html'
})
export class TaskActionsComponent {
  @Input() task: BusinessProcessTask;
  @Output() completed = new EventEmitter<BusinessProcessTaskActionResult>();

  loading = false;
  error = '';
  dialogVisible = false;
  dialogAction: TaskActionDialogAction | '' = '';

  constructor(private readonly api: BusinessProcessApiService) {}

  can(action: BusinessProcessTaskUserAction): boolean {
    if (!this.task || !this.task.availableActions) return false;
    return this.task.availableActions[action] === true;
  }

  approve() {
    if (!this.task || this.loading) return;
    this.loading = true;
    this.error = '';
    this.api.approveTask(this.task.id, {}).pipe(take(1)).subscribe(
      result => this.handleResult(result),
      error => this.handleError(error)
    );
  }

  openDialog(action: TaskActionDialogAction) {
    this.dialogAction = action;
    this.dialogVisible = true;
    this.error = '';
  }

  closeDialog() {
    this.dialogVisible = false;
    this.dialogAction = '';
  }

  handleDialogConfirm(result: TaskActionDialogResult) {
    if (!this.task || this.loading) return;
    this.loading = true;
    this.error = '';

    if (result.action === 'reject') {
      this.api.rejectTask(this.task.id, { comment: result.comment }).pipe(take(1)).subscribe(
        response => this.handleResult(response),
        error => this.handleError(error)
      );
      return;
    }

    if (result.action === 'redirect') {
      const body: TaskRedirectRequest = {
        userId: result.userId,
        comment: result.comment
      };
      this.api.redirectTask(this.task.id, body).pipe(take(1)).subscribe(
        response => this.handleResult(response),
        error => this.handleError(error)
      );
      return;
    }

    if (result.action === 'delegate') {
      const body: TaskDelegateRequest = {
        userId: result.userId,
        comment: result.comment
      };
      this.api.delegateTask(this.task.id, body).pipe(take(1)).subscribe(
        response => this.handleResult(response),
        error => this.handleError(error)
      );
    }
  }

  private handleResult(result: BusinessProcessTaskActionResult) {
    this.loading = false;
    this.closeDialog();
    this.completed.emit(result);
  }

  private handleError(error: any) {
    this.loading = false;
    this.error = this.getErrorMessage(error, 'Business-process action failed');
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (error && error.error && error.error.message) return error.error.message;
    if (error && error.message) return error.message;
    return fallback;
  }
}
