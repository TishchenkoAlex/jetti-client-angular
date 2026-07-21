import { Injectable } from '@angular/core';

import { BusinessProcessBpmnRoutePreview } from '../models/business-process-bpmn-preview.models';
import { BusinessProcessValidationIssue } from '../models/business-process-route-graph.models';
import {
  BusinessProcessStep,
  BusinessProcessStepType,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { BusinessProcessRouteGraphService } from './business-process-route-graph.service';

type ParsedNodeKind = 'start' | 'end' | 'step' | 'gateway';

interface ParsedBpmnNode {
  id: string;
  kind: ParsedNodeKind;
  element: Element;
  key?: string;
  endState?: string;
  stepType?: BusinessProcessStepType;
}

interface ParsedBpmnFlow {
  id: string;
  name?: string;
  sourceId: string;
  targetId: string;
}

interface ResolvedFlowPath {
  target: ParsedBpmnNode;
  flows: ParsedBpmnFlow[];
}

@Injectable({ providedIn: 'root' })
export class BusinessProcessBpmnParserService {
  private readonly bpmnNamespace = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
  private readonly transitionEvents = ['APPROVE', 'REJECT', 'TIMEOUT', 'AUTO'];

  constructor(private readonly routeGraph: BusinessProcessRouteGraphService) {}

  parse(xml: string, current: BusinessProcessTemplateDraft): BusinessProcessBpmnRoutePreview {
    const diagnostics: BusinessProcessValidationIssue[] = [];
    const emptyMapping = this.mapping(current.visualMapping);
    if (!xml.trim()) {
      this.issue(diagnostics, 'error', 'BPMN_XML_REQUIRED', '$.bpmnXml', 'BPMN XML is required');
      return this.preview([], [], undefined, emptyMapping, diagnostics, 0, 0, 0);
    }
    if (typeof DOMParser === 'undefined') {
      this.issue(
        diagnostics,
        'error',
        'BPMN_PARSER_UNAVAILABLE',
        '$.bpmnXml',
        'XML parser is not available in the current environment'
      );
      return this.preview([], [], undefined, emptyMapping, diagnostics, 0, 0, 0);
    }

    const document = new DOMParser().parseFromString(xml, 'application/xml');
    if (this.hasParserError(document)) {
      this.issue(diagnostics, 'error', 'BPMN_XML_INVALID', '$.bpmnXml', 'BPMN XML is not well-formed');
      return this.preview([], [], undefined, emptyMapping, diagnostics, 0, 0, 0);
    }

    const processes = document.getElementsByTagNameNS(this.bpmnNamespace, 'process');
    if (processes.length !== 1) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_PROCESS_COUNT',
        '$.bpmnXml.process',
        `Exactly one BPMN process is supported; found ${processes.length}`
      );
    }
    const process = processes.item(0);
    if (!process) return this.preview([], [], undefined, emptyMapping, diagnostics, 0, 0, 0);

    const reverseNodeMap = this.reverseMapping(current.visualMapping?.nodeMap, diagnostics, 'nodeMap');
    const reverseEdgeMap = this.reverseMapping(current.visualMapping?.edgeMap, diagnostics, 'edgeMap');
    const reverseEndMap = this.reverseMapping(current.visualMapping?.endNodeMap, diagnostics, 'endNodeMap');
    const existingSteps = this.byKey(current.steps || []);
    const existingTransitions = this.byKey(current.transitions || []);
    const nodesById: { [id: string]: ParsedBpmnNode } = {};
    const flows: ParsedBpmnFlow[] = [];

    this.childElements(process).forEach((element, index) => {
      const localName = element.localName;
      if (localName === 'sequenceFlow') {
        const id = this.requiredId(element, diagnostics, `$.bpmnXml.sequenceFlows[${flows.length}]`);
        if (!id) return;
        if (nodesById[id] || flows.some(flow => flow.id === id)) {
          this.issue(diagnostics, 'error', 'BPMN_ID_DUPLICATE', `$.bpmnXml#${id}`, `Duplicate BPMN id: ${id}`);
          return;
        }
        flows.push({
          id,
          name: this.optionalAttribute(element, 'name'),
          sourceId: element.getAttribute('sourceRef') || '',
          targetId: element.getAttribute('targetRef') || ''
        });
        return;
      }

      const kind = this.nodeKind(localName);
      if (!kind) {
        if (localName !== 'documentation' && localName !== 'extensionElements') {
          this.issue(
            diagnostics,
            'error',
            'BPMN_ELEMENT_UNSUPPORTED',
            `$.bpmnXml.process[${index}]`,
            `Unsupported BPMN process element: ${localName}`
          );
        }
        return;
      }

      const id = this.requiredId(element, diagnostics, `$.bpmnXml.process[${index}]`);
      if (!id) return;
      if (nodesById[id] || flows.some(flow => flow.id === id)) {
        this.issue(diagnostics, 'error', 'BPMN_ID_DUPLICATE', `$.bpmnXml#${id}`, `Duplicate BPMN id: ${id}`);
        return;
      }

      const node: ParsedBpmnNode = { id, kind, element };
      if (kind === 'step') {
        node.key = reverseNodeMap[id] || id;
        node.stepType = this.stepType(element, diagnostics);
      }
      if (kind === 'end') node.endState = reverseEndMap[id];
      nodesById[id] = node;
    });

    const nodes = Object.keys(nodesById).map(id => nodesById[id]);
    const starts = nodes.filter(node => node.kind === 'start');
    const ends = nodes.filter(node => node.kind === 'end');
    const stepNodes = nodes.filter(node => node.kind === 'step');
    const gateways = nodes.filter(node => node.kind === 'gateway');
    if (starts.length !== 1) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_START_EVENT_COUNT',
        '$.bpmnXml.startEvents',
        `Exactly one start event is supported; found ${starts.length}`
      );
    }

    this.assignEndStates(ends, diagnostics);
    this.validateFlows(flows, nodesById, diagnostics);
    const outgoing = this.outgoingFlows(flows);
    const consumedFlowIds = new Set<string>();
    const startPaths = starts.length === 1
      ? this.resolvePaths(starts[0], outgoing, nodesById, diagnostics, consumedFlowIds)
      : [];
    const startTargets = startPaths.filter(path => path.target.kind === 'step');
    if (starts.length === 1 && (startPaths.length !== 1 || startTargets.length !== 1)) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_START_TARGET_INVALID',
        `$.bpmnXml#${starts[0].id}`,
        'Start event must resolve to exactly one process step'
      );
    }
    const startStepKey = startTargets.length === 1 ? startTargets[0].target.key : undefined;

    const steps = stepNodes.map(node => this.toStep(node, existingSteps[node.key || '']));
    const transitions: BusinessProcessTransition[] = [];
    const edgeMap: { [transitionKey: string]: string } = {};
    const usedTransitionKeys = new Set<string>();
    const transitionPaths: Array<{ source: ParsedBpmnNode; path: ResolvedFlowPath }> = [];
    stepNodes.forEach(node => {
      const paths = this.resolvePaths(node, outgoing, nodesById, diagnostics, consumedFlowIds);
      paths.forEach(path => {
        if (path.target.kind !== 'step' && path.target.kind !== 'end') {
          this.issue(
            diagnostics,
            'error',
            'BPMN_TRANSITION_TARGET_INVALID',
            `$.bpmnXml#${node.id}`,
            `Step ${node.id} does not resolve to a step or end event`
          );
          return;
        }
        transitionPaths.push({ source: node, path });
      });
    });
    const flowUsage = this.flowUsage(transitionPaths.map(item => item.path));
    transitionPaths.forEach(item => {
      const representativeFlow = this.representativeFlow(item.path, flowUsage);
      const transition = this.toTransition(
        item.source,
        item.path,
        representativeFlow,
        reverseEdgeMap,
        existingTransitions,
        usedTransitionKeys,
        diagnostics
      );
      transitions.push(transition);
      edgeMap[transition.key] = representativeFlow.id;
    });

    flows.forEach(flow => {
      if (!consumedFlowIds.has(flow.id)) {
        this.issue(
          diagnostics,
          'warning',
          'BPMN_FLOW_UNREACHABLE',
          `$.bpmnXml#${flow.id}`,
          `Sequence flow is not reachable from the start event or a process step: ${flow.id}`
        );
      }
    });

    const nodeMap: { [stepKey: string]: string } = {};
    stepNodes.forEach(node => {
      if (node.key) nodeMap[node.key] = node.id;
    });
    const endNodeMap: { [endState: string]: string } = {};
    ends.forEach(node => {
      if (node.endState) endNodeMap[node.endState] = node.id;
    });
    const visualMapping: BusinessProcessVisualMapping = {
      schemaVersion: 2,
      notation: 'BPMN',
      startEventId: starts.length === 1 ? starts[0].id : undefined,
      nodeMap,
      edgeMap,
      endNodeMap
    };

    const candidate = this.routeGraph.normalize({
      ...current,
      steps,
      transitions,
      parameters: { ...(current.parameters || {}), startStepKey },
      bpmnXml: xml,
      visualMapping
    });
    const analysis = this.routeGraph.analyze(candidate);
    analysis.issues
      .filter(issue => this.isRouteIssue(issue))
      .forEach(issue => this.addIssue(diagnostics, issue));
    visualMapping.routeHash = analysis.routeHash;

    return this.preview(
      steps,
      transitions,
      startStepKey,
      visualMapping,
      diagnostics,
      starts.length,
      ends.length,
      gateways.length,
      flows.length,
      analysis.routeHash
    );
  }

  private nodeKind(localName: string): ParsedNodeKind | undefined {
    if (localName === 'startEvent') return 'start';
    if (localName === 'endEvent') return 'end';
    if (localName === 'exclusiveGateway') return 'gateway';
    if (['task', 'userTask', 'serviceTask', 'intermediateCatchEvent'].includes(localName)) return 'step';
    return undefined;
  }

  private stepType(element: Element, diagnostics: BusinessProcessValidationIssue[]): BusinessProcessStepType {
    if (element.localName === 'userTask') return 'USER_TASK';
    if (element.localName === 'serviceTask') return 'SYSTEM_TASK';
    if (element.localName === 'task') return 'AUTO';

    const timerDefinitions = element.getElementsByTagNameNS(this.bpmnNamespace, 'timerEventDefinition');
    const eventDefinitions = this.childElements(element)
      .filter(child => child.localName.endsWith('EventDefinition'));
    if (timerDefinitions.length !== 1 || eventDefinitions.some(child => child.localName !== 'timerEventDefinition')) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_EVENT_UNSUPPORTED',
        `$.bpmnXml#${element.getAttribute('id') || 'intermediateCatchEvent'}`,
        'Only an intermediate catch event with one timer definition is supported'
      );
    }
    return 'TIMER';
  }

  private assignEndStates(ends: ParsedBpmnNode[], diagnostics: BusinessProcessValidationIssue[]): void {
    const used = new Set<string>();
    ends.forEach(node => {
      let endState = node.endState;
      if (!endState) endState = this.inferEndState(node.element, ends.length, diagnostics);
      if (endState && used.has(endState)) {
        this.issue(
          diagnostics,
          'error',
          'BPMN_END_STATE_DUPLICATE',
          `$.bpmnXml#${node.id}`,
          `Multiple end events resolve to ${endState}`
        );
      }
      if (endState) used.add(endState);
      node.endState = endState;
    });
  }

  private inferEndState(
    element: Element,
    endCount: number,
    diagnostics: BusinessProcessValidationIssue[]
  ): string | undefined {
    const value = `${element.getAttribute('name') || ''} ${element.getAttribute('id') || ''}`.toUpperCase();
    if (value.includes('REJECT')) return 'END_REJECTED';
    if (value.includes('CANCEL')) return 'END_CANCELLED';
    if (value.includes('APPROV') || value.includes('SUCCESS')) return 'END_APPROVED';
    if (endCount === 1) {
      this.issue(
        diagnostics,
        'warning',
        'BPMN_END_STATE_DEFAULTED',
        `$.bpmnXml#${element.getAttribute('id') || 'endEvent'}`,
        'End event was interpreted as END_APPROVED because it has no visual mapping'
      );
      return 'END_APPROVED';
    }
    this.issue(
      diagnostics,
      'error',
      'BPMN_END_STATE_UNRESOLVED',
      `$.bpmnXml#${element.getAttribute('id') || 'endEvent'}`,
      'End event must be mapped or named as approved, rejected or cancelled'
    );
    return undefined;
  }

  private validateFlows(
    flows: ParsedBpmnFlow[],
    nodesById: { [id: string]: ParsedBpmnNode },
    diagnostics: BusinessProcessValidationIssue[]
  ): void {
    flows.forEach(flow => {
      if (!flow.sourceId || !nodesById[flow.sourceId]) {
        this.issue(
          diagnostics,
          'error',
          'BPMN_FLOW_SOURCE_UNKNOWN',
          `$.bpmnXml#${flow.id}.sourceRef`,
          `Sequence flow source does not exist: ${flow.sourceId || '(empty)'}`
        );
      }
      if (!flow.targetId || !nodesById[flow.targetId]) {
        this.issue(
          diagnostics,
          'error',
          'BPMN_FLOW_TARGET_UNKNOWN',
          `$.bpmnXml#${flow.id}.targetRef`,
          `Sequence flow target does not exist: ${flow.targetId || '(empty)'}`
        );
      }
      if (nodesById[flow.targetId]?.kind === 'start') {
        this.issue(
          diagnostics,
          'error',
          'BPMN_START_EVENT_INCOMING',
          `$.bpmnXml#${flow.id}`,
          'Start event cannot have incoming sequence flows'
        );
      }
      if (nodesById[flow.sourceId]?.kind === 'end') {
        this.issue(
          diagnostics,
          'error',
          'BPMN_END_EVENT_OUTGOING',
          `$.bpmnXml#${flow.id}`,
          'End event cannot have outgoing sequence flows'
        );
      }
    });
  }

  private resolvePaths(
    source: ParsedBpmnNode,
    outgoing: { [nodeId: string]: ParsedBpmnFlow[] },
    nodesById: { [id: string]: ParsedBpmnNode },
    diagnostics: BusinessProcessValidationIssue[],
    consumedFlowIds: Set<string>
  ): ResolvedFlowPath[] {
    const resolve = (
      node: ParsedBpmnNode,
      path: ParsedBpmnFlow[],
      visitedGateways: Set<string>
    ): ResolvedFlowPath[] => {
      const nextFlows = outgoing[node.id] || [];
      if (!nextFlows.length) {
        if (node.kind === 'gateway') {
          this.issue(
            diagnostics,
            'error',
            'BPMN_GATEWAY_DEAD_END',
            `$.bpmnXml#${node.id}`,
            `Exclusive gateway has no outgoing sequence flow: ${node.id}`
          );
        }
        return [];
      }

      return nextFlows.reduce((result, flow) => {
        consumedFlowIds.add(flow.id);
        const target = nodesById[flow.targetId];
        if (!target) return result;
        const nextPath = [...path, flow];
        if (target.kind !== 'gateway') {
          result.push({ target, flows: nextPath });
          return result;
        }
        if (visitedGateways.has(target.id)) {
          this.issue(
            diagnostics,
            'error',
            'BPMN_GATEWAY_CYCLE',
            `$.bpmnXml#${target.id}`,
            `Exclusive gateway cycle cannot be converted to a route: ${target.id}`
          );
          return result;
        }
        const nextVisited = new Set(visitedGateways);
        nextVisited.add(target.id);
        result.push(...resolve(target, nextPath, nextVisited));
        return result;
      }, [] as ResolvedFlowPath[]);
    };

    return resolve(source, [], new Set<string>());
  }

  private toStep(node: ParsedBpmnNode, existing?: BusinessProcessStep): BusinessProcessStep {
    const key = node.key || node.id;
    return {
      ...(existing || {} as BusinessProcessStep),
      key,
      title: node.element.getAttribute('name') || existing?.title || key,
      type: node.stepType || existing?.type || 'AUTO'
    };
  }

  private toTransition(
    source: ParsedBpmnNode,
    path: ResolvedFlowPath,
    representativeFlow: ParsedBpmnFlow,
    reverseEdgeMap: { [bpmnId: string]: string },
    existingTransitions: { [key: string]: BusinessProcessTransition },
    usedKeys: Set<string>,
    diagnostics: BusinessProcessValidationIssue[]
  ): BusinessProcessTransition {
    const mappedKeys = path.flows.map(flow => reverseEdgeMap[flow.id]).filter(key => !!key);
    const distinctMappedKeys = Array.from(new Set(mappedKeys));
    if (distinctMappedKeys.length > 1) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_PATH_MAPPING_AMBIGUOUS',
        `$.bpmnXml#${representativeFlow.id}`,
        `A gateway path references multiple transition mappings: ${distinctMappedKeys.join(', ')}`
      );
    }

    const mappedKey = distinctMappedKeys[0];
    const baseKey = mappedKey || 'Transition_' + this.safeKey(representativeFlow.id);
    const key = this.uniqueKey(baseKey, usedKeys);
    if (mappedKey && key !== mappedKey) {
      this.issue(
        diagnostics,
        'error',
        'BPMN_TRANSITION_MAPPING_DUPLICATE',
        `$.visualMapping.edgeMap.${mappedKey}`,
        `Transition mapping is used by multiple BPMN paths: ${mappedKey}`
      );
    }

    const existing = existingTransitions[mappedKey || key];
    const eventName = [...path.flows].reverse()
      .map(flow => String(flow.name || '').trim().toUpperCase())
      .find(name => !!name);
    let event = existing?.on || (eventName && this.transitionEvents.includes(eventName) ? eventName : 'AUTO');
    if (!this.transitionEvents.includes(event)) event = 'AUTO';
    if (!existing?.on && (!eventName || !this.transitionEvents.includes(eventName))) {
      this.issue(
        diagnostics,
        'warning',
        'BPMN_TRANSITION_EVENT_DEFAULTED',
        `$.bpmnXml#${representativeFlow.id}`,
        `Transition ${key} was interpreted as AUTO because its BPMN flow has no supported event name`
      );
    }

    return {
      ...(existing || {} as BusinessProcessTransition),
      key,
      from: source.key || source.id,
      on: event,
      to: path.target.kind === 'end'
        ? path.target.endState || ''
        : path.target.key || path.target.id
    };
  }

  private preview(
    steps: BusinessProcessStep[],
    transitions: BusinessProcessTransition[],
    startStepKey: string | undefined,
    visualMapping: BusinessProcessVisualMapping,
    diagnostics: BusinessProcessValidationIssue[],
    startEvents: number,
    endEvents: number,
    gateways: number,
    sequenceFlows = 0,
    routeHash?: string
  ): BusinessProcessBpmnRoutePreview {
    return {
      valid: !diagnostics.some(issue => issue.severity === 'error'),
      routeHash,
      route: { startStepKey, steps, transitions },
      visualMapping,
      statistics: {
        startEvents,
        endEvents,
        steps: steps.length,
        gateways,
        sequenceFlows
      },
      diagnostics
    };
  }

  private mapping(mapping?: BusinessProcessVisualMapping): BusinessProcessVisualMapping {
    return mapping || { schemaVersion: 2, notation: 'BPMN', nodeMap: {}, edgeMap: {}, endNodeMap: {} };
  }

  private reverseMapping(
    mapping: { [domainKey: string]: string } | undefined,
    diagnostics: BusinessProcessValidationIssue[],
    mappingName: string
  ): { [bpmnId: string]: string } {
    const result: { [bpmnId: string]: string } = {};
    Object.keys(mapping || {}).forEach(key => {
      const id = String(mapping?.[key] || '').trim();
      if (!id) return;
      if (result[id] && result[id] !== key) {
        this.issue(
          diagnostics,
          'error',
          'BPMN_MAPPING_ID_DUPLICATE',
          `$.visualMapping.${mappingName}.${key}`,
          `BPMN element ${id} is mapped to multiple domain keys`
        );
      } else {
        result[id] = key;
      }
    });
    return result;
  }

  private byKey<T extends { key: string }>(values: T[]): { [key: string]: T } {
    const result: { [key: string]: T } = {};
    values.forEach(value => {
      if (value?.key) result[value.key] = value;
    });
    return result;
  }

  private outgoingFlows(flows: ParsedBpmnFlow[]): { [nodeId: string]: ParsedBpmnFlow[] } {
    const result: { [nodeId: string]: ParsedBpmnFlow[] } = {};
    flows.forEach(flow => {
      if (!result[flow.sourceId]) result[flow.sourceId] = [];
      result[flow.sourceId].push(flow);
    });
    return result;
  }

  private flowUsage(paths: ResolvedFlowPath[]): { [flowId: string]: number } {
    const result: { [flowId: string]: number } = {};
    paths.forEach(path => path.flows.forEach(flow => {
      result[flow.id] = (result[flow.id] || 0) + 1;
    }));
    return result;
  }

  private representativeFlow(
    path: ResolvedFlowPath,
    usage: { [flowId: string]: number }
  ): ParsedBpmnFlow {
    return [...path.flows].reverse().find(flow => usage[flow.id] === 1)
      || path.flows[path.flows.length - 1];
  }

  private requiredId(
    element: Element,
    diagnostics: BusinessProcessValidationIssue[],
    path: string
  ): string | undefined {
    const id = String(element.getAttribute('id') || '').trim();
    if (!id) this.issue(diagnostics, 'error', 'BPMN_ID_REQUIRED', path, `BPMN ${element.localName} id is required`);
    return id || undefined;
  }

  private optionalAttribute(element: Element, name: string): string | undefined {
    const value = String(element.getAttribute(name) || '').trim();
    return value || undefined;
  }

  private childElements(parent: Element): Element[] {
    return Array.from(parent.childNodes)
      .filter((node): node is Element => node.nodeType === 1);
  }

  private uniqueKey(base: string, used: Set<string>): string {
    let key = base || 'Transition';
    let index = 2;
    while (used.has(key)) key = `${base}_${index++}`;
    used.add(key);
    return key;
  }

  private safeKey(value: string): string {
    return String(value || 'Flow').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private isRouteIssue(issue: BusinessProcessValidationIssue): boolean {
    return issue.path === '$.steps'
      || issue.path.indexOf('$.steps[') === 0
      || issue.path.indexOf('$.steps.') === 0
      || issue.path === '$.transitions'
      || issue.path.indexOf('$.transitions[') === 0
      || issue.path.indexOf('$.parameters.startStepKey') === 0;
  }

  private issue(
    diagnostics: BusinessProcessValidationIssue[],
    severity: BusinessProcessValidationIssue['severity'],
    code: string,
    path: string,
    message: string
  ): void {
    this.addIssue(diagnostics, { severity, code, path, message });
  }

  private addIssue(
    diagnostics: BusinessProcessValidationIssue[],
    issue: BusinessProcessValidationIssue
  ): void {
    const duplicate = diagnostics.some(current => current.severity === issue.severity
      && current.code === issue.code
      && current.path === issue.path
      && current.message === issue.message);
    if (!duplicate) diagnostics.push(issue);
  }

  private hasParserError(document: Document): boolean {
    return document.getElementsByTagName('parsererror').length > 0;
  }
}
