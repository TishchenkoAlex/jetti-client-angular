import { Injectable } from '@angular/core';

import {
  BusinessProcessRouteAnalysis,
  BusinessProcessRouteGraph,
  BusinessProcessValidationIssue,
  BusinessProcessValidationSeverity
} from '../models/business-process-route-graph.models';
import {
  BusinessProcessStartMode,
  BusinessProcessStep,
  BusinessProcessStepType,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition
} from '../models/business-process-template.models';

export const BUSINESS_PROCESS_END_STATES = [
  'END_APPROVED',
  'END_REJECTED',
  'END_CANCELLED'
] as const;

const START_MODES: BusinessProcessStartMode[] = ['MANUAL', 'ON_SAVE', 'ON_POST', 'ON_STATUS_CHANGE'];
const STEP_TYPES: BusinessProcessStepType[] = ['USER_TASK', 'SYSTEM_TASK', 'TIMER', 'AUTO'];
const TRANSITION_EVENTS = ['APPROVE', 'REJECT', 'TIMEOUT', 'AUTO'];

@Injectable({ providedIn: 'root' })
export class BusinessProcessRouteGraphService {
  normalize(template: BusinessProcessTemplateDraft): BusinessProcessTemplateDraft {
    const steps = (Array.isArray(template.steps) ? template.steps : []).map(step => ({
      ...step,
      key: String(step?.key || '').trim(),
      title: String(step?.title || '').trim()
    }));
    const transitions = this.normalizeTransitions(
      Array.isArray(template.transitions) ? template.transitions : []
    );

    return {
      ...template,
      code: String(template.code || '').trim(),
      description: template.description === undefined
        ? undefined
        : String(template.description).trim(),
      objectTypes: (Array.isArray(template.objectTypes) ? template.objectTypes : [])
        .map(value => String(value || '').trim())
        .filter(value => !!value),
      steps,
      transitions
    };
  }

  analyze(template: BusinessProcessTemplateDraft): BusinessProcessRouteAnalysis {
    const normalized = this.normalize(template);
    const issues: BusinessProcessValidationIssue[] = [];
    const graph = this.buildGraph(normalized, issues);

    this.validateHeader(normalized, issues);
    this.validateReachability(graph, issues);

    return {
      valid: !issues.some(issue => issue.severity === 'error'),
      routeHash: this.routeHash(normalized),
      normalized,
      graph,
      issues
    };
  }

  routeHash(template: BusinessProcessTemplateDraft): string {
    const normalized = this.normalize(template);
    const explicitStart = this.startStepKey(normalized);
    const value = this.stableStringify({
      startStepKey: explicitStart,
      steps: [...normalized.steps].sort((left, right) => left.key.localeCompare(right.key)),
      transitions: [...normalized.transitions].sort((left, right) => left.key.localeCompare(right.key))
    });

    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private normalizeTransitions(transitions: BusinessProcessTransition[]): BusinessProcessTransition[] {
    const usedKeys = new Set<string>();
    transitions.forEach(transition => {
      const key = String(transition?.key || '').trim();
      if (key) usedKeys.add(key);
    });

    let sequence = 1;
    return transitions.map(transition => {
      let key = String(transition?.key || '').trim();
      if (!key) {
        key = `Transition_${sequence++}`;
        while (usedKeys.has(key)) key = `Transition_${sequence++}`;
        usedKeys.add(key);
      }

      return {
        ...transition,
        key,
        from: String(transition?.from || '').trim(),
        on: String(transition?.on || '').trim(),
        to: String(transition?.to || '').trim()
      };
    });
  }

  private buildGraph(
    template: BusinessProcessTemplateDraft,
    issues: BusinessProcessValidationIssue[]
  ): BusinessProcessRouteGraph {
    const stepsByKey = new Map<string, BusinessProcessStep>();
    const transitionsByKey = new Map<string, BusinessProcessTransition>();
    const outgoingByStep = new Map<string, BusinessProcessTransition[]>();
    const incomingByStep = new Map<string, BusinessProcessTransition[]>();
    const terminalStates = new Set<string>();

    template.steps.forEach((step, index) => {
      const path = `$.steps[${index}]`;
      if (!step.key) this.issue(issues, 'error', 'STEP_KEY_REQUIRED', `${path}.key`, 'Step key is required');
      if (step.key && stepsByKey.has(step.key)) {
        this.issue(issues, 'error', 'STEP_KEY_DUPLICATE', `${path}.key`, `Duplicate step key: ${step.key}`);
      } else if (step.key) {
        stepsByKey.set(step.key, step);
        outgoingByStep.set(step.key, []);
        incomingByStep.set(step.key, []);
      }
      if (!step.title) this.issue(issues, 'error', 'STEP_TITLE_REQUIRED', `${path}.title`, 'Step title is required');
      if (!STEP_TYPES.includes(step.type)) {
        this.issue(issues, 'error', 'STEP_TYPE_UNSUPPORTED', `${path}.type`, `Unsupported step type: ${step.type}`);
      }
    });

    template.transitions.forEach((transition, index) => {
      const path = `$.transitions[${index}]`;
      if (!transition.key) {
        this.issue(issues, 'error', 'TRANSITION_KEY_REQUIRED', `${path}.key`, 'Transition key is required');
      } else if (transitionsByKey.has(transition.key)) {
        this.issue(
          issues,
          'error',
          'TRANSITION_KEY_DUPLICATE',
          `${path}.key`,
          `Duplicate transition key: ${transition.key}`
        );
      } else {
        transitionsByKey.set(transition.key, transition);
      }

      const sourceExists = stepsByKey.has(transition.from);
      const targetExists = stepsByKey.has(transition.to);
      const targetIsEnd = this.isEndState(transition.to);

      if (!sourceExists) {
        this.issue(
          issues,
          'error',
          'TRANSITION_SOURCE_UNKNOWN',
          `${path}.from`,
          `Transition source does not reference an existing step: ${transition.from || '(empty)'}`
        );
      }
      if (!targetExists && !targetIsEnd) {
        this.issue(
          issues,
          'error',
          'TRANSITION_TARGET_UNKNOWN',
          `${path}.to`,
          `Transition target does not reference an existing step or end state: ${transition.to || '(empty)'}`
        );
      }
      if (!TRANSITION_EVENTS.includes(transition.on)) {
        this.issue(
          issues,
          'error',
          'TRANSITION_EVENT_UNSUPPORTED',
          `${path}.on`,
          `Unsupported transition event: ${transition.on || '(empty)'}`
        );
      }

      if (sourceExists) outgoingByStep.get(transition.from)?.push(transition);
      if (targetExists) incomingByStep.get(transition.to)?.push(transition);
      if (targetIsEnd) terminalStates.add(transition.to);
    });

    const startStepKey = this.startStepKey(template);
    if (startStepKey && !stepsByKey.has(startStepKey)) {
      this.issue(
        issues,
        'error',
        'START_STEP_UNKNOWN',
        '$.parameters.startStepKey',
        `Start step does not reference an existing step: ${startStepKey}`
      );
    }

    return {
      startStepKey,
      stepsByKey,
      transitionsByKey,
      outgoingByStep,
      incomingByStep,
      terminalStates
    };
  }

  private validateHeader(
    template: BusinessProcessTemplateDraft,
    issues: BusinessProcessValidationIssue[]
  ): void {
    if (!template.code) this.issue(issues, 'error', 'CODE_REQUIRED', '$.code', 'Template code is required');
    if (!template.objectTypes.length) {
      this.issue(issues, 'error', 'OBJECT_TYPES_REQUIRED', '$.objectTypes', 'At least one object type is required');
    }
    if (new Set(template.objectTypes).size !== template.objectTypes.length) {
      this.issue(issues, 'warning', 'OBJECT_TYPES_DUPLICATE', '$.objectTypes', 'Object types contain duplicates');
    }
    if (!START_MODES.includes(template.startMode)) {
      this.issue(
        issues,
        'error',
        'START_MODE_UNSUPPORTED',
        '$.startMode',
        `Unsupported start mode: ${template.startMode}`
      );
    }
    if (!template.steps.length) {
      this.issue(issues, 'error', 'STEPS_REQUIRED', '$.steps', 'At least one step is required');
    }
  }

  private validateReachability(
    graph: BusinessProcessRouteGraph,
    issues: BusinessProcessValidationIssue[]
  ): void {
    if (!graph.startStepKey || !graph.stepsByKey.has(graph.startStepKey)) return;

    const reachable = new Set<string>();
    const queue = [graph.startStepKey];
    while (queue.length) {
      const key = queue.shift() as string;
      if (reachable.has(key)) continue;
      reachable.add(key);
      (graph.outgoingByStep.get(key) || []).forEach(transition => {
        if (graph.stepsByKey.has(transition.to) && !reachable.has(transition.to)) queue.push(transition.to);
      });
    }

    graph.stepsByKey.forEach((_step, key) => {
      if (!reachable.has(key)) {
        this.issue(
          issues,
          'warning',
          'STEP_UNREACHABLE',
          `$.steps.${key}`,
          `Step is not reachable from start: ${key}`
        );
      }
    });

    if (!graph.terminalStates.size) {
      this.issue(
        issues,
        'warning',
        'END_STATE_MISSING',
        '$.transitions',
        'Route has no transition to an end state'
      );
    }

    const canReachEnd = new Set<string>();
    graph.outgoingByStep.forEach((transitions, stepKey) => {
      if (transitions.some(transition => this.isEndState(transition.to))) canReachEnd.add(stepKey);
    });

    let changed = true;
    while (changed) {
      changed = false;
      graph.outgoingByStep.forEach((transitions, stepKey) => {
        if (canReachEnd.has(stepKey)) return;
        if (transitions.some(transition => canReachEnd.has(transition.to))) {
          canReachEnd.add(stepKey);
          changed = true;
        }
      });
    }

    reachable.forEach(key => {
      if (!canReachEnd.has(key)) {
        this.issue(
          issues,
          'warning',
          'STEP_WITHOUT_END_PATH',
          `$.steps.${key}`,
          `Step has no path to an end state: ${key}`
        );
      }
    });
  }

  private startStepKey(template: BusinessProcessTemplateDraft): string | undefined {
    const value = template.parameters && typeof template.parameters === 'object'
      ? (template.parameters as Record<string, unknown>).startStepKey
      : undefined;
    if (typeof value === 'string' && value.trim()) return value.trim();
    return template.steps[0]?.key || undefined;
  }

  private isEndState(value: string): boolean {
    return (BUSINESS_PROCESS_END_STATES as readonly string[]).includes(value);
  }

  private issue(
    issues: BusinessProcessValidationIssue[],
    severity: BusinessProcessValidationSeverity,
    code: string,
    path: string,
    message: string
  ): void {
    issues.push({ severity, code, path, message });
  }

  private stableStringify(value: unknown): string {
    if (Array.isArray(value)) return '[' + value.map(item => this.stableStringify(item)).join(',') + ']';
    if (value && typeof value === 'object') {
      return '{' + Object.keys(value as object).sort()
        .map(key => JSON.stringify(key) + ':' + this.stableStringify((value as Record<string, unknown>)[key]))
        .join(',') + '}';
    }
    return JSON.stringify(value) || 'null';
  }
}
