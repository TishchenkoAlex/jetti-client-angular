import { Injectable } from '@angular/core';
import {
  BusinessProcessStep,
  BusinessProcessTemplate,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { BusinessProcessRouteGraphService } from './business-process-route-graph.service';

@Injectable({ providedIn: 'root' })
export class BusinessProcessRouteMapperService {
  constructor(private readonly routeGraph: BusinessProcessRouteGraphService) {}

  toDraft(value: any): BusinessProcessTemplateDraft {
    const addressing = this.asArray(value.addressing);
    const assignmentByStep: { [stepKey: string]: any } = {};

    addressing.forEach(item => {
      if (!item || !item.stepKey) return;
      assignmentByStep[item.stepKey] = this.compact({
        type: item.type,
        userId: item.userId,
        role: item.role,
        field: item.field
      });
    });

    const steps = this.asArray(value.steps).map(item => this.mapStep(item, assignmentByStep[item.key]));
    const transitions = this.asArray(value.transitions).map(item => this.mapTransition(item));

    return this.routeGraph.normalize({
      id: value.id || undefined,
      code: String(value.code || '').trim(),
      description: value.description ? String(value.description) : undefined,
      objectTypes: this.asStringArray(value.objectTypes),
      startMode: value.startMode || 'MANUAL',
      startCondition: this.parseJson(value.startCondition, undefined),
      steps,
      transitions,
      parameters: this.parseJson(value.parameters, undefined),
      bpmnXml: value.bpmnXml || undefined,
      visualMapping: this.parseJson(value.visualMapping, undefined) as BusinessProcessVisualMapping
    });
  }

  toFormPatch(template: BusinessProcessTemplate): any {
    const normalized = this.routeGraph.normalize(template);
    return {
      id: template.id,
      code: normalized.code,
      description: normalized.description || '',
      active: template.active,
      version: template.version,
      status: template.status,
      objectTypes: this.formatJson(normalized.objectTypes),
      startMode: normalized.startMode,
      startCondition: this.formatJson(normalized.startCondition),
      steps: normalized.steps,
      transitions: normalized.transitions,
      parameters: this.formatJson(normalized.parameters),
      bpmnXml: template.bpmnXml || '',
      visualMapping: this.formatJson(template.visualMapping),
      addressing: normalized.steps
        .filter(step => !!step.assignmentRule)
        .map(step => ({ stepKey: step.key, ...step.assignmentRule })),
      createdBy: template.createdBy || '',
      activatedAt: template.activatedAt || null,
      archivedAt: template.archivedAt || null,
      createdAt: template.createdAt || null,
      updatedAt: template.updatedAt || null,
      date: template.createdAt || new Date(),
      timestamp: template.updatedAt || new Date()
    };
  }

  private mapStep(value: any, addressing: any): BusinessProcessStep {
    return this.compact({
      key: value.key,
      title: value.title,
      type: value.type,
      assignmentRule: addressing || value.assignmentRule,
      dueRule: this.parseJson(value.dueRule, undefined),
      penaltyRule: this.parseJson(value.penaltyRule, undefined),
      waitUntilRule: this.parseJson(value.waitUntilRule, undefined),
      autoCompleteCondition: this.parseJson(value.autoCompleteCondition, undefined),
      allowRedirect: value.allowRedirect,
      allowDelegate: value.allowDelegate,
      rejectPolicy: value.rejectPolicy
    }) as BusinessProcessStep;
  }

  private mapTransition(value: any): BusinessProcessTransition {
    return this.compact({
      key: value.key,
      from: value.from,
      on: value.on,
      to: value.to,
      condition: this.parseJson(value.condition, undefined)
    }) as BusinessProcessTransition;
  }

  private asArray(value: any): any[] {
    const parsed = this.parseJson(value, []);
    return Array.isArray(parsed) ? parsed : [];
  }

  private asStringArray(value: any): string[] {
    return this.asArray(value).map(item => String(item).trim()).filter(item => !!item);
  }

  private parseJson(value: any, fallback: any): any {
    if (value === undefined || value === null || value === '') return fallback;
    if (typeof value !== 'string') return value;
    try {
      return JSON.parse(value);
    } catch (error) {
      return fallback;
    }
  }

  private formatJson(value: any): string {
    return value === undefined || value === null ? '' : JSON.stringify(value, null, 2);
  }

  private compact(value: any): any {
    Object.keys(value).forEach(key => {
      if (value[key] === undefined || value[key] === null || value[key] === '') delete value[key];
    });
    return value;
  }
}
