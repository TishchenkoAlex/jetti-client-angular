import { Component, Input, OnChanges, OnDestroy, SimpleChanges, ViewChild } from '@angular/core';
import { UntypedFormArray, UntypedFormGroup } from '@angular/forms';
import { merge, Subscription } from 'rxjs';
import { debounceTime, filter, map } from 'rxjs/operators';
import { BpmnEditorComponent } from '../diagram/components/bpmn-editor/bpmn-editor.component';
import {
  BpmnElementSelection,
  BusinessProcessDiagramError
} from '../diagram/models/business-process-diagram.models';
import { BusinessProcessBpmnRoutePreview } from '../models/business-process-bpmn-preview.models';
import {
  BusinessProcessTemplate,
  BusinessProcessTemplateDraft,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { BusinessProcessBpmnParserService } from '../services/business-process-bpmn-parser.service';
import { BusinessProcessFormRouteSyncService } from '../services/business-process-form-route-sync.service';
import { BusinessProcessRouteGraphService } from '../services/business-process-route-graph.service';
import { BusinessProcessRouteMapperService } from '../services/business-process-route-mapper.service';
import {
  BusinessProcessSynchronizationCoordinator,
  BusinessProcessSynchronizationState,
  BusinessProcessSynchronizationToken
} from '../services/business-process-synchronization-coordinator.service';
import { BusinessProcessTemplateApiService } from '../services/business-process-template-api.service';
import {
  DynamicTableSelectionEvent,
  DynamicTableSelectionService
} from '../../common/dynamic-form/dynamic-table-selection.service';
import { BusinessProcessBpmnMapperService, BusinessProcessBpmnRepresentation } from './business-process-bpmn-mapper.service';

@Component({
  selector: 'bp-business-process-template-bpmn',
  templateUrl: './business-process-template-bpmn.component.html',
  styleUrls: ['./business-process-template-bpmn.component.scss'],
  providers: [BusinessProcessSynchronizationCoordinator]
})
export class BusinessProcessTemplateBpmnComponent implements OnChanges, OnDestroy {
  @ViewChild(BpmnEditorComponent) modeler: BpmnEditorComponent;
  @Input() form: UntypedFormGroup;
  @Input() readonly = false;

  xml = '';
  loading = false;
  error = '';
  mappingInvalidated = false;
  routePreview?: BusinessProcessBpmnRoutePreview;

  private formChanges = new Subscription();
  private templateRequest?: Subscription;
  private previewMapping?: BusinessProcessVisualMapping;
  private pendingDiagramToken?: BusinessProcessSynchronizationToken;

  constructor(
    private readonly api: BusinessProcessTemplateApiService,
    private readonly routeMapper: BusinessProcessRouteMapperService,
    private readonly routeGraph: BusinessProcessRouteGraphService,
    private readonly bpmnParser: BusinessProcessBpmnParserService,
    private readonly formRouteSync: BusinessProcessFormRouteSyncService,
    private readonly coordinator: BusinessProcessSynchronizationCoordinator,
    private readonly tableSelection: DynamicTableSelectionService,
    private readonly bpmnMapper: BusinessProcessBpmnMapperService
  ) {}

  get synchronizationState(): BusinessProcessSynchronizationState {
    return this.coordinator.snapshot();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['form'] && this.form) this.bindForm();
  }

  ngOnDestroy(): void {
    this.formChanges.unsubscribe();
    this.templateRequest?.unsubscribe();
  }

  onDiagramChanged(): void {
    const decision = this.coordinator.begin('DIAGRAM');
    if (decision.token) this.pendingDiagramToken = decision.token;
    this.rememberCurrentMapping();
    this.invalidateVisualMapping();
  }

  onXmlChange(xml: string): void {
    this.updateXmlControl(xml, !!this.modeler?.hasDiagramChanges(), this.pendingDiagramToken);
  }

  onError(error: BusinessProcessDiagramError): void {
    this.error = error.message || 'Process map could not be updated';
    const token = this.coordinator.activeToken();
    if (token) this.coordinator.fail(token, 'SYNC_DIAGRAM_EDITOR_ERROR', this.error);
    if (this.pendingDiagramToken === token) this.pendingDiagramToken = undefined;
  }

  onDiagramElementSelected(selection: BpmnElementSelection | null): void {
    const steps = this.form.get('steps');
    const transitions = this.form.get('transitions');
    if (!(steps instanceof UntypedFormArray) || !(transitions instanceof UntypedFormArray)) return;

    if (!selection) {
      this.tableSelection.selectExternal(steps, 'key');
      this.tableSelection.selectExternal(transitions, 'key');
      return;
    }

    const stepKey = this.reverseMappingValue(this.previewMapping?.nodeMap, selection.id);
    const transitionKey = this.reverseMappingValue(this.previewMapping?.edgeMap, selection.id);
    this.tableSelection.selectExternal(steps, 'key', stepKey);
    this.tableSelection.selectExternal(transitions, 'key', transitionKey);
  }

  captureXml(): Promise<void> {
    const tableToken = this.coordinator.activeToken('TABLES');
    if (tableToken) {
      this.synchronizeFromTables(true, tableToken);
      return Promise.resolve();
    }
    if (!this.modeler) return Promise.resolve();
    const mappingIsStale = this.modeler.hasDiagramChanges();
    return this.modeler.getXml().then(xml => {
      this.updateXmlControl(xml, mappingIsStale, this.pendingDiagramToken);
      if (mappingIsStale && (!this.routePreview?.valid || this.mappingInvalidated)) {
        return Promise.reject(new Error('BPMN route is invalid and cannot be saved'));
      }
      return undefined;
    });
  }

  acceptSavedTemplate(template: BusinessProcessTemplate): void {
    const resourceVersion = `${template.id}:${template.updatedAt || template.version}`;
    const decision = this.coordinator.begin('SAVE', { resourceVersion });
    const savedXml = template.bpmnXml || this.xml;
    const xmlChangedByBackend = savedXml !== this.xml;
    this.xml = savedXml;
    if (!xmlChangedByBackend) this.modeler?.markDiagramSaved(savedXml);
    if (template.visualMapping) {
      this.previewMapping = template.visualMapping;
      this.mappingInvalidated = false;
    }
    this.pendingDiagramToken = undefined;
    this.refreshRoutePreview(savedXml);
    if (decision.token) {
      this.coordinator.complete(decision.token, {
        resourceVersion,
        routeHash: this.routeGraph.routeHash(template),
        xmlHash: this.coordinator.xmlHash(savedXml)
      });
    }
  }

  private bindForm(): void {
    this.formChanges.unsubscribe();
    this.formChanges = new Subscription();
    this.templateRequest?.unsubscribe();
    this.templateRequest = undefined;
    this.loading = false;
    this.error = '';
    this.mappingInvalidated = false;
    this.routePreview = undefined;
    this.previewMapping = undefined;
    this.pendingDiagramToken = undefined;
    this.coordinator.reset();

    this.initializeFromForm();
    this.watchFormChanges();
  }

  private initializeFromForm(): void {
    const xmlControl = this.form.get('bpmnXml');
    const routeIsDirty = ['steps', 'transitions'].some(name => !!this.form.get(name)?.dirty);

    if (routeIsDirty) {
      this.xml = typeof xmlControl?.value === 'string' ? xmlControl.value : '';
      if (this.synchronizeFromTables(false)) return;
    }

    if (xmlControl?.value && (xmlControl.dirty || this.form.dirty)) {
      this.xml = String(xmlControl.value);
      this.refreshRoutePreview(this.xml);
      this.seedSynchronization(this.xml);
      return;
    }

    const value = this.form.getRawValue();
    if (value.id && value.timestamp) {
      this.loadTemplate(value.id);
      return;
    }

    this.applyRepresentation(this.bpmnMapper.toRepresentation(this.routeMapper.toDraft(value)));
    this.seedSynchronization(this.xml);
  }

  private watchFormChanges(): void {
    const routeControls = ['steps', 'transitions']
      .map(name => this.form.get(name))
      .filter(control => !!control);
    if (routeControls.length) {
      this.formChanges.add(merge(...routeControls.map(control => control!.valueChanges))
        .pipe(
          filter(() => !this.coordinator.isOrigin('DIAGRAM')),
          map(() => this.beginTablesSynchronization()),
          filter((token): token is BusinessProcessSynchronizationToken => !!token),
          debounceTime(150)
        )
        .subscribe(token => this.synchronizeFromTables(true, token)));
    }

    const xmlControl = this.form.get('bpmnXml');
    if (xmlControl) {
      this.formChanges.add(xmlControl.valueChanges.subscribe(value => {
        const nextXml = typeof value === 'string' ? value : '';
        if (!nextXml || nextXml === this.xml) return;

        this.rememberCurrentMapping();
        this.xml = nextXml;
        this.error = '';
        this.invalidateVisualMapping();
        const decision = this.coordinator.begin('DIAGRAM', {
          xmlHash: this.coordinator.xmlHash(nextXml)
        });
        if (decision.token) this.refreshRoutePreview(nextXml, true, decision.token);
      }));
    }
    this.watchTableSelection('steps', 'nodeMap');
    this.watchTableSelection('transitions', 'edgeMap');
  }

  private loadTemplate(id: string): void {
    const decision = this.coordinator.begin('LOAD', { resourceVersion: id });
    const token = decision.token;
    if (!token) return;
    const targetForm = this.form;
    this.loading = true;
    this.error = '';
    this.templateRequest = this.api.getTemplate(id).subscribe(template => {
      if (this.form !== targetForm || !this.coordinator.isCurrent(token)) {
        if (this.form === targetForm) this.loading = false;
        this.coordinator.discardStale(token);
        return;
      }

      this.loading = false;
      if (this.form.dirty) {
        this.coordinator.cancel(token, 'form contains newer local changes');
        this.initializeFromCurrentForm();
        return;
      }
      this.applyRepresentation(this.bpmnMapper.toRepresentation(template));
      this.coordinator.complete(token, {
        resourceVersion: id,
        routeHash: this.routeGraph.routeHash(template),
        xmlHash: this.coordinator.xmlHash(this.xml)
      });
    }, error => {
      if (this.form !== targetForm || !this.coordinator.isCurrent(token)) {
        if (this.form === targetForm) this.loading = false;
        this.coordinator.discardStale(token);
        return;
      }

      this.loading = false;
      this.error = this.errorMessage(error, 'Process map could not be loaded');
      this.coordinator.fail(token, 'SYNC_LOAD_FAILED', this.error);
    });
  }

  private initializeFromCurrentForm(): void {
    const value = this.form.getRawValue();
    if (value.bpmnXml) {
      this.xml = String(value.bpmnXml);
      this.refreshRoutePreview(this.xml);
      this.seedSynchronization(this.xml);
      return;
    }

    this.applyRepresentation(this.bpmnMapper.toRepresentation(this.routeMapper.toDraft(value)));
    this.seedSynchronization(this.xml);
  }

  private applyRepresentation(representation: BusinessProcessBpmnRepresentation): void {
    this.xml = representation.xml;
    this.setControlValue('bpmnXml', representation.xml);
    this.setControlValue('visualMapping', JSON.stringify(representation.visualMapping, null, 2));
    this.previewMapping = representation.visualMapping;
    this.mappingInvalidated = false;
    this.refreshRoutePreview(representation.xml);
  }

  private synchronizeFromTables(
    markFormDirty = true,
    requestedToken?: BusinessProcessSynchronizationToken
  ): boolean {
    if (this.readonly) {
      if (requestedToken) this.coordinator.cancel(requestedToken, 'form is readonly');
      return false;
    }

    const draft = this.routeMapper.toDraft(this.form.getRawValue());
    const analysis = this.routeGraph.analyze(draft);
    const token = requestedToken || this.coordinator.begin('TABLES', {
      routeHash: analysis.routeHash
    }).token;
    if (!token) return true;
    if (!this.coordinator.isCurrent(token)) {
      this.coordinator.discardStale(token);
      return false;
    }
    const routeError = analysis.issues.find(issue => issue.severity === 'error'
      && (issue.path === '$.steps'
        || issue.path.indexOf('$.steps[') === 0
        || issue.path.indexOf('$.steps.') === 0
        || issue.path === '$.transitions'
        || issue.path.indexOf('$.transitions[') === 0
        || issue.path.indexOf('$.parameters.startStepKey') === 0));

    if (routeError) {
      this.mappingInvalidated = true;
      this.error = 'Process map was not synchronized: ' + routeError.message;
      this.coordinator.fail(token, 'SYNC_TABLE_ROUTE_INVALID', routeError.message, routeError.path);
      return false;
    }

    const representation = this.bpmnMapper.synchronizeFromRoute(
      analysis.normalized,
      this.xml || draft.bpmnXml || '',
      draft.visualMapping || this.previewMapping
    );
    this.applyRepresentation(representation);
    this.error = '';

    if (markFormDirty) {
      this.form.get('bpmnXml')?.markAsDirty();
      this.form.get('visualMapping')?.markAsDirty();
      this.form.markAsDirty();
    }
    this.coordinator.complete(token, {
      routeHash: analysis.routeHash,
      xmlHash: this.coordinator.xmlHash(representation.xml)
    });
    return true;
  }

  private updateXmlControl(
    xml: string,
    invalidateMapping: boolean,
    requestedToken?: BusinessProcessSynchronizationToken
  ): void {
    let token = requestedToken;
    if (invalidateMapping) {
      token = token || this.coordinator.begin('DIAGRAM', {
        xmlHash: this.coordinator.xmlHash(xml)
      }).token;
      if (!token) return;
      if (!this.coordinator.isCurrent(token)) {
        this.coordinator.discardStale(token);
        if (this.pendingDiagramToken === token) this.pendingDiagramToken = undefined;
        return;
      }
    }

    this.xml = xml;
    const control = this.form.get('bpmnXml');
    const xmlChanged = !!control && control.value !== xml;

    if (xmlChanged) {
      control.setValue(xml, { emitEvent: false });
      control.markAsDirty();
    }

    if (invalidateMapping) this.invalidateVisualMapping(false);
    if (xmlChanged || invalidateMapping) this.form.markAsDirty();
    this.refreshRoutePreview(xml, invalidateMapping, token);
    if (this.pendingDiagramToken === token) this.pendingDiagramToken = undefined;
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

  private rememberCurrentMapping(): void {
    const mapping = this.routeMapper.toDraft(this.form.getRawValue()).visualMapping;
    if (mapping) this.previewMapping = mapping;
  }

  private refreshRoutePreview(
    xml: string,
    applyToForm = false,
    token?: BusinessProcessSynchronizationToken
  ): void {
    const draft = this.routeMapper.toDraft(this.form.getRawValue());
    const previewDraft: BusinessProcessTemplateDraft = {
      ...draft,
      visualMapping: draft.visualMapping || this.previewMapping
    };
    this.routePreview = this.bpmnParser.parse(xml, previewDraft);
    this.previewMapping = this.routePreview.visualMapping;
    if (applyToForm && token) {
      if (!this.routePreview.valid) {
        this.coordinator.fail(
          token,
          'SYNC_DIAGRAM_PREVIEW_INVALID',
          'BPMN route preview contains validation errors',
          '$.bpmnXml'
        );
      } else if (this.readonly) {
        this.coordinator.cancel(token, 'form is readonly');
      } else if (this.coordinator.isCurrent(token)) {
        this.applyRoutePreview(this.routePreview, previewDraft, token, xml);
      }
    }
  }

  private applyRoutePreview(
    preview: BusinessProcessBpmnRoutePreview,
    current: BusinessProcessTemplateDraft,
    token: BusinessProcessSynchronizationToken,
    xml: string
  ): void {
    const result = this.formRouteSync.apply(this.form, preview);
    if (!result.applied) {
      this.error = result.error || 'BPMN route could not be applied to the form';
      this.mappingInvalidated = true;
      this.coordinator.fail(token, 'SYNC_DIAGRAM_APPLY_FAILED', this.error);
      return;
    }

    const currentParameters = current.parameters
      && typeof current.parameters === 'object'
      && !Array.isArray(current.parameters)
      ? current.parameters as Record<string, unknown>
      : {};
    const parameters = {
      ...currentParameters,
      startStepKey: preview.route.startStepKey
    };
    this.setControlValue('parameters', JSON.stringify(parameters, null, 2), true);
    this.setControlValue('visualMapping', JSON.stringify(preview.visualMapping, null, 2), true);
    this.previewMapping = preview.visualMapping;
    this.mappingInvalidated = false;
    this.error = '';
    this.form.updateValueAndValidity({ emitEvent: false });
    this.form.markAsDirty();
    this.coordinator.complete(token, {
      routeHash: preview.routeHash,
      xmlHash: this.coordinator.xmlHash(xml)
    });
    this.onDiagramElementSelected(this.modeler?.selectedElement || null);
  }

  private beginTablesSynchronization(): BusinessProcessSynchronizationToken | undefined {
    const draft = this.routeMapper.toDraft(this.form.getRawValue());
    return this.coordinator.begin('TABLES', {
      routeHash: this.routeGraph.routeHash(draft)
    }).token;
  }

  private seedSynchronization(xml: string): void {
    const draft = this.routeMapper.toDraft(this.form.getRawValue());
    this.coordinator.seed({
      routeHash: this.routeGraph.routeHash(draft),
      xmlHash: this.coordinator.xmlHash(xml)
    });
  }

  private watchTableSelection(
    controlName: 'steps' | 'transitions',
    mappingName: 'nodeMap' | 'edgeMap'
  ): void {
    const formArray = this.form.get(controlName);
    if (!(formArray instanceof UntypedFormArray)) return;

    this.formChanges.add(this.tableSelection.changes(formArray)
      .pipe(filter(event => event.source === 'TABLE'))
      .subscribe(event => this.selectDiagramFromTable(event, controlName, mappingName)));
  }

  private selectDiagramFromTable(
    event: DynamicTableSelectionEvent,
    controlName: 'steps' | 'transitions',
    mappingName: 'nodeMap' | 'edgeMap'
  ): void {
    const key = String(event.row?.['key'] || '').trim();
    const elementId = key ? this.previewMapping?.[mappingName]?.[key] : undefined;
    this.modeler?.selectElementById(elementId);

    const otherControl = this.form.get(controlName === 'steps' ? 'transitions' : 'steps');
    if (otherControl instanceof UntypedFormArray) {
      this.tableSelection.selectExternal(otherControl, 'key');
    }
  }

  private reverseMappingValue(
    mapping: { [domainKey: string]: string } | undefined,
    bpmnId: string
  ): string | undefined {
    return Object.keys(mapping || {}).find(key => mapping?.[key] === bpmnId);
  }

  private setControlValue(name: string, value: unknown, markDirty = false): void {
    const control = this.form.get(name);
    if (!control || control.value === value) return;
    control.setValue(value, { emitEvent: false });
    if (markDirty) control.markAsDirty();
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
