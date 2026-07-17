import { _baseDocFormComponent } from './_base.form.component';
import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef, ViewChild } from '@angular/core';
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
    private readonly routeMapper: BusinessProcessRouteMapperService) {
    super(router, route, auth, ds, tabStore, dss, cd);
  }

  ngOnInit() {
    super.ngOnInit();
    if (this.type === 'BusinessProcess.Template' && this.form.get('status').value !== 'DRAFT') {
      this.readonly = true;
      this.form.disable(patchOptionsNoEvents);
    }
  }

  save() {
    if (this.type !== 'BusinessProcess.Template') {
      super.save();
      return;
    }
    this.saveBusinessProcessTemplate(false);
  }

  saveTemplateAndClose() {
    this.saveBusinessProcessTemplate(true);
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

  ngOnDestroy() {
    super.ngOnDestroy();
  }
}
