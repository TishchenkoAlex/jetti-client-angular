import { Component } from '@angular/core';
import { BusinessProcessDiagramError } from '../diagram/models/business-process-diagram.models';
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

  onDiagramError(error: BusinessProcessDiagramError) {
    this.error = error.message;
  }
}
