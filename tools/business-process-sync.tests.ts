import '@angular/compiler';
import { UntypedFormArray, UntypedFormControl, UntypedFormGroup } from '@angular/forms';
import BpmnModdle from 'bpmn-moddle';
import assert from 'node:assert/strict';
import test from 'node:test';

import { BusinessProcessBpmnMapperService } from '../src/app/business-process/bpmn/business-process-bpmn-mapper.service';
import { BusinessProcessBpmnRoutePreview } from '../src/app/business-process/models/business-process-bpmn-preview.models';
import { BusinessProcessTemplateDraft } from '../src/app/business-process/models/business-process-template.models';
import { BusinessProcessFormRouteSyncService } from '../src/app/business-process/services/business-process-form-route-sync.service';
import { BusinessProcessRouteGraphService } from '../src/app/business-process/services/business-process-route-graph.service';
import { BusinessProcessSynchronizationCoordinator } from '../src/app/business-process/services/business-process-synchronization-coordinator.service';
import { DynamicTableRefreshService } from '../src/app/common/dynamic-form/dynamic-table-refresh.service';
import { DynamicTableSelectionService } from '../src/app/common/dynamic-form/dynamic-table-selection.service';

function template(): BusinessProcessTemplateDraft {
  return {
    code: 'APPROVAL',
    objectTypes: ['Document.Operation'],
    startMode: 'MANUAL',
    parameters: { startStepKey: 'approval_1' },
    steps: [
      { key: 'approval_1', title: 'Approval 1', type: 'USER_TASK', dueRule: { hours: 4 } },
      { key: 'approval_2', title: 'Approval 2', type: 'USER_TASK' }
    ],
    transitions: [
      { key: 'approve_1', from: 'approval_1', on: 'APPROVE', to: 'approval_2' },
      { key: 'approve_2', from: 'approval_2', on: 'APPROVE', to: 'END_APPROVED' }
    ]
  };
}

function table(fields: string[], rows: Array<Record<string, unknown>>): UntypedFormArray {
  const sample = new UntypedFormGroup(fields.reduce((controls, field) => {
    controls[field] = new UntypedFormControl();
    return controls;
  }, {} as Record<string, UntypedFormControl>));
  sample.addControl('index', new UntypedFormControl(0));
  const formArray = new UntypedFormArray(rows.map((row, index) => {
    const control = new UntypedFormGroup(fields.reduce((controls, field) => {
      controls[field] = new UntypedFormControl(row[field]);
      return controls;
    }, {} as Record<string, UntypedFormControl>));
    control.addControl('index', new UntypedFormControl(index));
    return control;
  }));
  formArray['sample'] = sample;
  return formArray;
}

function preview(
  steps: BusinessProcessBpmnRoutePreview['route']['steps'],
  transitions: BusinessProcessBpmnRoutePreview['route']['transitions']
): BusinessProcessBpmnRoutePreview {
  return {
    valid: true,
    routeHash: 'test-route',
    route: { startStepKey: steps[0]?.key, steps, transitions },
    visualMapping: { schemaVersion: 2, notation: 'BPMN', nodeMap: {}, edgeMap: {}, endNodeMap: {} },
    statistics: { startEvents: 1, endEvents: 1, steps: steps.length, gateways: 0, sequenceFlows: transitions.length + 1 },
    diagnostics: []
  };
}

test('route render keeps semantic nodes and stable mapping ids', async () => {
  const graph = new BusinessProcessRouteGraphService();
  const mapper = new BusinessProcessBpmnMapperService(graph);
  const initial = mapper.synchronizeFromRoute(template());
  const changed = template();
  changed.transitions = [
    { key: 'reject_1', from: 'approval_1', on: 'REJECT', to: 'END_REJECTED' },
    ...changed.transitions
  ];
  const rendered = mapper.synchronizeFromRoute(changed, initial.xml, initial.visualMapping);

  assert.equal(rendered.visualMapping.nodeMap?.['approval_1'], initial.visualMapping.nodeMap?.['approval_1']);
  assert.equal(rendered.visualMapping.edgeMap?.['approve_1'], initial.visualMapping.edgeMap?.['approve_1']);
  assert.notEqual(rendered.visualMapping.edgeMap?.['reject_1'], rendered.visualMapping.edgeMap?.['approve_1']);

  const moddle = new BpmnModdle();
  const parsed = await moddle.fromXML(rendered.xml);
  const process = parsed.rootElement.rootElements.find((element: { $type?: string }) => element.$type === 'bpmn:Process');
  const elements = process.flowElements as Array<{ $type: string; id: string; name?: string }>;
  assert.equal(elements.filter(element => element.$type === 'bpmn:UserTask').length, 2);
  assert.equal(elements.filter(element => element.$type === 'bpmn:SequenceFlow').length, 4);
  assert.ok(elements.some(element => element.id === rendered.visualMapping.edgeMap?.['reject_1']));
});

test('diagram preview creates, renames, connects and deletes rows without losing nonvisual values', () => {
  const steps = table(
    ['key', 'title', 'type', 'dueRule', 'penaltyRule', 'allowRedirect'],
    [{
      key: 'approval_1', title: 'Old title', type: 'USER_TASK',
      dueRule: '{"hours":4}', penaltyRule: '{"amount":10}', allowRedirect: true
    }]
  );
  const transitions = table(
    ['key', 'from', 'on', 'to', 'condition'],
    [{ key: 'approve_1', from: 'approval_1', on: 'APPROVE', to: 'END_APPROVED', condition: '{"field":"status"}' }]
  );
  const form = new UntypedFormGroup({ steps, transitions });
  const sync = new BusinessProcessFormRouteSyncService(new DynamicTableRefreshService());

  const createAndConnect = preview(
    [
      { key: 'approval_1', title: 'Renamed', type: 'USER_TASK', dueRule: { hours: 4 } },
      { key: 'approval_2', title: 'Approval 2', type: 'SYSTEM_TASK' }
    ],
    [
      { key: 'approve_1', from: 'approval_1', on: 'APPROVE', to: 'approval_2', condition: { field: 'status' } },
      { key: 'finish_2', from: 'approval_2', on: 'AUTO', to: 'END_APPROVED' }
    ]
  );
  assert.deepEqual(sync.apply(form, createAndConnect), { applied: true, changed: true });
  assert.equal(steps.length, 2);
  assert.equal(steps.at(0).get('title')?.value, 'Renamed');
  assert.equal(steps.at(0).get('dueRule')?.value, '{"hours":4}');
  assert.equal(steps.at(0).get('penaltyRule')?.value, '{"amount":10}');
  assert.equal(transitions.at(0).get('condition')?.value, '{"field":"status"}');
  assert.equal(transitions.at(0).get('to')?.value, 'approval_2');

  const deleteSecondStep = preview(
    [{ key: 'approval_1', title: 'Renamed', type: 'USER_TASK' }],
    [{ key: 'approve_1', from: 'approval_1', on: 'APPROVE', to: 'END_APPROVED' }]
  );
  assert.equal(sync.apply(form, deleteSecondStep).changed, true);
  assert.equal(steps.length, 1);
  assert.equal(transitions.length, 1);
});

test('coordinator applies last user command and rejects duplicates', () => {
  const coordinator = new BusinessProcessSynchronizationCoordinator();
  const tables = coordinator.begin('TABLES', { routeHash: 'route-1' }).token;
  const diagram = coordinator.begin('DIAGRAM', { xmlHash: 'xml-2' }).token;
  assert.ok(tables && diagram);
  assert.equal(coordinator.isCurrent(tables), false);
  assert.equal(coordinator.isCurrent(diagram), true);
  assert.equal(coordinator.complete(diagram!, { routeHash: 'route-2', xmlHash: 'xml-2' }), true);
  assert.equal(coordinator.begin('DIAGRAM', { xmlHash: 'xml-2' }).duplicate, true);
  assert.ok(coordinator.snapshot().diagnostics.some(issue => issue.code === 'SYNC_OPERATION_SUPERSEDED'));
});

test('undo and redo are treated as newer diagram generations', () => {
  const coordinator = new BusinessProcessSynchronizationCoordinator();
  const edit = coordinator.begin('DIAGRAM').token;
  const undo = coordinator.begin('DIAGRAM').token;
  const redo = coordinator.begin('DIAGRAM').token;
  assert.ok(edit && undo && redo);
  assert.equal(coordinator.isCurrent(edit), false);
  assert.equal(coordinator.isCurrent(undo), false);
  assert.equal(coordinator.isCurrent(redo), true);
  assert.equal(coordinator.complete(redo!, { xmlHash: 'redo-xml', routeHash: 'redo-route' }), true);
});

test('cross-selection keeps table and external events directionally isolated', () => {
  const selection = new DynamicTableSelectionService();
  const formArray = table(['key'], [{ key: 'approval_1' }]);
  const events: string[] = [];
  const subscription = selection.changes(formArray).subscribe(event => events.push(event.source));

  selection.selectFromTable(formArray, { key: 'approval_1' });
  selection.selectExternal(formArray, 'key', 'approval_1');
  subscription.unsubscribe();

  assert.deepEqual(events, ['TABLE', 'EXTERNAL']);
});
