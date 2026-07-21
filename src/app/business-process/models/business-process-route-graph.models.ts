import {
  BusinessProcessStep,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition
} from './business-process-template.models';

export type BusinessProcessValidationSeverity = 'error' | 'warning';

export interface BusinessProcessValidationIssue {
  severity: BusinessProcessValidationSeverity;
  code: string;
  path: string;
  message: string;
}

export interface BusinessProcessRouteGraph {
  startStepKey?: string;
  stepsByKey: Map<string, BusinessProcessStep>;
  transitionsByKey: Map<string, BusinessProcessTransition>;
  outgoingByStep: Map<string, BusinessProcessTransition[]>;
  incomingByStep: Map<string, BusinessProcessTransition[]>;
  terminalStates: Set<string>;
}

export interface BusinessProcessRouteAnalysis {
  valid: boolean;
  routeHash: string;
  normalized: BusinessProcessTemplateDraft;
  graph: BusinessProcessRouteGraph;
  issues: BusinessProcessValidationIssue[];
}
