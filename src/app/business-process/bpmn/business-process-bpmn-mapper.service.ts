import { Injectable } from '@angular/core';
import {
  BusinessProcessStep,
  BusinessProcessTemplateDraft,
  BusinessProcessTransition,
  BusinessProcessVisualMapping
} from '../models/business-process-template.models';
import { DEFAULT_BPMN_XML } from './default-bpmn-xml';

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
        visualMapping: { notation: 'BPMN', nodeMap: {}, edgeMap: {} }
      };
    }

    return this.buildFromRoute(template);
  }

  private buildFromRoute(template: BusinessProcessTemplateDraft): BusinessProcessBpmnRepresentation {
    const usedIds: { [id: string]: boolean } = {};
    const nodeMap: { [stepKey: string]: string } = {};
    const edgeMap: { [transitionKey: string]: string } = {};
    const nodes: DiagramNode[] = [];

    const start: DiagramNode = {
      key: 'START', id: 'StartEvent_1', name: 'Start', tag: 'startEvent',
      x: 70, y: 172, width: 36, height: 36, timer: false
    };
    usedIds[start.id] = true;
    nodes.push(start);

    template.steps.forEach((step, index) => {
      const id = this.uniqueId('Step_' + this.safeId(step.key), usedIds);
      const node = this.stepNode(step, id, 180 + index * 190, 150);
      nodes.push(node);
      nodeMap[step.key] = id;
    });

    const terminalKeys = this.terminalKeys(template.transitions);
    terminalKeys.forEach((key, index) => {
      nodes.push({
        key,
        id: this.uniqueId('End_' + this.safeId(key), usedIds),
        name: this.terminalName(key),
        tag: 'endEvent',
        x: 190 + template.steps.length * 190,
        y: 110 + index * 120,
        width: 36,
        height: 36,
        timer: false
      });
    });

    const nodeByKey: { [key: string]: DiagramNode } = {};
    nodes.forEach(node => nodeByKey[node.key] = node);

    const flows: DiagramFlow[] = [];
    const parameters = template.parameters || {};
    const startStepKey = parameters.startStepKey && nodeByKey[parameters.startStepKey]
      ? parameters.startStepKey
      : template.steps[0].key;
    flows.push(this.flow('Flow_Start', undefined, start, nodeByKey[startStepKey]));

    template.transitions.forEach((transition, index) => {
      const source = nodeByKey[transition.from];
      const target = nodeByKey[transition.to];
      if (!source || !target) return;
      const id = this.uniqueId('Flow_' + (index + 1), usedIds);
      flows.push(this.flow(id, transition.on, source, target));
      edgeMap[this.transitionKey(transition, index)] = id;
    });

    return {
      xml: this.renderXml(template.code || 'Business process', nodes, flows),
      visualMapping: { notation: 'BPMN', nodeMap, edgeMap }
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
    return transition.from + ':' + transition.on + ':' + transition.to + ':' + index;
  }

  private safeId(value: string): string {
    return String(value || 'Step').replace(/[^a-zA-Z0-9_\-]/g, '_');
  }

  private uniqueId(base: string, used: { [id: string]: boolean }): string {
    let id = base || 'Element';
    let index = 2;
    while (used[id]) id = base + '_' + index++;
    used[id] = true;
    return id;
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
