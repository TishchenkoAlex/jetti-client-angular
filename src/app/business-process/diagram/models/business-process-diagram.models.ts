export interface BpmnElementSelection {
  id: string;
  type: string;
  name?: string;
}

export interface BusinessProcessDiagramValue {
  notation: 'BPMN';
  bpmnXml: string;
  selectedElementId?: string;
}

export interface BusinessProcessDiagramExport {
  bpmnXml: string;
}

export interface BusinessProcessDiagramImportResult {
  warnings: unknown[];
}

export interface BusinessProcessDiagramError {
  operation: 'INITIALIZE' | 'IMPORT' | 'EXPORT' | 'DESTROY';
  message: string;
  cause?: unknown;
}
