import { Injectable } from '@angular/core';
import {
  BusinessProcessDecision,
  BusinessProcessRuleBinding,
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
    const stepRules = this.asArray(value.stepRules);
    const stepDecisions = this.asArray(value.stepDecisions);
    const steps = this.asArray(value.steps).map(item => this.mapStep(
      item,
      stepRules.filter(rule => rule?.stepKey === item?.key),
      stepDecisions.filter(decision => decision?.stepKey === item?.key)
    ));
    const transitions = this.asArray(value.transitions).map(item => this.mapTransition(item));

    return this.routeGraph.normalize({
      id: value.id || undefined,
      code: String(value.code || '').trim(),
      description: value.description ? String(value.description) : undefined,
      objectTypes: this.asObjectTypeArray(value.objectTypes),
      startMode: value.startMode || 'MANUAL',
      rules: this.asArray(value.rules).map(item => this.mapRuleBinding(item)),
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
      objectTypes: normalized.objectTypes.map(objectType => ({ objectType })),
      startMode: normalized.startMode,
      rules: normalized.rules.map(rule => this.ruleBindingToForm(rule)),
      startCondition: this.formatJson(normalized.startCondition),
      steps: normalized.steps.map(step => {
        const { rules, decisions, ...fields } = step;
        return fields;
      }),
      stepRules: normalized.steps.reduce((rows, step) => [
        ...rows,
        ...step.rules.map(rule => ({ stepKey: step.key, ...this.ruleBindingToForm(rule) }))
      ], [] as any[]),
      stepDecisions: normalized.steps.reduce((rows, step) => [
        ...rows,
        ...step.decisions.map(decision => ({ stepKey: step.key, ...decision }))
      ], [] as any[]),
      transitions: normalized.transitions.map(transition => ({
        ...transition,
        condition: this.formatJson(transition.condition)
      })),
      parameters: this.formatJson(normalized.parameters),
      bpmnXml: template.bpmnXml || '',
      visualMapping: this.formatJson(template.visualMapping),
      createdBy: template.createdBy || '',
      activatedAt: template.activatedAt || null,
      archivedAt: template.archivedAt || null,
      createdAt: template.createdAt || null,
      updatedAt: template.updatedAt || null,
      date: template.createdAt || new Date(),
      timestamp: template.updatedAt || new Date()
    };
  }

  private mapStep(value: any, rules: any[], decisions: any[]): BusinessProcessStep {
    return this.compact({
      key: value.key,
      title: value.title,
      type: value.type,
      rules: rules.map(item => this.mapRuleBinding(item)),
      decisions: decisions.map(item => this.mapDecision(item)),
      completionPolicy: value.completionPolicy || 'ANY',
      allowRedirect: value.allowRedirect,
      allowDelegate: value.allowDelegate,
      rejectPolicy: value.rejectPolicy
    }) as BusinessProcessStep;
  }

  private mapRuleBinding(value: any): BusinessProcessRuleBinding {
    return this.compact({
      rule: this.referenceId(value?.rule),
      order: value?.order === undefined || value?.order === null ? 0 : Number(value.order),
      settings: this.parseJson(value?.settings, undefined)
    }) as BusinessProcessRuleBinding;
  }

  private ruleBindingToForm(value: BusinessProcessRuleBinding): any {
    return {
      ...value,
      settings: this.formatJson(value.settings)
    };
  }

  private mapDecision(value: any): BusinessProcessDecision {
    return {
      key: String(value?.key || '').trim(),
      title: String(value?.title || '').trim(),
      commentRequired: value?.commentRequired === true
    };
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

  private asObjectTypeArray(value: any): string[] {
    return this.asArray(value).map(item => {
      const selected = item && typeof item === 'object' && !Array.isArray(item)
        ? item.objectType
        : item;
      if (typeof selected === 'string') return selected.trim();
      if (selected && typeof selected === 'object' && typeof selected.id === 'string') {
        return selected.id.trim();
      }
      return '';
    }).filter(item => !!item);
  }

  private referenceId(value: any): string {
    if (typeof value === 'string') return value.trim();
    return value && typeof value.id === 'string' ? value.id.trim() : '';
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
