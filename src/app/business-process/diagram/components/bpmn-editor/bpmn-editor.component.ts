import { CommonModule } from '@angular/common';
import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import BpmnModeler from 'bpmn-js/lib/Modeler';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { Subject, debounceTime } from 'rxjs';

import {
  BpmnElementSelection,
  BusinessProcessDiagramError,
  BusinessProcessDiagramImportResult
} from '../../models/business-process-diagram.models';

interface BpmnElementLike {
  id: string;
  type: string;
  businessObject?: { name?: string };
}

interface BpmnSelectionChangedEvent {
  newSelection?: BpmnElementLike[];
}

interface BpmnEventBus {
  on<T>(event: string, callback: (event: T) => void): void;
  off<T>(event: string, callback: (event: T) => void): void;
}

interface BpmnCanvas {
  zoom(): number;
  zoom(value: number | 'fit-viewport', center?: 'auto'): number;
}

interface BpmnCommandStack {
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): void;
  redo(): void;
}

interface BpmnKeyboard {
  bind(node: HTMLElement): void;
  unbind(): void;
}

interface BpmnSelection {
  select(elements: BpmnElementLike[] | null): void;
}

interface BpmnElementRegistry {
  get(id: string): BpmnElementLike | undefined;
}

interface BpmnModelerLike {
  importXML(xml: string): Promise<{ warnings?: unknown[] }>;
  saveXML(options: { format: boolean }): Promise<{ xml?: string }>;
  get<T>(service: string): T;
  destroy(): void;
}

type BpmnModelerConstructor = new (options: { container: HTMLElement }) => BpmnModelerLike;

@Component({
  selector: 'bp-bpmn-editor',
  standalone: true,
  imports: [CommonModule, ButtonModule, TooltipModule],
  templateUrl: './bpmn-editor.component.html',
  styleUrls: ['./bpmn-editor.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BpmnEditorComponent implements AfterViewInit, OnChanges {
  private readonly destroyRef = inject(DestroyRef);
  private readonly ngZone = inject(NgZone);
  private readonly changeDetector = inject(ChangeDetectorRef);
  private readonly exportRequests$ = new Subject<void>();

  @ViewChild('canvas', { static: true })
  private canvas!: ElementRef<HTMLElement>;

  @Input() xml = '';
  @Input() readonly = false;

  @Output() readonly xmlChange = new EventEmitter<string>();
  @Output() readonly diagramChanged = new EventEmitter<void>();
  @Output() readonly elementSelected = new EventEmitter<BpmnElementSelection | null>();
  @Output() readonly importCompleted = new EventEmitter<BusinessProcessDiagramImportResult>();
  @Output() readonly diagramError = new EventEmitter<BusinessProcessDiagramError>();

  loading = false;
  error = '';
  selectedElement: BpmnElementSelection | null = null;
  canUndo = false;
  canRedo = false;
  zoom = 1;

  private modeler?: BpmnModelerLike;
  private eventBus?: BpmnEventBus;
  private keyboard?: BpmnKeyboard;
  private lastExportedXml = '';
  private importQueue: Promise<void> = Promise.resolve();
  private importGeneration = 0;
  private pendingImports = 0;
  private diagramDirty = false;
  private destroyed = false;

  private readonly selectionChangedHandler = (event: BpmnSelectionChangedEvent) => {
    const selectedElement = event.newSelection?.[0];

    this.ngZone.run(() => {
      this.selectedElement = selectedElement ? {
        id: selectedElement.id,
        type: selectedElement.type,
        name: selectedElement.businessObject?.name
      } : null;
      this.elementSelected.emit(this.selectedElement);
      this.changeDetector.markForCheck();
    });
  };

  private readonly commandStackChangedHandler = () => {
    this.syncCommandStackState();
    if (!this.isImporting && !this.readonly && !this.destroyed) {
      this.diagramDirty = true;
      this.ngZone.run(() => this.diagramChanged.emit());
      this.exportRequests$.next();
    }
  };

  private readonly canvasViewboxChangedHandler = () => this.syncZoomState();

  private readonly canvasPointerDownHandler = () => {
    if (!this.readonly) this.canvas.nativeElement.focus({ preventScroll: true });
  };

  constructor() {
    this.exportRequests$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        if (!this.readonly && !this.isImporting) void this.emitCurrentXml();
      });

    this.destroyRef.onDestroy(() => this.destroyModeler());
  }

  ngAfterViewInit(): void {
    if (!this.initializeModeler()) return;
    if (this.xml) void this.importXml(this.xml);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const readonlyChange = changes['readonly'];
    if (readonlyChange && !readonlyChange.firstChange && this.modeler) {
      this.applyReadonlyMode();
    }

    const xmlChange = changes['xml'];
    if (!xmlChange || xmlChange.firstChange || !this.modeler) return;

    const nextXml = xmlChange.currentValue as string;
    if (nextXml && nextXml !== this.lastExportedXml) {
      void this.importXml(nextXml);
    }
  }

  importXml(xml: string): Promise<void> {
    if (!this.modeler) {
      this.emitError('IMPORT', 'BPMN modeler is not initialized');
      return Promise.resolve();
    }

    const generation = ++this.importGeneration;
    this.pendingImports += 1;
    this.setStatus(true, '');

    this.importQueue = this.importQueue.then(
      () => this.performImport(xml, generation),
      () => this.performImport(xml, generation)
    );
    return this.importQueue;
  }

  exportXml(): Promise<string> {
    if (!this.modeler) {
      return Promise.reject(new Error('BPMN modeler is not initialized'));
    }

    return this.modeler.saveXML({ format: true }).then(result => result.xml || '');
  }

  getXml(): Promise<string> {
    return this.exportXml();
  }

  hasDiagramChanges(): boolean {
    return this.diagramDirty;
  }

  markDiagramSaved(xml = this.lastExportedXml): void {
    this.lastExportedXml = xml;
    this.diagramDirty = false;
  }

  selectElementById(id?: string): boolean {
    const selection = this.modeler?.get<BpmnSelection>('selection');
    if (!selection) return false;
    if (!id) {
      selection.select(null);
      return true;
    }

    const element = this.modeler?.get<BpmnElementRegistry>('elementRegistry')?.get(id);
    if (!element) return false;
    selection.select([element]);
    return true;
  }

  saveXml(): void {
    void this.emitCurrentXml(true, true);
  }

  undo(): void {
    if (this.readonly || this.loading || !this.canUndo) return;
    const commandStack = this.modeler?.get<BpmnCommandStack>('commandStack');
    this.ngZone.runOutsideAngular(() => commandStack?.undo());
  }

  redo(): void {
    if (this.readonly || this.loading || !this.canRedo) return;
    const commandStack = this.modeler?.get<BpmnCommandStack>('commandStack');
    this.ngZone.runOutsideAngular(() => commandStack?.redo());
  }

  zoomIn(): void {
    this.changeZoom(0.1);
  }

  zoomOut(): void {
    this.changeZoom(-0.1);
  }

  fitViewport(): void {
    const canvas = this.modeler?.get<BpmnCanvas>('canvas');
    if (!canvas) return;

    const zoom = this.ngZone.runOutsideAngular(() => canvas.zoom('fit-viewport', 'auto'));
    this.setZoom(zoom);
  }

  private initializeModeler(): boolean {
    try {
      const Modeler = BpmnModeler as unknown as BpmnModelerConstructor;
      this.ngZone.runOutsideAngular(() => {
        this.modeler = new Modeler({ container: this.canvas.nativeElement });
        this.eventBus = this.modeler.get<BpmnEventBus>('eventBus');
        this.keyboard = this.modeler.get<BpmnKeyboard>('keyboard');
        this.eventBus.on('selection.changed', this.selectionChangedHandler);
        this.eventBus.on('commandStack.changed', this.commandStackChangedHandler);
        this.eventBus.on('canvas.viewbox.changed', this.canvasViewboxChangedHandler);
        this.canvas.nativeElement.addEventListener('pointerdown', this.canvasPointerDownHandler);
      });
      this.applyReadonlyMode();
      this.syncCommandStackState();
      return true;
    } catch (error) {
      this.emitError('INITIALIZE', 'Failed to initialize BPMN modeler', error);
      return false;
    }
  }

  private async performImport(xml: string, generation: number): Promise<void> {
    if (!this.modeler || this.destroyed) return;

    try {
      const result = await this.modeler.importXML(xml);
      if (this.destroyed || generation !== this.importGeneration) return;

      this.lastExportedXml = xml;
      this.diagramDirty = false;
      this.clearSelection();
      this.fitViewport();
      this.syncCommandStackState();
      this.ngZone.run(() => {
        this.importCompleted.emit({ warnings: result.warnings || [] });
      });
    } catch (error) {
      if (generation === this.importGeneration) {
        this.emitError('IMPORT', 'Failed to import BPMN XML', error);
      }
    } finally {
      this.pendingImports = Math.max(0, this.pendingImports - 1);
      if (!this.destroyed && !this.isImporting) {
        this.syncCommandStackState();
        this.setStatus(false, this.error);
      }
    }
  }

  private async emitCurrentXml(force = false, showLoading = false): Promise<void> {
    if (!force && (this.readonly || this.isImporting)) return;

    const generation = this.importGeneration;
    if (showLoading) this.setStatus(true, '');

    try {
      const xml = await this.exportXml();
      if (!force && (this.readonly || this.isImporting || generation !== this.importGeneration)) return;
      if (!force && xml === this.lastExportedXml) return;

      this.lastExportedXml = xml;
      this.ngZone.run(() => this.xmlChange.emit(xml));
    } catch (error) {
      this.emitError('EXPORT', 'Failed to export BPMN XML', error);
    } finally {
      if (showLoading && !this.destroyed) this.setStatus(false, this.error);
    }
  }

  private destroyModeler(): void {
    this.destroyed = true;

    try {
      if (this.eventBus) {
        this.eventBus.off('selection.changed', this.selectionChangedHandler);
        this.eventBus.off('commandStack.changed', this.commandStackChangedHandler);
        this.eventBus.off('canvas.viewbox.changed', this.canvasViewboxChangedHandler);
      }
      this.canvas?.nativeElement.removeEventListener('pointerdown', this.canvasPointerDownHandler);
      this.keyboard?.unbind();
      this.modeler?.destroy();
    } catch (error) {
      this.emitError('DESTROY', 'Failed to destroy BPMN modeler', error);
    } finally {
      this.eventBus = undefined;
      this.keyboard = undefined;
      this.modeler = undefined;
    }
  }

  private get isImporting(): boolean {
    return this.pendingImports > 0;
  }

  private applyReadonlyMode(): void {
    if (!this.keyboard) return;

    this.ngZone.runOutsideAngular(() => {
      this.keyboard?.unbind();
      if (!this.readonly) this.keyboard?.bind(this.canvas.nativeElement);
    });

    if (this.readonly) this.clearSelection();
    this.syncCommandStackState();
  }

  private clearSelection(): void {
    this.modeler?.get<BpmnSelection>('selection')?.select(null);
  }

  private syncCommandStackState(): void {
    const commandStack = this.modeler?.get<BpmnCommandStack>('commandStack');
    const canUndo = !this.readonly && !!commandStack?.canUndo();
    const canRedo = !this.readonly && !!commandStack?.canRedo();

    this.ngZone.run(() => {
      this.canUndo = canUndo;
      this.canRedo = canRedo;
      this.changeDetector.markForCheck();
    });
  }

  private changeZoom(delta: number): void {
    if (this.loading) return;
    const canvas = this.modeler?.get<BpmnCanvas>('canvas');
    if (!canvas) return;

    const currentZoom = Number(canvas.zoom()) || 1;
    const nextZoom = Math.round(Math.max(0.2, Math.min(4, currentZoom + delta)) * 10) / 10;
    const zoom = this.ngZone.runOutsideAngular(() => canvas.zoom(nextZoom, 'auto'));
    this.setZoom(zoom);
  }

  private setZoom(zoom: number): void {
    const normalizedZoom = Number(zoom) || 1;
    if (Math.abs(this.zoom - normalizedZoom) < 0.001) return;

    this.ngZone.run(() => {
      this.zoom = normalizedZoom;
      this.changeDetector.markForCheck();
    });
  }

  private syncZoomState(): void {
    const zoom = this.modeler?.get<BpmnCanvas>('canvas')?.zoom();
    if (zoom) this.setZoom(zoom);
  }

  private setStatus(loading: boolean, error: string): void {
    this.ngZone.run(() => {
      this.loading = loading;
      this.error = error;
      this.changeDetector.markForCheck();
    });
  }

  private emitError(
    operation: BusinessProcessDiagramError['operation'],
    message: string,
    cause?: unknown
  ): void {
    this.ngZone.run(() => {
      this.error = message;
      this.diagramError.emit({ operation, message, cause });
      this.changeDetector.markForCheck();
    });
  }
}
