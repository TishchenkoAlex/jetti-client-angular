import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { PrimeNGModule } from '../primeNG.module';
import { ProcessPanelComponent } from './components/process-panel/process-panel.component';
import { ProcessTimelineComponent } from './components/process-timeline/process-timeline.component';
import { TaskActionDialogComponent } from './components/task-action-dialog/task-action-dialog.component';
import { TaskActionsComponent } from './components/task-actions/task-actions.component';
import { MyTasksPageComponent } from './pages/my-tasks-page/my-tasks-page.component';
import { BpmnModule } from './bpmn/bpmn.module';

@NgModule({
  declarations: [
    MyTasksPageComponent,
    TaskActionsComponent,
    TaskActionDialogComponent,
    ProcessPanelComponent,
    ProcessTimelineComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    PrimeNGModule,
    BpmnModule
  ],
  exports: [
    MyTasksPageComponent,
    ProcessPanelComponent,
    ProcessTimelineComponent
  ],
  entryComponents: [
    MyTasksPageComponent,
    TaskActionDialogComponent
  ]
})
export class BusinessProcessModule {}
