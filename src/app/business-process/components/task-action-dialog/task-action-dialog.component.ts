import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

export type TaskActionDialogAction = 'reject' | 'redirect' | 'delegate';

export interface TaskActionDialogResult {
  action: TaskActionDialogAction;
  comment?: string;
  userId?: string;
}

@Component({
  selector: 'bp-task-action-dialog',
  templateUrl: './task-action-dialog.component.html'
})
export class TaskActionDialogComponent implements OnChanges {
  @Input() visible = false;
  @Input() action: TaskActionDialogAction | '' = '';
  @Output() confirm = new EventEmitter<TaskActionDialogResult>();
  @Output() cancel = new EventEmitter<void>();

  comment = '';
  userId = '';

  get requiresUser(): boolean {
    return this.action === 'redirect' || this.action === 'delegate';
  }

  get requiresComment(): boolean {
    return this.action === 'reject' || this.action === 'redirect';
  }

  get title(): string {
    if (this.action === 'reject') return 'Reject task';
    if (this.action === 'redirect') return 'Redirect task';
    if (this.action === 'delegate') return 'Delegate task';
    return 'Task action';
  }

  get canConfirm(): boolean {
    if (this.requiresUser && !this.userId) return false;
    if (this.requiresComment && !this.comment) return false;
    return true;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes.visible && this.visible) {
      this.comment = '';
      this.userId = '';
    }
  }

  onConfirm() {
    if (!this.canConfirm || !this.action) return;
    this.confirm.emit({
      action: this.action,
      comment: this.comment,
      userId: this.userId
    });
  }

  onCancel() {
    this.cancel.emit();
  }
}
