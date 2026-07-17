import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';

import { BpmnDemoPageComponent } from './bpmn-demo-page.component';
import { BpmnModelerComponent } from './bpmn-modeler.component';
import { BusinessProcessTemplateBpmnComponent } from './business-process-template-bpmn.component';

@NgModule({
  declarations: [
    BpmnModelerComponent,
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent
  ],
  imports: [
    CommonModule
  ],
  exports: [
    BpmnModelerComponent,
    BpmnDemoPageComponent,
    BusinessProcessTemplateBpmnComponent
  ]
})
export class BpmnModule {}
