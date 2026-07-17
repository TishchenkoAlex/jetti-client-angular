import { Component, Input, OnInit, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { BusinessProcessRouteMapperService } from '../services/business-process-route-mapper.service';
import { BusinessProcessTemplateApiService } from '../services/business-process-template-api.service';
import { BusinessProcessBpmnMapperService, BusinessProcessBpmnRepresentation } from './business-process-bpmn-mapper.service';
import { BpmnModelerComponent } from './bpmn-modeler.component';

@Component({
  selector: 'bp-business-process-template-bpmn',
  templateUrl: './business-process-template-bpmn.component.html',
  styleUrls: ['./business-process-template-bpmn.component.scss']
})
export class BusinessProcessTemplateBpmnComponent implements OnInit {
  @ViewChild(BpmnModelerComponent) modeler: BpmnModelerComponent;
  @Input() form: UntypedFormGroup;
  @Input() readonly = false;

  xml = '';
  loading = false;
  error = '';

  constructor(
    private readonly api: BusinessProcessTemplateApiService,
    private readonly routeMapper: BusinessProcessRouteMapperService,
    private readonly bpmnMapper: BusinessProcessBpmnMapperService
  ) {}

  ngOnInit() {
    const xmlControl = this.form.get('bpmnXml');
    if (xmlControl && xmlControl.dirty && xmlControl.value) {
      this.xml = xmlControl.value;
      return;
    }

    const value = this.form.getRawValue();
    if (value.id && value.timestamp) {
      this.loadTemplate(value.id);
      return;
    }

    this.applyRepresentation(this.bpmnMapper.toRepresentation(this.routeMapper.toDraft(value)));
  }

  onXmlChange(xml: string) {
    this.xml = xml;
    const control = this.form.get('bpmnXml');
    if (control) {
      control.setValue(xml);
      control.markAsDirty();
    }
    this.form.markAsDirty();
  }

  onError(error: any) {
    this.error = this.errorMessage(error, 'Process map could not be updated');
  }

  captureXml(): Promise<void> {
    if (!this.modeler) return Promise.resolve();
    return this.modeler.getXml().then(xml => this.onXmlChange(xml));
  }

  private loadTemplate(id: string) {
    this.loading = true;
    this.error = '';
    this.api.getTemplate(id).subscribe(template => {
      this.loading = false;
      this.applyRepresentation(this.bpmnMapper.toRepresentation(template));
    }, error => {
      this.loading = false;
      this.error = this.errorMessage(error, 'Process map could not be loaded');
    });
  }

  private applyRepresentation(representation: BusinessProcessBpmnRepresentation) {
    this.xml = representation.xml;
    this.setControlValue('bpmnXml', representation.xml);
    this.setControlValue('visualMapping', JSON.stringify(representation.visualMapping, null, 2));
  }

  private setControlValue(name: string, value: any) {
    const control = this.form.get(name);
    if (control) control.setValue(value, { emitEvent: false });
  }

  private errorMessage(error: any, fallback: string): string {
    if (error && error.error) {
      if (typeof error.error === 'string') return error.error;
      if (error.error.message) return error.error.message;
      if (error.error.error) return error.error.error;
    }
    return error && error.message ? error.message : fallback;
  }
}
