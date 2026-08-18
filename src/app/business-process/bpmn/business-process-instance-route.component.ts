import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy, OnInit } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';

import { BusinessProcessTask } from '../models/business-process.models';
import {
  BusinessProcessTemplate,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { BusinessProcessApiService } from '../services/business-process-api.service';
import { BusinessProcessTemplateApiService } from '../services/business-process-template-api.service';
import { BusinessProcessBpmnMapperService } from './business-process-bpmn-mapper.service';

@Component({
  selector: 'bp-business-process-instance-route',
  templateUrl: './business-process-instance-route.component.html',
  styleUrls: ['./business-process-instance-route.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BusinessProcessInstanceRouteComponent implements OnInit, OnDestroy {
  @Input() form: UntypedFormGroup;

  xml = '';
  loading = false;
  error = '';
  currentStepTitles: string[] = [];
  highlightedElementIds: string[] = [];

  private template?: BusinessProcessTemplate;
  private visualMapping?: BusinessProcessVisualMapping;
  private activeStepKeys: string[] = [];
  private formChanges = new Subscription();
  private templateRequest?: Subscription;
  private instanceRequest?: Subscription;

  constructor(
    private readonly templates: BusinessProcessTemplateApiService,
    private readonly instances: BusinessProcessApiService,
    private readonly mapper: BusinessProcessBpmnMapperService,
    private readonly cd: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    if (!this.form) return;
    const templateControl = this.form.get('templateId');
    const stepControl = this.form.get('currentStepKey');
    if (templateControl) {
      this.formChanges.add(templateControl.valueChanges.subscribe(() => this.loadTemplate()));
    }
    if (stepControl) {
      this.formChanges.add(stepControl.valueChanges.subscribe(() => this.updateHighlights()));
    }
    this.loadInstanceTasks();
    this.loadTemplate();
  }

  ngOnDestroy(): void {
    this.formChanges.unsubscribe();
    this.templateRequest?.unsubscribe();
    this.instanceRequest?.unsubscribe();
  }

  private loadTemplate(): void {
    const templateId = this.referenceId(this.form.get('templateId')?.value);
    this.templateRequest?.unsubscribe();
    this.template = undefined;
    this.visualMapping = undefined;
    this.xml = '';
    this.error = '';
    if (!templateId) {
      this.loading = false;
      this.updateHighlights();
      this.cd.markForCheck();
      return;
    }

    this.loading = true;
    this.templateRequest = this.templates.getTemplate(templateId).subscribe(template => {
      const representation = this.mapper.toRepresentation(template);
      this.template = template;
      this.visualMapping = representation.visualMapping;
      this.xml = representation.xml;
      if (!this.form.get('timestamp')?.value
        && !String(this.form.get('objectType')?.value || '').trim()
        && template.objectTypes?.length === 1) {
        this.form.get('objectType')?.setValue(template.objectTypes[0]);
      }
      this.loading = false;
      this.updateHighlights();
      this.cd.markForCheck();
    }, error => {
      this.loading = false;
      this.error = this.errorMessage(error, 'Process route could not be loaded');
      this.cd.markForCheck();
    });
  }

  private loadInstanceTasks(): void {
    const instanceId = String(this.form.get('id')?.value || '').trim();
    const persisted = !!this.form.get('timestamp')?.value;
    if (!persisted || !instanceId) return;

    this.instanceRequest = this.instances.getInstance(instanceId).subscribe(details => {
      this.activeStepKeys = this.activeTaskStepKeys(details.tasks || []);
      this.updateHighlights();
      this.cd.markForCheck();
    }, () => {
      // The form already contains currentStepKey, so a task-detail failure does
      // not prevent the route itself from being displayed.
      this.activeStepKeys = [];
      this.updateHighlights();
      this.cd.markForCheck();
    });
  }

  private updateHighlights(): void {
    const fallbackStep = String(this.form.get('currentStepKey')?.value || '').trim();
    const startStep = this.template
      ? String(this.template.parameters?.startStepKey || this.template.steps?.[0]?.key || '').trim()
      : '';
    const stepKeys = this.unique(this.activeStepKeys.length
      ? this.activeStepKeys
      : [fallbackStep || startStep].filter(value => !!value));

    this.highlightedElementIds = stepKeys
      .map(stepKey => this.visualMapping?.nodeMap?.[stepKey])
      .filter((id): id is string => !!id);
    this.currentStepTitles = stepKeys.map(stepKey => {
      const title = this.template?.steps?.find(step => step.key === stepKey)?.title;
      return title ? `${title} (${stepKey})` : stepKey;
    });
  }

  private activeTaskStepKeys(tasks: BusinessProcessTask[]): string[] {
    const activeStatuses = new Set(['CREATED', 'WAITING', 'ACTIVE', 'OVERDUE']);
    return this.unique(tasks
      .filter(task => activeStatuses.has(task.status))
      .map(task => String(task.stepKey || '').trim())
      .filter(stepKey => !!stepKey));
  }

  private referenceId(value: unknown): string {
    if (typeof value === 'string') return value.trim();
    if (!value || typeof value !== 'object') return '';
    return String((value as { id?: unknown }).id || '').trim();
  }

  private unique(values: string[]): string[] {
    return [...new Set(values)];
  }

  private errorMessage(error: any, fallback: string): string {
    if (typeof error?.error === 'string') return error.error;
    if (error?.error?.message) return error.error.message;
    if (error?.error?.error) return error.error.error;
    return error?.message || fallback;
  }
}
