import { Injectable } from '@angular/core';
import {
  BusinessProcessStep,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { DEFAULT_BPMN_XML } from './default-bpmn-xml';
import { BusinessProcessRouteGraphService } from '../services/business-process-route-graph.service';

export interface BusinessProcessBpmnRepresentation {
  xml: string;
  visualMapping: BusinessProcessVisualMapping;
}

interface DiagramNode {
  key: string;
  id: string;
  name: string;
  tag: string;
  x: number;
  y: number;
  width: number;
  height: number;
  timer: boolean;
}

interface DiagramFlow {
  id: string;
  name?: string;
  sourceId: string;
  targetId: string;
  source: DiagramNode;
  target: DiagramNode;
}

@Injectable({ providedIn: 'root' })
export class BusinessProcessBpmnMapperService {
  private readonly bpmnNamespace = 'http://www.omg.org/spec/BPMN/20100524/MODEL';
  private readonly bpmnDiNamespace = 'http://www.omg.org/spec/BPMN/20100524/DI';
  private readonly dcNamespace = 'http://www.omg.org/spec/DD/20100524/DC';
  private readonly diNamespace = 'http://www.omg.org/spec/DD/20100524/DI';

  constructor(private readonly routeGraph: BusinessProcessRouteGraphService) {}

  toRepresentation(template: BusinessProcessTemplateDraft): BusinessProcessBpmnRepresentation {
    if (template.bpmnXml) {
      return {
        xml: template.bpmnXml,
        visualMapping: template.visualMapping || { notation: 'BPMN' }
      };
    }

    if (!template.steps || !template.steps.length) {
      return {
        xml: DEFAULT_BPMN_XML,
        visualMapping: {
          schemaVersion: 2,
          notation: 'BPMN',
          routeHash: this.routeGraph.routeHash(template),
          startEventId: 'StartEvent_1',
          nodeMap: {},
          edgeMap: {},
          endNodeMap: {}
        }
      };
    }

    return this.buildFromRoute(template);
  }

  synchronizeFromRoute(
    template: BusinessProcessTemplateDraft,
    currentXml = '',
    currentMapping?: BusinessProcessVisualMapping
  ): BusinessProcessBpmnRepresentation {
    const representation = this.buildFromRoute(this.routeGraph.normalize(template), currentMapping);
    return {
      ...representation,
      xml: this.preserveDiagramGeometry(currentXml, representation.xml)
    };
  }

  private buildFromRoute(
    template: BusinessProcessTemplateDraft,
    currentMapping?: BusinessProcessVisualMapping
  ): BusinessProcessBpmnRepresentation {
    const usedIds: { [id: string]: boolean } = {};
    const reservedIds = this.reservedMappingIds(currentMapping);
    const nodeMap: { [stepKey: string]: string } = {};
    const edgeMap: { [transitionKey: string]: string } = {};
    const endNodeMap: { [endState: string]: string } = {};
    const nodes: DiagramNode[] = [];

    const start: DiagramNode = {
      key: 'START',
      id: this.mappedId(currentMapping?.startEventId, 'StartEvent_1', usedIds, reservedIds),
      name: 'Start', tag: 'startEvent',
      x: 70, y: 172, width: 36, height: 36, timer: false
    };
    nodes.push(start);

    template.steps.forEach((step, index) => {
      const id = this.mappedId(
        currentMapping?.nodeMap?.[step.key],
        'Step_' + this.safeId(step.key),
        usedIds,
        reservedIds
      );
      const node = this.stepNode(step, id, 180 + index * 190, 150);
      nodes.push(node);
      nodeMap[step.key] = id;
    });

    const terminalKeys = this.terminalKeys(template.transitions);
    terminalKeys.forEach((key, index) => {
      const node: DiagramNode = {
        key,
        id: this.mappedId(
          currentMapping?.endNodeMap?.[key],
          'End_' + this.safeId(key),
          usedIds,
          reservedIds
        ),
        name: this.terminalName(key),
        tag: 'endEvent',
        x: 190 + template.steps.length * 190,
        y: 110 + index * 120,
        width: 36,
        height: 36,
        timer: false
      };
      nodes.push(node);
      endNodeMap[key] = node.id;
    });

    const nodeByKey: { [key: string]: DiagramNode } = {};
    nodes.forEach(node => nodeByKey[node.key] = node);

    const flows: DiagramFlow[] = [];
    const parameters = template.parameters || {};
    const startStepKey = parameters.startStepKey && nodeByKey[parameters.startStepKey]
      ? parameters.startStepKey
      : template.steps[0].key;
    flows.push(this.flow(
      this.uniqueId('Flow_Start', usedIds, reservedIds),
      undefined,
      start,
      nodeByKey[startStepKey]
    ));

    template.transitions.forEach((transition, index) => {
      const source = nodeByKey[transition.from];
      const target = nodeByKey[transition.to];
      if (!source || !target) return;
      const transitionKey = this.transitionKey(transition, index);
      const legacyKey = transition.from + ':' + transition.on + ':' + transition.to + ':' + index;
      const id = this.mappedId(
        currentMapping?.edgeMap?.[transitionKey] || currentMapping?.edgeMap?.[legacyKey],
        'Flow_' + (index + 1),
        usedIds,
        reservedIds
      );
      flows.push(this.flow(id, transition.on, source, target));
      edgeMap[transitionKey] = id;
    });

    return {
      xml: this.renderXml(template.code || 'Business process', nodes, flows),
      visualMapping: {
        schemaVersion: 2,
        notation: 'BPMN',
        routeHash: this.routeGraph.routeHash(template),
        startEventId: start.id,
        nodeMap,
        edgeMap,
        endNodeMap
      }
    };
  }

  private stepNode(step: BusinessProcessStep, id: string, x: number, y: number): DiagramNode {
    let tag = 'task';
    let timer = false;
    if (step.type === 'USER_TASK') tag = 'userTask';
    if (step.type === 'SYSTEM_TASK') tag = 'serviceTask';
    if (step.type === 'TIMER') {
      tag = 'intermediateCatchEvent';
      timer = true;
    }
    return {
      key: step.key,
      id,
      name: step.title || step.key,
      tag,
      x,
      y: timer ? y + 22 : y,
      width: timer ? 36 : 120,
      height: timer ? 36 : 80,
      timer
    };
  }

  private flow(id: string, name: string | undefined, source: DiagramNode, target: DiagramNode): DiagramFlow {
    return { id, name, sourceId: source.id, targetId: target.id, source, target };
  }

  private renderXml(name: string, nodes: DiagramNode[], flows: DiagramFlow[]): string {
    const processElements = nodes.map(node => this.renderNode(node)).join('')
      + flows.map(flow => '<bpmn:sequenceFlow id="' + flow.id + '"'
        + (flow.name ? ' name="' + this.escapeXml(flow.name) + '"' : '')
        + ' sourceRef="' + flow.sourceId + '" targetRef="' + flow.targetId + '" />').join('');
    const shapes = nodes.map(node => '<bpmndi:BPMNShape id="' + node.id + '_di" bpmnElement="' + node.id + '">'
      + '<dc:Bounds x="' + node.x + '" y="' + node.y + '" width="' + node.width + '" height="' + node.height + '" />'
      + '</bpmndi:BPMNShape>').join('');
    const edges = flows.map(flow => this.renderEdge(flow)).join('');

    return '<?xml version="1.0" encoding="UTF-8"?>'
      + '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" '
      + 'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" '
      + 'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" '
      + 'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" '
      + 'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" '
      + 'id="Definitions_1" targetNamespace="http://jetti.local/schema/bpmn">'
      + '<bpmn:process id="Process_1" name="' + this.escapeXml(name) + '" isExecutable="false">'
      + processElements
      + '</bpmn:process>'
      + '<bpmndi:BPMNDiagram id="BPMNDiagram_1"><bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">'
      + shapes + edges
      + '</bpmndi:BPMNPlane></bpmndi:BPMNDiagram>'
      + '</bpmn:definitions>';
  }

  private renderNode(node: DiagramNode): string {
    if (node.timer) {
      return '<bpmn:' + node.tag + ' id="' + node.id + '" name="' + this.escapeXml(node.name) + '">'
        + '<bpmn:timerEventDefinition />'
        + '</bpmn:' + node.tag + '>';
    }
    return '<bpmn:' + node.tag + ' id="' + node.id + '" name="' + this.escapeXml(node.name) + '" />';
  }

  private renderEdge(flow: DiagramFlow): string {
    const sourceX = flow.source.x + flow.source.width;
    const sourceY = flow.source.y + flow.source.height / 2;
    const targetX = flow.target.x;
    const targetY = flow.target.y + flow.target.height / 2;
    const middleX = Math.round((sourceX + targetX) / 2);
    return '<bpmndi:BPMNEdge id="' + flow.id + '_di" bpmnElement="' + flow.id + '">'
      + '<di:waypoint x="' + sourceX + '" y="' + sourceY + '" />'
      + '<di:waypoint x="' + middleX + '" y="' + sourceY + '" />'
      + '<di:waypoint x="' + middleX + '" y="' + targetY + '" />'
      + '<di:waypoint x="' + targetX + '" y="' + targetY + '" />'
      + '</bpmndi:BPMNEdge>';
  }

  private terminalKeys(transitions: BusinessProcessTransition[]): string[] {
    const result: string[] = [];
    transitions.forEach(transition => {
      if (transition.to.indexOf('END_') === 0 && result.indexOf(transition.to) === -1) result.push(transition.to);
    });
    return result;
  }

  private terminalName(key: string): string {
    return key.substring(4).toLowerCase().replace(/(^|_)([a-z])/g, (_match, _prefix, letter) => ' ' + letter.toUpperCase()).trim();
  }

  private transitionKey(transition: BusinessProcessTransition, index: number): string {
    return transition.key || transition.from + ':' + transition.on + ':' + transition.to + ':' + index;
  }

  private safeId(value: string): string {
    return String(value || 'Step').replace(/[^a-zA-Z0-9_-]/g, '_');
  }

  private uniqueId(
    base: string,
    used: { [id: string]: boolean },
    reserved: { [id: string]: boolean } = {}
  ): string {
    let id = base || 'Element';
    let index = 2;
    while (used[id] || reserved[id]) id = base + '_' + index++;
    used[id] = true;
    return id;
  }

  private mappedId(
    candidate: string | undefined,
    fallback: string,
    used: { [id: string]: boolean },
    reserved: { [id: string]: boolean }
  ): string {
    const value = String(candidate || '').trim();
    if (value && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(value) && !used[value]) {
      used[value] = true;
      return value;
    }
    return this.uniqueId(fallback, used, reserved);
  }

  private reservedMappingIds(mapping?: BusinessProcessVisualMapping): { [id: string]: boolean } {
    const result: { [id: string]: boolean } = {};
    const reserve = (value: unknown): void => {
      const id = typeof value === 'string' ? value.trim() : '';
      if (id && /^[A-Za-z_][A-Za-z0-9_.-]*$/.test(id)) result[id] = true;
    };

    reserve(mapping?.startEventId);
    Object.keys(mapping?.nodeMap || {}).forEach(key => reserve(mapping?.nodeMap?.[key]));
    Object.keys(mapping?.edgeMap || {}).forEach(key => reserve(mapping?.edgeMap?.[key]));
    Object.keys(mapping?.endNodeMap || {}).forEach(key => reserve(mapping?.endNodeMap?.[key]));
    return result;
  }

  private preserveDiagramGeometry(currentXml: string, generatedXml: string): string {
    if (!currentXml || typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
      return generatedXml;
    }

    try {
      const parser = new DOMParser();
      const currentDocument = parser.parseFromString(currentXml, 'application/xml');
      const generatedDocument = parser.parseFromString(generatedXml, 'application/xml');
      if (this.hasParserError(currentDocument) || this.hasParserError(generatedDocument)) return generatedXml;

      const currentElements = this.semanticElementsById(currentDocument);
      const generatedElements = this.semanticElementsById(generatedDocument);
      const currentShapes = this.diagramElementsByBpmnId(currentDocument, 'BPMNShape');
      const generatedShapes = this.diagramElementsByBpmnId(generatedDocument, 'BPMNShape');

      Object.keys(generatedShapes).forEach(id => {
        const currentShape = currentShapes[id];
        const generatedShape = generatedShapes[id];
        if (!currentShape || !generatedShape) return;

        const currentBounds = this.firstChild(currentShape, this.dcNamespace, 'Bounds');
        const generatedBounds = this.firstChild(generatedShape, this.dcNamespace, 'Bounds');
        if (!currentBounds || !generatedBounds) return;

        this.copyAttributes(currentBounds, generatedBounds, ['x', 'y']);
        if (currentElements[id]?.localName === generatedElements[id]?.localName) {
          this.copyAttributes(currentBounds, generatedBounds, ['width', 'height']);
        }
      });

      const currentEdges = this.diagramElementsByBpmnId(currentDocument, 'BPMNEdge');
      const generatedEdges = this.diagramElementsByBpmnId(generatedDocument, 'BPMNEdge');
      Object.keys(generatedEdges).forEach(id => {
        const currentFlow = currentElements[id];
        const generatedFlow = generatedElements[id];
        if (!currentFlow || !generatedFlow || currentFlow.localName !== 'sequenceFlow') return;
        if (currentFlow.getAttribute('sourceRef') !== generatedFlow.getAttribute('sourceRef')
          || currentFlow.getAttribute('targetRef') !== generatedFlow.getAttribute('targetRef')) return;

        const currentEdge = currentEdges[id];
        const generatedEdge = generatedEdges[id];
        if (!currentEdge || !generatedEdge) return;
        this.copyWaypoints(currentEdge, generatedEdge, generatedDocument);
      });

      return new XMLSerializer().serializeToString(generatedDocument);
    } catch {
      return generatedXml;
    }
  }

  private semanticElementsById(document: Document): { [id: string]: Element } {
    const result: { [id: string]: Element } = {};
    const elements = document.getElementsByTagNameNS(this.bpmnNamespace, '*');
    for (let index = 0; index < elements.length; index++) {
      const id = elements.item(index)?.getAttribute('id');
      if (id) result[id] = elements.item(index) as Element;
    }
    return result;
  }

  private diagramElementsByBpmnId(document: Document, localName: string): { [id: string]: Element } {
    const result: { [id: string]: Element } = {};
    const elements = document.getElementsByTagNameNS(this.bpmnDiNamespace, localName);
    for (let index = 0; index < elements.length; index++) {
      const element = elements.item(index);
      const id = element?.getAttribute('bpmnElement');
      if (id && element) result[id] = element;
    }
    return result;
  }

  private firstChild(parent: Element, namespace: string, localName: string): Element | undefined {
    const elements = parent.getElementsByTagNameNS(namespace, localName);
    return elements.length ? elements.item(0) as Element : undefined;
  }

  private copyAttributes(source: Element, target: Element, names: string[]): void {
    names.forEach(name => {
      const value = source.getAttribute(name);
      if (value !== null) target.setAttribute(name, value);
    });
  }

  private copyWaypoints(currentEdge: Element, generatedEdge: Element, document: Document): void {
    const currentWaypoints = currentEdge.getElementsByTagNameNS(this.diNamespace, 'waypoint');
    if (!currentWaypoints.length) return;

    Array.from(generatedEdge.getElementsByTagNameNS(this.diNamespace, 'waypoint'))
      .forEach(waypoint => generatedEdge.removeChild(waypoint));
    for (let index = 0; index < currentWaypoints.length; index++) {
      const currentWaypoint = currentWaypoints.item(index);
      if (!currentWaypoint) continue;
      const waypoint = document.createElementNS(this.diNamespace, 'di:waypoint');
      this.copyAttributes(currentWaypoint, waypoint, ['x', 'y']);
      generatedEdge.appendChild(waypoint);
    }
  }

  private hasParserError(document: Document): boolean {
    return document.getElementsByTagName('parsererror').length > 0;
  }

  private escapeXml(value: string): string {
    return String(value || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }
}
