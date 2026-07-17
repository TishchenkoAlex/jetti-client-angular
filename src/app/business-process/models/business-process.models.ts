export type BusinessProcessInstanceStatus =
  | 'RUNNING'
  | 'COMPLETED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'FAILED';

export type BusinessProcessTaskStatus =
  | 'CREATED'
  | 'WAITING'
  | 'ACTIVE'
  | 'APPROVED'
  | 'REJECTED'
  | 'REDIRECTED'
  | 'AUTO_COMPLETED'
  | 'TIMEOUT'
  | 'OVERDUE'
  | 'CANCELLED';

export type BusinessProcessTaskUserAction =
  | 'approve'
  | 'reject'
  | 'redirect'
  | 'delegate'
  | 'cancel';

export interface BusinessProcessTaskAvailableActions {
  approve: boolean;
  reject: boolean;
  redirect: boolean;
  delegate: boolean;
  cancel: boolean;
}

export interface BusinessProcessInstance {
  id: string;
  templateCode?: string;
  templateVersion?: number;
  objectType: string;
  objectId: string;
  status: BusinessProcessInstanceStatus;
  currentStepKey?: string;
  startedAt: string;
  completedAt?: string;
}

export interface BusinessProcessTask {
  id: string;
  instanceId: string;
  objectType: string;
  objectId: string;
  stepKey: string;
  title: string;
  status: BusinessProcessTaskStatus;
  assigneeUser?: any;
  assigneeRole?: string;
  decisionUser?: any;
  activeFrom?: string;
  dueAt?: string;
  completedAt?: string;
  decisionComment?: string;
  delegatedFromUser?: any;
  redirectedFromUser?: any;
  penaltyAmount?: number;
  availableActions?: BusinessProcessTaskAvailableActions;
}

export interface BusinessProcessEvent {
  id: string;
  instanceId: string;
  taskId?: string;
  eventType: string;
  userId?: string;
  user?: any;
  date: string;
  payload?: unknown;
}

export interface MyTasksQuery {
  status?: string;
  includeCompleted?: boolean;
  limit?: number;
}

export interface StartBusinessProcessRequest {
  objectType: string;
  objectId: string;
  templateCode?: string;
  context?: any;
}

export interface TaskDecisionRequest {
  comment?: string;
}

export interface TaskRedirectRequest {
  userId: string;
  comment: string;
}

export interface TaskDelegateRequest {
  userId: string;
  comment?: string;
}

export interface BusinessProcessTaskActionResult {
  task: BusinessProcessTask;
  instance?: BusinessProcessInstance;
  message?: string;
}
