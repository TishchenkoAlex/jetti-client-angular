export type BusinessProcessTemplateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export type BusinessProcessStartMode = 'MANUAL' | 'ON_SAVE' | 'ON_POST' | 'ON_STATUS_CHANGE';

export type BusinessProcessStepType = 'USER_TASK' | 'SYSTEM_TASK' | 'TIMER' | 'AUTO';

export interface BusinessProcessStep {
  key: string;
  title: string;
  type: BusinessProcessStepType;
  assignmentRule?: any;
  dueRule?: any;
  penaltyRule?: any;
  waitUntilRule?: any;
  autoCompleteCondition?: any;
  allowRedirect?: boolean;
  allowDelegate?: boolean;
  rejectPolicy?: string;
}

export interface BusinessProcessTransition {
  key: string;
  from: string;
  on: string;
  to: string;
  condition?: any;
}

export interface BusinessProcessVisualMapping {
  schemaVersion?: 1 | 2;
  notation?: 'BPMN' | 'CUSTOM_GRAPH';
  routeHash?: string;
  startEventId?: string;
  nodeMap?: { [stepKey: string]: string };
  edgeMap?: { [transitionKey: string]: string };
  endNodeMap?: { [endState: string]: string };
}

export interface BusinessProcessTemplateDraft {
  id?: string;
  code: string;
  description?: string;
  objectTypes: string[];
  startMode: BusinessProcessStartMode;
  startCondition?: any;
  steps: BusinessProcessStep[];
  transitions: BusinessProcessTransition[];
  parameters?: any;
  bpmnXml?: string;
  visualMapping?: BusinessProcessVisualMapping;
}

export interface BusinessProcessTemplate extends BusinessProcessTemplateDraft {
  id: string;
  active: boolean;
  version: number;
  status: BusinessProcessTemplateStatus;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  activatedAt?: string;
  archivedAt?: string;
}
