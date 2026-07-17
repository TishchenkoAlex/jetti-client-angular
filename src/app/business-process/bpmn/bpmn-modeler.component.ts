import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild
} from '@angular/core';

import BpmnModeler from 'bpmn-js/lib/Modeler';

@Component({
  selector: 'bp-bpmn-modeler',
  templateUrl: './bpmn-modeler.component.html',
  styleUrls: ['./bpmn-modeler.component.scss']
})
export class BpmnModelerComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas', { static: true }) canvas: ElementRef;

  @Input() xml: string;
  @Input() readonly = false;

  @Output() xmlChange = new EventEmitter<string>();
  @Output() imported = new EventEmitter<void>();
  @Output() importError = new EventEmitter<any>();
  @Output() saveError = new EventEmitter<any>();

  modeler: any;
  loading = false;
  error = '';
  private changeTimer: any;
  private suppressChanges = false;
  private readonly commandStackChanged = () => this.scheduleXmlChange();

  ngAfterViewInit() {
    this.createModeler();

    if (this.xml) {
      this.importXml(this.xml);
    }
  }

  createModeler() {
    this.modeler = new BpmnModeler({
      container: this.canvas.nativeElement
    });
    this.modeler.on('commandStack.changed', this.commandStackChanged);
  }

  importXml(xml: string) {
    var self = this;

    if (!this.modeler) {
      this.error = 'BPMN modeler is not initialized';
      return;
    }

    this.loading = true;
    this.error = '';
    this.suppressChanges = true;

    this.modeler.importXML(xml).then(function() {
      self.loading = false;
      self.suppressChanges = false;
      self.imported.emit();
      self.fitViewport();
    }).catch(function(error: any) {
      self.loading = false;
      self.suppressChanges = false;
      self.error = 'BPMN import failed';
      self.importError.emit(error);
    });
  }

  saveXml() {
    this.serializeXml(true);
  }

  getXml(): Promise<string> {
    if (!this.modeler) return Promise.reject(new Error('BPMN modeler is not initialized'));
    return this.modeler.saveXML({ format: true }).then(function(result: any) {
      return result && result.xml ? result.xml : '';
    });
  }

  private scheduleXmlChange() {
    if (this.suppressChanges || this.readonly) return;
    if (this.changeTimer) clearTimeout(this.changeTimer);
    this.changeTimer = setTimeout(() => this.serializeXml(false), 250);
  }

  private serializeXml(showLoading: boolean) {
    var self = this;

    if (!this.modeler) {
      this.error = 'BPMN modeler is not initialized';
      return;
    }

    if (showLoading) this.loading = true;
    this.error = '';

    this.getXml().then(function(xml: string) {
      if (showLoading) self.loading = false;

      if (xml) self.xmlChange.emit(xml);
    }).catch(function(error: any) {
      if (showLoading) self.loading = false;
      self.error = 'BPMN save failed';
      self.saveError.emit(error);
    });
  }

  fitViewport() {
    try {
      var canvas = this.modeler.get('canvas');
      if (canvas) {
        canvas.zoom('fit-viewport');
      }
    } catch (error) {
      // Viewport fitting is optional and must not break the wrapper.
    }
  }

  ngOnDestroy() {
    if (this.changeTimer) clearTimeout(this.changeTimer);
    if (this.modeler) {
      this.modeler.off('commandStack.changed', this.commandStackChanged);
      this.modeler.destroy();
      this.modeler = null;
    }
  }
}
