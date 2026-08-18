import { _baseDocFormComponent } from './_base.form.component';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
import { AbstractControl, UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from '../loading.service';
import { AuthService } from '../../auth/auth.service';
import { DocService } from '../doc.service';
import { TabsStore } from '../tabcontroller/tabs.store';
import { DynamicFormService } from '../dynamic-form/dynamic-form.service';
import { patchOptionsNoEvents } from '../dynamic-form/dynamic-form.service';
import { BusinessProcessRouteMapperService } from '../../business-process/services/business-process-route-mapper.service';
import { BusinessProcessTemplateApiService } from '../../business-process/services/business-process-template-api.service';
import { BusinessProcessTemplateBpmnComponent } from '../../business-process/bpmn/business-process-template-bpmn.component';
import { BusinessProcessRouteGraphService } from '../../business-process/services/business-process-route-graph.service';
import { BusinessProcessApiService } from '../../business-process/services/business-process-api.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-form',
  templateUrl: './base.form.component.html'
})
export class BaseDocFormComponent extends _baseDocFormComponent implements OnInit, OnDestroy {
  @ViewChild(BusinessProcessTemplateBpmnComponent)
  private templateBpmn: BusinessProcessTemplateBpmnComponent;

  constructor(
    public router: Router, public route: ActivatedRoute, public auth: AuthService,
    public ds: DocService, public tabStore: TabsStore, public dss: DynamicFormService,
    public lds: LoadingService, public cd: ChangeDetectorRef,
    private readonly templateApi: BusinessProcessTemplateApiService,
    private readonly businessProcessApi: BusinessProcessApiService,
    private readonly routeMapper: BusinessProcessRouteMapperService,
    private readonly routeGraph: BusinessProcessRouteGraphService) {
    super(router, route, auth, ds, tabStore, dss, cd);
  }

  ngOnInit() {
    super.ngOnInit();
    if (this.type === 'BusinessProcess.Template') {
      this.form.addValidators(() => {
        const issues = this.businessProcessValidation().issues
          .filter(issue => issue.severity === 'error');
        return issues.length ? { businessProcess: issues } : null;
      });
      this.form.updateValueAndValidity(patchOptionsNoEvents);

      if (this.form.get('status').value !== 'DRAFT') {
        this.readonly = true;
        this.form.disable(patchOptionsNoEvents);
      }
    }

    if (this.type === 'BusinessProcess.Instance' && !this.isNew) {
      this.readonly = true;
      this.form.disable(patchOptionsNoEvents);
    }
  }

  get formValidationResult(): Record<string, unknown> {
    const errors = this.collectValidationErrors(this.form);
    const result: Record<string, unknown> = {
      status: this.form?.status || 'UNKNOWN',
      valid: !!this.form?.valid,
      pending: !!this.form?.pending,
      errors: errors || {}
    };

    if (this.type === 'BusinessProcess.Template' && this.form) {
      const domain = this.businessProcessValidation();
      result['businessProcess'] = {
        valid: domain.valid,
        routeHash: domain.routeHash,
        issues: domain.issues
      };
    }

    return result;
  }

  async copyValidationResult(): Promise<void> {
    try {
      await this.ds.copyToClipboard(JSON.stringify(this.formValidationResult, null, 2));
      this.ds.openSnackBar('success', 'Validation result', 'Copied to clipboard');
    } catch (error) {
      this.ds.openSnackBar('error', 'Validation result', 'Could not copy to clipboard');
    }
  }

  save() {
    if (this.type === 'BusinessProcess.Instance') {
      this.startBusinessProcess(false);
      return;
    }
    if (this.type !== 'BusinessProcess.Template') {
      super.save();
      return;
    }
    this.saveBusinessProcessTemplate(false);
  }

  saveTemplateAndClose() {
    this.saveBusinessProcessTemplate(true);
  }

  postClose() {
    if (this.type === 'BusinessProcess.Instance') {
      this.startBusinessProcess(true);
      return;
    }
    super.postClose();
  }

  private startBusinessProcess(close: boolean): void {
    if (!this.isNew) return;
    this.beforeSave();
    const value = this.form.getRawValue();
    const template = value.templateId || {};
    const templateCode = String(template.code || value.templateCode || '').trim();
    const objectType = String(value.objectType || '').trim();
    const objectId = String(value.objectId || '').trim();

    if (!templateCode || !objectType || !objectId) {
      this.form.markAllAsTouched();
      this.ds.openSnackBar('error', 'Process start', 'Template, object type and object are required');
      return;
    }

    this.businessProcessApi.startInstance({
      templateCode,
      objectType,
      objectId,
      context: this.parseJsonValue(value.context)
    }).subscribe(result => {
      const instance = result.instance;
      this.form.patchValue({
        ...instance,
        templateId: template,
        timestamp: instance.updatedAt || new Date(),
        context: instance.context ? JSON.stringify(instance.context, null, 2) : ''
      }, patchOptionsNoEvents);
      this.form.markAsPristine();
      this._form$.next(this.form);
      this.cd.markForCheck();
      this.ds.openSnackBar(
        'success',
        instance.templateCode || templateCode,
        result.alreadyRunning ? 'Process is already running' : 'Process started'
      );

      if (close) {
        this.close();
      } else {
        this.router.navigate([this.type, instance.id], { replaceUrl: true });
      }
    }, error => {
      this.ds.openSnackBar('error', 'Process start', this.templateErrorMessage(error));
    });
  }

  private parseJsonValue(value: unknown): Record<string, unknown> {
    if (!value) return {};
    if (typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>;
    if (typeof value !== 'string') return {};
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
    } catch (error) {
      return {};
    }
  }

  private saveBusinessProcessTemplate(close: boolean) {
    this.beforeSave();
    const capture = this.templateBpmn ? this.templateBpmn.captureXml() : Promise.resolve();
    capture.then(() => this.sendBusinessProcessTemplate(close)).catch(error => {
      this.ds.openSnackBar('error', 'Process template', this.templateErrorMessage(error));
    });
  }

  private sendBusinessProcessTemplate(close: boolean) {
    const draft = this.routeMapper.toDraft(this.form.getRawValue());
    const request = this.isNew
      ? this.templateApi.createDraft(draft)
      : this.templateApi.updateDraft(draft.id, draft);

    request.subscribe(template => {
      this.form.patchValue(this.routeMapper.toFormPatch(template), patchOptionsNoEvents);
      this.form.markAsPristine();
      this.templateBpmn?.acceptSavedTemplate(template);
      this._form$.next(this.form);
      this.cd.markForCheck();
      this.ds.openSnackBar('success', template.description || template.code, 'saved');
      if (close) this.close();
    }, error => {
      this.ds.openSnackBar('error', 'Process template', this.templateErrorMessage(error));
    });
  }

  private templateErrorMessage(error: any): string {
    if (error && error.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error.message) return error.error.message;
      if (error.error.error) return error.error.error;
    }
    return error && error.message ? error.message : 'Process template could not be saved';
  }

  private collectValidationErrors(control: AbstractControl | null): Record<string, unknown> | null {
    if (!control) return null;

    const result: Record<string, unknown> = {};
    if (control.errors) result['$self'] = control.errors;

    if (control instanceof UntypedFormGroup) {
      Object.keys(control.controls).forEach(key => {
        const childErrors = this.collectValidationErrors(control.controls[key]);
        if (childErrors) result[key] = childErrors;
      });
    } else if (control instanceof UntypedFormArray) {
      control.controls.forEach((child, index) => {
        const childErrors = this.collectValidationErrors(child);
        if (childErrors) result[index] = childErrors;
      });
    }

    return Object.keys(result).length ? result : null;
  }

  private businessProcessValidation() {
    return this.routeGraph.analyze(this.routeMapper.toDraft(this.form.getRawValue()));
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }
}
