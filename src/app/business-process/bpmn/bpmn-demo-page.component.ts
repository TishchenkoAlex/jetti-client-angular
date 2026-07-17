import { Component } from '@angular/core';
import { DEFAULT_BPMN_XML } from './default-bpmn-xml';

@Component({
  selector: 'bp-bpmn-demo-page',
  templateUrl: './bpmn-demo-page.component.html'
})
export class BpmnDemoPageComponent {
  xml = DEFAULT_BPMN_XML;
  savedXml = '';
  message = '';
  error = '';

  onXmlChange(xml: string) {
    this.savedXml = xml;
    this.message = 'BPMN XML saved in component state';
    this.error = '';
  }

  onImportError(error: any) {
    this.error = this.getErrorMessage(error, 'BPMN import failed');
  }

  onSaveError(error: any) {
    this.error = this.getErrorMessage(error, 'BPMN save failed');
  }

  private getErrorMessage(error: any, fallback: string): string {
    if (error && error.message) return error.message;
    return fallback;
  }
}
