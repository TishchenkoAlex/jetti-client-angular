import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormGroup } from '@angular/forms';
import { Subscription } from 'rxjs';
import { BpmnEditorComponent } from '../diagram/components/bpmn-editor/bpmn-editor.component';
import { BusinessProcessDiagramError } from '../diagram/models/business-process-diagram.models';
import { BusinessProcessTemplate } from '../models/business-process-template.models';
import { BusinessProcessRouteMapperService } from '../services/business-process-route-mapper.service';
import { BusinessProcessTemplateApiService } from '../services/business-process-template-api.service';
import { BusinessProcessBpmnMapperService, BusinessProcessBpmnRepresentation } from './business-process-bpmn-mapper.service';

@Component({
  selector: 'bp-business-process-template-bpmn',
  templateUrl: './business-process-template-bpmn.component.html',
  styleUrls: ['./business-process-template-bpmn.component.scss']
})
export class BusinessProcessTemplateBpmnComponent implements OnChanges, OnDestroy {
  @ViewChild(BpmnEditorComponent) modeler: BpmnEditorComponent;
  @Input() form: UntypedFormGroup;
  @Input() readonly = false;

  xml = '';
  loading = false;
  error = '';
  mappingInvalidated = false;

  private formChanges = new Subscription();
  private templateRequest?: Subscription;

  constructor(
    private readonly api: BusinessProcessTemplateApiService,
    private readonly routeMapper: BusinessProcessRouteMapperService,
    private readonly bpmnMapper: BusinessProcessBpmnMapperService
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) this.bindForm();
  }

  ngOnDestroy(): void {
    this.formChanges.unsubscribe();
    this.templateRequest?.unsubscribe();
  }

  onDiagramChanged(): void {
    this.invalidateVisualMapping();
  }

  onXmlChange(xml: string): void {
    this.updateXmlControl(xml, !!this.modeler?.hasDiagramChanges());
  }

  onError(error: BusinessProcessDiagramError): void {
    this.error = error.message || 'Process map could not be updated';
  }

  captureXml(): Promise<void> {
    if (!this.modeler) return Promise.resolve();
    const mappingIsStale = this.modeler.hasDiagramChanges();
    return this.modeler.getXml().then(xml => this.updateXmlControl(xml, mappingIsStale));
  }

  acceptSavedTemplate(template: BusinessProcessTemplate): void {
    const savedXml = template.bpmnXml || this.xml;
    const xmlChangedByBackend = savedXml !== this.xml;
    this.xml = savedXml;
    if (!xmlChangedByBackend) this.modeler?.markDiagramSaved(savedXml);
    if (template.visualMapping) this.mappingInvalidated = false;
  }

  private bindForm(): void {
    this.formChanges.unsubscribe();
    this.formChanges = new Subscription();
    this.templateRequest?.unsubscribe();
    this.templateRequest = undefined;
    this.loading = false;
    this.error = '';
    this.mappingInvalidated = false;

    this.initializeFromForm();
    this.watchFormChanges();
  }

  private initializeFromForm(): void {
    const xmlControl = this.form.get('bpmnXml');
    const routeIsDirty = ['steps', 'transitions'].some(name => !!this.form.get(name)?.dirty);

    if (routeIsDirty) this.invalidateVisualMapping(false);

    if (xmlControl?.value && (xmlControl.dirty || this.form.dirty)) {
      this.xml = String(xmlControl.value);
      return;
    }

    const value = this.form.getRawValue();
    if (value.id && value.timestamp) {
      this.loadTemplate(value.id);
      return;
    }

    this.applyRepresentation(this.bpmnMapper.toRepresentation(this.routeMapper.toDraft(value)));
  }

  private watchFormChanges(): void {
    ['steps', 'transitions'].forEach(name => {
      const control = this.form.get(name);
      if (control) {
        this.formChanges.add(control.valueChanges.subscribe(() => this.invalidateVisualMapping()));
      }
    });

    const xmlControl = this.form.get('bpmnXml');
    if (xmlControl) {
      this.formChanges.add(xmlControl.valueChanges.subscribe(value => {
        const nextXml = typeof value === 'string' ? value : '';
        if (!nextXml || nextXml === this.xml) return;

        this.xml = nextXml;
        this.error = '';
        this.invalidateVisualMapping();
      }));
    }
  }

  private loadTemplate(id: string): void {
    const targetForm = this.form;
    this.loading = true;
    this.error = '';
    this.templateRequest = this.api.getTemplate(id).subscribe(template => {
      if (this.form !== targetForm) return;

      this.loading = false;
      if (this.form.dirty) {
        this.initializeFromCurrentForm();
        return;
      }
      this.applyRepresentation(this.bpmnMapper.toRepresentation(template));
    }, error => {
      if (this.form !== targetForm) return;

      this.loading = false;
      this.error = this.errorMessage(error, 'Process map could not be loaded');
    });
  }

  private initializeFromCurrentForm(): void {
    const value = this.form.getRawValue();
    if (value.bpmnXml) {
      this.xml = String(value.bpmnXml);
      return;
    }

    this.applyRepresentation(this.bpmnMapper.toRepresentation(this.routeMapper.toDraft(value)));
  }

  private applyRepresentation(representation: BusinessProcessBpmnRepresentation): void {
    this.xml = representation.xml;
    this.setControlValue('bpmnXml', representation.xml);
    this.setControlValue('visualMapping', JSON.stringify(representation.visualMapping, null, 2));
    this.mappingInvalidated = false;
  }

  private updateXmlControl(xml: string, invalidateMapping: boolean): void {
    this.xml = xml;
    const control = this.form.get('bpmnXml');
    const xmlChanged = !!control && control.value !== xml;

    if (xmlChanged) {
      control.setValue(xml, { emitEvent: false });
      control.markAsDirty();
    }

    if (invalidateMapping) this.invalidateVisualMapping(false);
    if (xmlChanged || invalidateMapping) this.form.markAsDirty();
  }

  private invalidateVisualMapping(markFormDirty = true): void {
    this.mappingInvalidated = true;
    const control = this.form.get('visualMapping');

    if (control && this.hasValue(control.value)) {
      control.setValue('', { emitEvent: false });
      control.markAsDirty();
    }

    if (markFormDirty) this.form.markAsDirty();
  }

  private hasValue(value: unknown): boolean {
    return typeof value === 'string' ? !!value.trim() : value !== undefined && value !== null;
  }

  private setControlValue(name: string, value: unknown): void {
    const control = this.form.get(name);
    if (control) control.setValue(value, { emitEvent: false });
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (!error || typeof error !== 'object') return fallback;

    const response = error as { error?: unknown; message?: unknown };
    if (typeof response.error === 'string') return response.error;
    if (response.error && typeof response.error === 'object') {
      const body = response.error as { message?: unknown; error?: unknown };
      if (typeof body.message === 'string') return body.message;
      if (typeof body.error === 'string') return body.error;
    }
    return typeof response.message === 'string' ? response.message : fallback;
  }
}
