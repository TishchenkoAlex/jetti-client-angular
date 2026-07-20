import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BpmnEditorComponent } from '../diagram/components/bpmn-editor/bpmn-editor.component';
import { BpmnDemoPageComponent } from './bpmn-demo-page.component';
import { BusinessProcessTemplateBpmnComponent } from './business-process-template-bpmn.component';

@NgModule({
  declarations: [
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent
  ],
  imports: [
    CommonModule,
    BpmnEditorComponent
  ],
  exports: [
    BpmnEditorComponent,
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent
  ]
})
export class BpmnModule {}
