export const DEFAULT_BPMN_XML = '<?xml version="1.0" encoding="UTF-8"?>' +
  '<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ' +
  'xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" ' +
  'xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" ' +
  'xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" ' +
  'xmlns:di="http://www.omg.org/spec/DD/20100524/DI" ' +
  'id="Definitions_1" ' +
  'targetNamespace="http://bpmn.io/schema/bpmn">' +
  '<bpmn:process id="Process_1" isExecutable="false">' +
  '<bpmn:startEvent id="StartEvent_1" name="Start">' +
  '<bpmn:outgoing>Flow_1</bpmn:outgoing>' +
  '</bpmn:startEvent>' +
  '<bpmn:userTask id="UserTask_1" name="Approval">' +
  '<bpmn:incoming>Flow_1</bpmn:incoming>' +
  '<bpmn:outgoing>Flow_2</bpmn:outgoing>' +
  '</bpmn:userTask>' +
  '<bpmn:endEvent id="EndEvent_1" name="End">' +
  '<bpmn:incoming>Flow_2</bpmn:incoming>' +
  '</bpmn:endEvent>' +
  '<bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="UserTask_1" />' +
  '<bpmn:sequenceFlow id="Flow_2" sourceRef="UserTask_1" targetRef="EndEvent_1" />' +
  '</bpmn:process>' +
  '<bpmndi:BPMNDiagram id="BPMNDiagram_1">' +
  '<bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">' +
  '<bpmndi:BPMNShape id="StartEvent_1_di" bpmnElement="StartEvent_1">' +
  '<dc:Bounds x="160" y="120" width="36" height="36" />' +
  '</bpmndi:BPMNShape>' +
  '<bpmndi:BPMNShape id="UserTask_1_di" bpmnElement="UserTask_1">' +
  '<dc:Bounds x="260" y="98" width="100" height="80" />' +
  '</bpmndi:BPMNShape>' +
  '<bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">' +
  '<dc:Bounds x="430" y="120" width="36" height="36" />' +
  '</bpmndi:BPMNShape>' +
  '<bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">' +
  '<di:waypoint x="196" y="138" />' +
  '<di:waypoint x="260" y="138" />' +
  '</bpmndi:BPMNEdge>' +
  '<bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">' +
  '<di:waypoint x="360" y="138" />' +
  '<di:waypoint x="430" y="138" />' +
  '</bpmndi:BPMNEdge>' +
  '</bpmndi:BPMNPlane>' +
  '</bpmndi:BPMNDiagram>' +
  '</bpmn:definitions>';
