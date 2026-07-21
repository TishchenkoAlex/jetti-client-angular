import { BusinessProcessValidationIssue } from './business-process-route-graph.models';
import {
  BusinessProcessStep,
  BusinessProcessTransition,
  BusinessProcessVisualMapping
} from './business-process-template.models';

export interface BusinessProcessBpmnRoutePreview {
  valid: boolean;
  routeHash?: string;
  route: {
    startStepKey?: string;
    steps: BusinessProcessStep[];
    transitions: BusinessProcessTransition[];
  };
  visualMapping: BusinessProcessVisualMapping;
  statistics: {
    startEvents: number;
    endEvents: number;
    steps: number;
    gateways: number;
    sequenceFlows: number;
  };
  diagnostics: BusinessProcessValidationIssue[];
}
