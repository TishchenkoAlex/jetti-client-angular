import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';

import { DEFAULT_BPMN_XML } from '../../constants/default-bpmn-xml';
import {
  BpmnElementSelection,
  BusinessProcessDiagramError,
  BusinessProcessDiagramImportResult
} from '../../models/business-process-diagram.models';
import { BpmnEditorComponent } from '../bpmn-editor/bpmn-editor.component';

@Component({
  selector: 'bp-bpmn-editor-demo',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ButtonModule, BpmnEditorComponent],
  templateUrl: './bpmn-editor-demo.component.html',
  styleUrls: ['./bpmn-editor-demo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BpmnEditorDemoComponent {
  readonly xmlControl = new FormControl(DEFAULT_BPMN_XML, { nonNullable: true });

  xml = DEFAULT_BPMN_XML;
  selectedElement: BpmnElementSelection | null = null;
  message = '';
  error = '';
  isReadonly = false;

  applyXml(): void {
    const xml = this.xmlControl.value.trim();
    if (!xml) {
      this.error = 'BPMN XML cannot be empty';
      return;
    }

    this.error = '';
    this.message = 'Importing XML from the local editor';
    this.xml = xml;
  }

  resetDiagram(): void {
    this.xml = DEFAULT_BPMN_XML;
    this.xmlControl.setValue(DEFAULT_BPMN_XML, { emitEvent: false });
    this.selectedElement = null;
    this.error = '';
    this.message = 'Default BPMN diagram restored';
  }

  onReadonlyChange(event: Event): void {
    this.isReadonly = (event.target as HTMLInputElement).checked;
  }

  onXmlChange(xml: string): void {
    this.xml = xml;
    this.xmlControl.setValue(xml, { emitEvent: false });
    this.error = '';
    this.message = 'BPMN XML saved in local component state';
  }

  onElementSelected(element: BpmnElementSelection | null): void {
    this.selectedElement = element;
  }

  onImportCompleted(result: BusinessProcessDiagramImportResult): void {
    const warningCount = result.warnings.length;
    this.error = '';
    this.message = warningCount
      ? `BPMN XML imported with ${warningCount} warning(s)`
      : 'BPMN XML imported successfully';
  }

  onDiagramError(error: BusinessProcessDiagramError): void {
    this.error = `${error.operation}: ${error.message}`;
    this.message = '';
  }
}
