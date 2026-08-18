import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BpmnEditorComponent } from '../diagram/components/bpmn-editor/bpmn-editor.component';
import { BpmnDemoPageComponent } from './bpmn-demo-page.component';
import { BusinessProcessTemplateBpmnComponent } from './business-process-template-bpmn.component';
import { BusinessProcessInstanceRouteComponent } from './business-process-instance-route.component';

@NgModule({
  declarations: [
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent,
    BusinessProcessInstanceRouteComponent
  ],
  imports: [
    CommonModule,
    BpmnEditorComponent
  ],
  exports: [
    BpmnEditorComponent,
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent,
    BusinessProcessInstanceRouteComponent
  ]
})
export class BpmnModule {}
