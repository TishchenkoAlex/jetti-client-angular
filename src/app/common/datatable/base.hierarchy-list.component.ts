import { AuthService } from 'src/app/auth/auth.service';
import { ChangeDetectionStrategy, Component, Input, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import { merge, Observable, Subject, Subscription, of, BehaviorSubject, combineLatest, fromEvent } from 'rxjs';
import { debounceTime, filter, map, take } from 'rxjs/operators';
import { v1, v4 } from 'uuid';
import { calendarLocale, dateFormat } from '../../primeNG.module';
import { addMonths, copyToClipboard, numberToMoneyString, scrollIntoViewIfNeeded } from '../utils';
import { UserSettingsService } from './../../auth/settings/user.settings.service';
import { ApiDataSource } from './../../common/datatable/api.datasource.v2';
import { DocService } from './../../common/doc.service';
import { LoadingService } from './../../common/loading.service';
import { DynamicFormService } from '../dynamic-form/dynamic-form.service';
import { MenuItem, SortMeta, TreeNode } from 'primeng/api';
import { DialogService } from 'primeng/dynamicdialog';
import { TreeTable } from 'primeng/treetable';
import {
  buildColumnDef, ColumnDef, DocumentBase, DocumentOptions, FormListFilter,
  FormListOrder, FormListSettings, IViewModel, matchOperator, Type, matchOperatorByType,
  IUserSettings, FormListColumnProps, IUserSettingsState,
} from 'jetti-middle';
import { settingsKind } from 'jetti-middle/dist/common/classes/user-settings';
import { Table } from 'primeng/table';
// tslint:disable: deprecation
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-hierarchy-list',
  templateUrl: 'base.hierarchy-list.component.html',
})
export class BaseHierarchyListComponent implements OnInit, OnDestroy {
  @Input() pageSize;
  @Input() isRelationList = false;
  @Input() type: string;
  @Input() settings: FormListSettings = new FormListSettings();
  @Input() data: IViewModel;

  locale = calendarLocale; dateFormat = dateFormat;

  constructor(public route: ActivatedRoute, public router: Router, public ds: DocService,
    public uss: UserSettingsService, public lds: LoadingService, public dss: DynamicFormService,
    private auth: AuthService, public dialog: DialogService) { }

  private _pageSizeSubscription$: Subscription = Subscription.EMPTY;
  private _pageSize$ = new Subject<number>();
  private _docSubscription$: Subscription = Subscription.EMPTY;
  private _routeSubscription$: Subscription = Subscription.EMPTY;
  private _debonceSubscription$: Subscription = Subscription.EMPTY;
  private _debonce$ = new Subject<FormListFilter>();
  private _resizeSubscription$: Subscription = Subscription.EMPTY;
  private _columnSettingsProps = ['width', 'visibility'];
  private _filterSettingsState$: BehaviorSubject<IUserSettingsState> = new BehaviorSubject<IUserSettingsState>({ selected: { description: 'Default' } as any });
  private _filterSettingsStateSubscription$: Subscription = Subscription.EMPTY;
  private _columnsSettingsState$: BehaviorSubject<IUserSettingsState> = new BehaviorSubject<IUserSettingsState>({ selected: { description: 'Default' } as any });
  private _columnsSettingsStateSubscription$: Subscription = Subscription.EMPTY;

  private _isInitComplete$: BehaviorSubject<boolean> = new BehaviorSubject(this.isRelationList);

  isInitComplete$ = this._isInitComplete$.asObservable();

  pageSize$: Observable<number>;


  @ViewChild('tbl', { static: false }) tbl: Table;
  @ViewChild('treeTable', { static: false }) treeTable: TreeTable;

  get columnsSettingsState() { return this._columnsSettingsState$.value; }
  get filterSettingsState() { return this._filterSettingsState$.value; }
  get isDoc() { return Type.isDocument(this.type); }
  get isCatalog() { return Type.isCatalog(this.type); }
  get id() { return this.selectedData ? this.selectedData.id : null; }
  set id(id: string) { this.selection = [{ id, type: this.type }]; this.selectedNode = { data: { id: id }, key: id, type: this.type }; }
  get visibleColumns() { return this.columns.filter(column => !column.hidden); }
  get activeFilters() { return this.columns.filter(column => column.filter && column.filter.isActive).map(col => col.filter); }
  get filteredColumns() { return this.columns.filter(column => column.filter && column.filter.isActive); }
  get allFilters() {
    return this.columns
      .filter(column => column.filter)
      .map(col => col.filter);
  }
  get selectedData() {
    return this.treeNodesVisible ?
      (this.selectedNode ? this.selectedNode.data : null) :
      (this.selection && this.selection.length ? this.selection[0] : null);
  }

  get useSelectedTotal() {
    return (this.selection || []).length &&
      !!(this.columns || []).find(e => e.field === 'Amount') &&
      !!(this.columns || []).find(e => e.field === 'currency' || e.field === 'сurrency');
  }

  get selectedTotal() {
    const data = this.dataSource.renderedDataList;
    if (!(data || []).length) return numberToMoneyString(0);

    const currencyColumn = this.columns.find(e => e.field === 'currency') ? 'currency' : 'сurrency';

    const selected = (this.selection || [])
      .map(e => {
        const r = data.find(l => l.id === e.id);
        return r && r[currencyColumn] ? ({ currency: r[currencyColumn].id, amount: r.Amount }) : undefined;
      })
      .filter(r => !!r);

    if (!selected.length) return numberToMoneyString(0);
    const currency = selected[0].currency;
    if (selected.some(e => e.currency !== currency))
      return 'multicurrency selection';
    const sum = selected.reduce((a, b) => a + b.amount, 0);

    return numberToMoneyString(sum || 0);
  }

  get isDeletedHidden() { return !!this.activeFilters.find(e => e.left === 'deleted'); }

  set isDeletedHidden(value: boolean) {
    this.addMenuItems.find(e => e.id === 'ShowDeleted').label = `${value ? 'Show' : 'Hide'} deleted`;
    this.update(this.getColumn('deleted'), false, '=', 'start', value);
  }

  get dataViewTypeChangeCommands() {
    return [
      { label: 'Tree', command: () => { this._presentation = 'Tree'; this.onChangePresentation(); } },
      { label: 'List', command: () => { this._presentation = 'List'; this.onChangePresentation(); } },
      { label: 'Auto', command: () => { this._presentation = 'Auto'; this.onChangePresentation(); } }
    ];
  }

  set presentation(mode: 'List' | 'Tree' | '') {
    if (mode && !'List,Tree,Auto'.includes(mode)) return;
    this._presentation = mode || 'Auto';
    this.onChangePresentation();
  }

  postedCol: ColumnDef = ({
    field: 'posted', filter: { left: 'posted', center: '=', right: null }, type: 'boolean', label: 'posted',
    style: { width: '30px' }, order: 0, readOnly: false, required: false, hidden: false, value: undefined, headerStyle: {}
  });

  private _windowHeight: number;
  private _expandedNodeId: string;

  group = '';
  columns: ColumnDef[] = [];
  selection: any[] = [];
  contextMenuSelection = [];
  ctxData = { column: '', value: undefined };
  contexCommands: { list: MenuItem[], tree: MenuItem[] } = { list: [], tree: [] };
  filters: { [s: string]: FormListFilter } = {};
  multiSortMeta: SortMeta[] = [];
  dataSource: ApiDataSource;
  private _userEmail = this.auth.userEmail;
  sidebarDisplay = false;

  treeNodes$: Observable<TreeNode[]>;
  treeNodes: TreeNode[] = [];
  hierarchy = false;
  treeNodesVisible = false;
  initNodes = true;
  selectedNode: TreeNode = null;
  presentationTypes = [
    { label: 'Tree', value: 'Tree' },
    { label: 'List', value: 'List' },
    { label: 'Auto', value: 'Auto' }
  ];
  _presentation = 'Auto';
  readonly = this.auth.isRoleAvailableReadonly();
  addMenuItems: MenuItem[];
  showActiveFilters = false;
  usSettingsEditMode = false;

  async ngOnInit() {

    this.readRouteParams(this.route);

    if (!this.settings) this.settings = this.data.settings;
    if (!this.data && this.type) {
      if (this.isRelationList) this._initDataSource();
      const DocMeta = await this.ds.api.getDocMetaByType(this.type);
      this.data = { schema: DocMeta.Props, metadata: DocMeta.Prop as DocumentOptions, columnsDef: [], model: {}, settings: this.settings };
    }

    // default filters is always active
    this.settings.filter.forEach(e => e.isActive = true);

    this._initColumns();
    this._initDataSource();
    this.addMenuItemsFill();
    this.setSortOrder();
    this.prepareDataSource();
    this.setContextMenu();

    this._filterSettingsStateSubscription$ = this._filterSettingsState$
      .pipe(filter(e => e.apply && !this.isRelationList)).subscribe(e => this.onFilterSettingsStateChanged(e));
    this._columnsSettingsStateSubscription$ = this._columnsSettingsState$

      .pipe(filter(e => e.apply && !this.isRelationList)).subscribe(e => this.onColumnsSettingsStateChanged(e));

    this._docSubscription$ = merge(...[
      this.ds.save$, this.ds.delete$, this.ds.saveClose$, this.ds.goto$, this.ds.post$, this.ds.unpost$]).pipe(
        filter(doc => doc
          && doc.type === this.type
          && !!(!this.group || !doc['Group'] || this.group === doc['Group']['id'])))
      .subscribe(doc => this.docSubscriptionHandler(doc));

    this.treeNodes$ = this.dataSource.result$
      .pipe(filter(_ => this.treeNodesVisible))
      .pipe(map(rows => {
        const selectedNodeId = this.selectedNode ? this.selectedNode.key : this.dataSource.id;
        this.selectedNode = null;
        this.treeNodes = this.buildTreeNodes(rows, null);
        this.findSelectedNode(this.treeNodes, selectedNodeId);
        return this.treeNodes;
      }));

    // обработка команды найти в списке
    this._routeSubscription$ = this.route.params.pipe(
      filter(params => params.type === this.type && params.group === this.group && this.route.snapshot.queryParams.goto))
      .subscribe(params => this.routeSubscruptionHandler());

    this._resizeSubscription$ = fromEvent(window, 'resize')
      .pipe(filter(_ => window.outerHeight !== this._windowHeight))
      .subscribe(_ => {
        this._saveWindowHeigh();
        this._pageSize$.next(this.getPageSize());
      });

    this._pageSizeSubscription$ = combineLatest([this._pageSize$.pipe(debounceTime(50)), this.isInitComplete$])
      .pipe(filter(latest => !!latest[1] || this.isRelationList))
      .subscribe(latest => this.pageSizeSubscriptionHandler(latest[0]));

    this._debonceSubscription$ = this._debonce$.pipe(debounceTime(1000))
      .subscribe(event => this._update(event));
    this.usLoad();
    this._saveWindowHeigh();
    if (this.isRelationList) this.last();
  }

  private _saveWindowHeigh() {
    this._windowHeight = window.outerHeight;
  }

  private readRouteParams(route: ActivatedRoute) {
    if (!this.type) this.type = route.snapshot.params.type;
    if (!this.group) this.group = route.snapshot.params.group;
    if (route.snapshot.queryParams.goto) {
      this.initNodes = true;
      this.id = route.snapshot.queryParams.goto;
    }
  }

  private _initColumns() {
    if (this.data.metadata['Group'])
      this.settings.filter.push({ left: 'Group', center: '=', right: this.data.metadata['Group'], isActive: true });
    if (!this.isRelationList) this.settings.filter.push({ left: 'deleted', isActive: true, center: '=', right: false });
    this.columns = buildColumnDef(this.data.schema, this.settings);
    this.hierarchy = this.data.metadata.hierarchy === 'folders';
    this.treeNodesVisible = this.hierarchy && !this._filtersWithoutDeleted(this.settings.filter).length;
    if (this.hierarchy) {
      const descriptionColumn = this.columns.find(c => c.field === 'description');
      if (descriptionColumn)
        this.columns = [descriptionColumn, ...this.columns.filter(c => c.field !== 'description')];
    }
    this._resetColumnsFilters();
  }

  private _resetColumnsFilters() {
    this.columns.forEach(col => {
      const colFilter = this.settings.filter.find(e => e.left === col.field);
      if (colFilter) {
        col.filter = colFilter;
        col.filter['anyTemp'] = { label: colFilter.center, value: colFilter.center };
      } else {
        const operators = this.usGetMatchOperatorsByType(col.type);
        col.filter = new FormListFilter(col.field, operators[0].value);
        col.filter['anyTemp'] = operators[0];
      }
      col['matchOperators'] = this.usGetMatchOperatorsByType(col.type);
      if (col.type === 'number')
        col.filter.interval = colFilter && colFilter.center === 'beetwen' ? { ...colFilter.right } : { start: null, end: null };
    });
  }

  private _initDataSource() {
    this.dataSource = new ApiDataSource(this.ds.api, this.type, this.pageSize, true);
    this.dataSource.id = this.id;
    this.dataSource.listOptions.withHierarchy = this.treeNodesVisible;
  }

  private pageSizeSubscriptionHandler(pageSize: number) {
    this.dataSource.pageSize = pageSize;
    this.pageSize$ = of(pageSize);
    if (this.id) this.goto(this.id);
    else this.last();
  }

  private routeSubscruptionHandler() {
    const id = this.route.snapshot.queryParams.goto;
    this.initNodes = true;
    this.refresh(id);
    const route: any[] = [this.type];
    if (this.group) route.push('group', this.group);
    setTimeout(() => this.router.navigate(route, { replaceUrl: true }));
  }


  private docSubscriptionHandler(doc: DocumentBase) {
    this.id = doc.id;
    const exist = (this.dataSource.renderedDataList).find(d => d.id === doc.id);
    if (exist) {
      const visibleFields = [...this.visibleColumns.map(e => e.field), 'posted', 'deleted'];
      const complexFields = this.visibleColumns
        .filter(col => Type.isRefType(col.type as any))
        .map(e => e.field);
      for (const key of visibleFields) {
        const isComplex = complexFields.includes(key);
        if ((isComplex && exist[key].id !== doc[key].id) ||
          (!isComplex && exist[key] !== doc[key] && JSON.stringify(exist[key]) !== JSON.stringify(doc[key]))) {
          this.dataSource.refresh(exist.id);
          break;
        }
      }
    } else if (this.treeNodesVisible) {
      this.selectedNode = null;
      this.loadNodes(doc.id);
    } else this.dataSource.goto(doc.id);
  }

  private getPageSize() {
    return Math.max(Math.round((window.innerHeight - 270) / 28 - 1), 1);
  }

  private findSelectedNode(tree: TreeNode[], id: string | null) {
    if (this.selectedNode || !id) return;
    const filteredById = tree.filter(el => el.key === id);
    if (filteredById.length) this.selectedNode = filteredById[0];
    else tree.filter(el => el.children.length).forEach(node => this.findSelectedNode(node.children, id));
  }

  private setSortOrder() {
    this.multiSortMeta = this.settings.order
      .filter(e => !!e.order)
      .map(e => <SortMeta>{ field: e.field, order: e.order === 'asc' ? 1 : -1 });
    if (this.multiSortMeta.length === 0) {
      if (this.isCatalog)
        this.multiSortMeta.push({ field: 'description', order: 1 });
      if (this.isDoc)
        this.multiSortMeta.push({ field: 'date', order: 1 });
      this.settings.order = this.multiSortMeta.map(e => ({ field: e.field, order: e.order === 1 ? 'asc' : 'desc' }));
    }
  }

  addFilterToSettings(_filter: FormListFilter, settingsId: string) {
    const state = this._usStateByKind('filter');
    const settings = state.settings.find(e => e.id === settingsId);
    if (!settings) return;
    settings.settings.filter = [...(settings.settings.filter || []).filter(e => e.left !== _filter.left), _filter];
    this._usNextState({ ...state, apply: state.selected.id === settingsId }, 'filter');
  }

  setColumnFilterIsActive(column: ColumnDef, isActive: boolean) {
    if (!column.filter) return;
    column.filter.isActive = isActive;
    this._filterSettingsState$.next({ ...this._filterSettingsState$.value, isModify: true, apply: false });
    this._debonce$.next(column.filter);
  }

  _onColumnMatchOperatorChanged(column: ColumnDef) {
    const oldFilter = column.filter;
    const newFilter = { ...oldFilter, center: oldFilter['anyTemp'].value };
    if (['in', 'not in'].includes(newFilter.center) && !['in', 'not in'].includes(oldFilter.center))
      newFilter.right = newFilter.right ? [newFilter.right] : [];
    else if (['in', 'not in'].includes(oldFilter.center) && !['in', 'not in'].includes(newFilter.center))
      newFilter.right = Array.isArray(newFilter.right) ? newFilter.right[0] : newFilter.right;
    else if (column.type === 'number') {
      if (oldFilter.center === 'beetwen' && newFilter.center !== 'beetwen')
        newFilter.right = oldFilter.interval ? oldFilter.interval.start : null;
      else if (oldFilter.center !== 'beetwen' && newFilter.center === 'beetwen')
        newFilter.interval = { start: oldFilter.right, end: null };
    } else if (['date', 'datetime'].includes(column.type)) {
      if (oldFilter.center === 'beetwen' && newFilter.center !== 'beetwen')
        newFilter.right = Array.isArray(oldFilter.right) ? oldFilter.right[0] : null;
      else if (oldFilter.center !== 'beetwen' && newFilter.center === 'beetwen')
        newFilter.right = oldFilter.right instanceof Date ? [oldFilter.right] : [];
    }
    column.filter = newFilter;

    if (newFilter.isActive) this.update(column, newFilter.right, newFilter.center, '', newFilter.isActive);
    else
      this._filterSettingsState$.next({ ...this._filterSettingsState$.value, isModify: true, apply: false });
  }

  private _update(_filter: FormListFilter) {
    if (!_filter.left) return;
    this.setColumnFilter(_filter);
    this.settings.filter = [_filter, ...this.settings.filter.filter(e => e.left !== _filter.left)];
    this.prepareDataSource(this.multiSortMeta);
    this._pageSize$.next(this.getPageSize());
  }

  private async _onOperationSwitched(operationType: string, right) {
    this.settings.filter = [
      ...this.settings.filter.filter(e => e.isActive && e.left !== 'Operation' && e.left !== 'Group'),
      { left: 'Operation', center: '=', right: right, isActive: !!(right && right.id) }];
    this.type = operationType;
    this.dataSource.type = operationType;
    this.data = undefined;
    await this.ngOnInit();
  }

  async update(column: ColumnDef, right: any, center: matchOperator = 'like', startEnd = 'start' || 'end', isActive?: boolean) {

    // if ((!right && right !== false) ||
    //   (typeof right === 'object' && typeof right !== 'boolean' && !right.value && !(Array.isArray(right)))) {
    //   this.id = null;
    //   right = null;
    // }

    if (!column) return;

    if (center === '=' &&
      column.filter.left === 'Operation' &&
      (Type.isOperation(this.type) || this.type === 'Document.Operation')) {
      let type = 'Document.Operation';
      if (right && right.id) type = await this.ds.api.getIndexedOperationType(right.id);
      if (this.type !== type) {
        await this._onOperationSwitched(type, right);
        return;
      }
    }

    if (column.type === 'enum') {
      if (center === '=') {
        center = 'in';
        right = [{ label: right, value: right }];
      } else if (center === 'is null') {
        right = [{ label: '', value: '' }];
      }
    }

    const oldF = column.filter;
    const newF = {
      ...column.filter, center, right,
      anyTemp: { label: center, value: center },
      isActive: isActive === undefined ? oldF.isActive : isActive
    };

    if (column.type === 'number') {
      if (center === 'beetwen') {
        newF.interval[startEnd] = newF.right;
        const { start, end } = newF.interval;
        if (start === null || end === null) return;
        const intervalFloat = {
          start: parseFloat(start.toString()),
          end: parseFloat(end.toString())
        };
        if (isNaN(intervalFloat.start) || isNaN(intervalFloat.end)) return;
        if (intervalFloat.start > intervalFloat.end) return;
        newF.right = { ...intervalFloat };
        newF.isActive = true;
      } else if (isNaN(parseFloat((newF.right || '').toString())))
        newF.right = null;
      newF.isActive = !!newF.right || newF.right === 0;
    } else if (column.type === 'boolean') {
      newF.isActive = isActive === undefined ? newF.right !== null : isActive;
    } else if (column.type.includes('.') && !['in', 'not in'].includes(center)) {
      if (['is not null', 'is null'].includes(center))
        newF.right = null;
      else
        newF.isActive = !!(newF.right && newF.right.id);
    } else if (['in', 'not in'].includes(center)) {
      newF.isActive = Array.isArray(newF.right) && newF.right.length > 0;
    } else if (['date', 'datetime'].includes(column.type)) {
      newF.isActive = false;
      if (center === 'beetwen') {
        newF.isActive = Array.isArray(newF.right) && newF.right.length === 2 && newF.right[0] instanceof Date && newF.right[1] instanceof Date;
        if (newF.isActive) {
          newF.right[0] instanceof Date && newF.right[0].setHours(0, 0, 0, 0);
          newF.right[1] instanceof Date && newF.right[1].setHours(23, 59, 59, 999);
        }
      } else if (newF.right instanceof Date) {
        newF.isActive = true;
        if (center != '=') newF.right.setHours(0, 0, 0, 0);
      }
    } else {
      newF.isActive = !!newF.right;
    }

    if (this.filterSettingsState.isReadonly) this.copySettings('filter');
    this._usNextState({ ...this.filterSettingsState, isModify: true, apply: false }, 'filter');
    // if (!newF.isActive && newF.isActive === oldF.isActive) return;

    this._debonce$.next(newF);
  }

  onLazyLoad(event: { multiSortMeta: SortMeta[]; }) {
    if (!this._isInitComplete$.value) return;
    this.multiSortMeta = event.multiSortMeta;
    this.prepareDataSource();
    if (this.id) this.dataSource.sort();
    else this.isCatalog ? this.first() : this.last();
  }

  loadNodes(id = null) {
    this.dataSource.listOptions.hierarchyDirectionUp = false;
    if (id && id === this.selectedNode.key) {
      this.dataSource.listOptions.hierarchyDirectionUp = !this.selectedNode.leaf && !this.selectedNode.expanded;
      this._expandedNodeId = this.selectedNode.expanded ? this.selectedNode.key : '';
    }
    if (!id) {
      const sel = this.selectedNode;
      if (this.initNodes && this.id) {
        id = this.id;
      } else if (sel && sel.parent) id = !sel.expanded ? sel.key : sel.parent.key;
      else if (sel) {
        const topLevel = this.treeNodes.filter(e => e.parent === null).length > 1;
        id = topLevel ? sel.key : null;
      }
    }
    this.dataSource.id = id;
    if (this.initNodes) { this.initNodes = false; this.dataSource.sort(); } else this.dataSource.first();
  }

  private buildTreeNodes(tree: any[], parent?: string | null, parentNode?: TreeNode | null): TreeNode[] {
    return tree.filter(el => el.parent.id === parent).map(el => {
      const node = <TreeNode>{
        key: el.id,
        data: el,
        leaf: !el.isfolder,
        icon: 'pi pi-folder-open',
        expanded: false,
        expandedIcon: 'pi pi-folder-open',
        collapsedIcon: 'pi pi-folder',
        children: this.buildTreeNodes(tree, el.id) || [],
      };
      node.expanded = !node.leaf && (node.children.length > 0 || this._expandedNodeId === node.key);
      return node;
    });
  }

  onNodeClick(node: { node: TreeNode }) {
    const Node = node.node;
    if (Node.leaf) { this.open(Node.key); return; }
    Node.expanded = !Node.expanded;
    this.onNodeExpand(node);
  }

  onNodeExpand(node: { node: TreeNode }) {
    const Node = node.node;
    this.selectedNode = Node;
    this.loadNodes(Node.key);
  }

  private prepareDataSource(multiSortMeta: SortMeta[] = this.multiSortMeta) {
    this.dataSource.id = this.id;
    this.dataSource.formListSettings = {
      filter: [...(this.activeFilters || []).map(e => ({
        left: e.left,
        center: e.center,
        right: ['in', 'not in'].includes(e.center) ?
          e.right.map(el => !!el.label ? `N'${el.label}'` : `'${el.id}'`).join(',') : e.right
      }))],
      order: (multiSortMeta || []).map(el => <FormListOrder>({ field: el.field, order: el.order === -1 ? 'desc' : 'asc' }))
    };
    const treeNodesVisibleBefore = this.treeNodesVisible;
    this.treeNodesVisible = this._presentation !== 'List' && this.hierarchy && !this._filtersWithoutDeleted(this.activeFilters).length;
    this.dataSource.listOptions.withHierarchy = this.treeNodesVisible;
    if (treeNodesVisibleBefore !== this.treeNodesVisible) this.onTreeNodesVisibleChange();
  }

  _filtersWithoutDeleted(filters) {
    return filters.filter(e => e.left !== 'deleted');
  }

  getColumnFilter(field: string) {
    return this.getColumn(field).filter;
  }

  setColumnFilter(_filter: FormListFilter) {
    const col = this.getColumn(_filter.left);
    if (!col) return;
    col.filter = { ..._filter };
  }

  getColumn(field: string) {
    return this.columns.find(e => e.field === field);
  }

  private setContextMenu() {

    const qFilterCommand = {
      label: 'Quick filter', icon: 'pi pi-search',
      command: (event) => this.update(this.getColumn(this.ctxData.column), this.ctxData.value, '=')
    };

    const selectAllCommand = {
      label: 'Select (All)', icon: 'fa fa-check-square',
      command: (event) => this.selection = [...this.dataSource.renderedDataList]
    };

    const clearAllFilters = {
      label: 'Clear all filters', icon: 'far fa-trash-alt',
      command: (event) => this.clearAllFilters()
    };

    this.contexCommands.tree = [
      qFilterCommand,
      clearAllFilters,
      ...(this.data.metadata.copyTo || []).map(el => {
        const { label, icon } = el;
        return <MenuItem>{ label, icon, command: (event) => this.copyTo(el.type) };
      })];

    this.contexCommands.list = [selectAllCommand, ...this.contexCommands.tree];
  }

  clearAllFilters() {
    this.activeFilters
      .filter(e => !this.isDeletedHidden || e.left !== 'deleted')
      .forEach(f => f.isActive = false);
    this.prepareDataSource();
    this.goto(this.id);
  }

  private buildFiltersParamQuery() {
    const filters = {};
    this.activeFilters
      .filter(f => f.right && f.right.id)
      .forEach(f => filters[f.left] = f.right.id);
    return filters;
  }

  private getCurrentParent() {
    const result = { parent: null };
    if (this.treeNodesVisible && this.selectedData)
      result.parent = (this.selectedData.isfolder || Object.keys(this.selectedData).length === 1) ?
        this.selectedData.id :
        this.selectedData.parent.id;
    return result;
  }

  add(isfolder = false) {
    const id = v1().toUpperCase();
    this.router.navigate([this.type, id],
      { queryParams: { new: id, ...this.buildFiltersParamQuery(), ...this.getCurrentParent(), isfolder } });
  }

  copy() {
    this.router.navigate([this.type, v1().toUpperCase()],
      { queryParams: { copy: this.selectedData.id } });
  }

  copyTo(type: string) {
    this.router.navigate([type, v1().toUpperCase()],
      { queryParams: { base: this.selectedData.id } });
  }

  open(id = null) {
    const selId = id ? id : this.id ? this.id : null;
    if (!selId) return;
    this.router.navigate([this.type, selId]);
  }

  delete() {
    if (this.treeNodesVisible && this.selectedNode) this.ds.delete(this.selectedNode.key);
    else this.selection.forEach(el => this.ds.delete(el.id));
  }

  async post(mode = 'post') {
    const tasksCount = this.selection.length; let i = tasksCount;
    for (const s of this.selection) {
      if (s.deleted) continue;
      this.lds.counter = Math.round(100 - ((i--) / tasksCount * 100));
      if (mode === 'post') {
        try {
          await this.ds.posById(s.id);
          s.posted = true;
        } catch (err) { this.ds.openSnackBar('error', s.description, err); }
      } else {
        try {
          await this.ds.unpostById(s.id);
          s.posted = false;
        } catch (err) { this.ds.openSnackBar('error', s.description, err); }
      }
      this.selection = [s];
      setTimeout(() => scrollIntoViewIfNeeded(this.type, 'ui-state-highlight'));
    }
    this.lds.counter = 0;
    this.dataSource.refresh(this.selection[0].id);
  }

  addMenuItemsHeight() {
    return this.addMenuItems.length * 27;
  }

  addMenuItemsFill() {
    const viewMenuItems = {
      label: 'View', items: this.dataViewTypeChangeCommands
    };

    this.addMenuItems = [
      // { label: 'Export to CSV', command: () => { this.tbl.exportCSV(); } },
      // { label: 'Reset', command: () => { this._resetTables(); } },
      { label: 'Clear filters', command: () => { this.clearAllFilters(); } },
      { separator: true },
      { label: 'Show deleted', id: 'ShowDeleted', command: () => { this.isDeletedHidden = !this.isDeletedHidden; } },

    ];
    if (this.hierarchy) this.addMenuItems = [viewMenuItems, { separator: true }, ...this.addMenuItems];
  }

  private _resetTables() {
    this.treeNodesVisible ? this.treeTable.reset() : this.tbl.reset();
  }

  setPresentationMode(mode: string = 'List' || 'Tree' || '') {
    this._presentation = mode;
    this.onChangePresentation();
  }

  onChangePresentation() {
    const treeNodesVisibleBefore = this.treeNodesVisible;
    switch (this._presentation) {
      case 'List':
        this.treeNodesVisible = false;
        break;
      case 'Tree':
        this.treeNodesVisible = true;
        this.clearAllFilters();
        break;
      case 'Auto':
        const dsFilter = this.dataSource.formListSettings.filter;
        this.treeNodesVisible = this.hierarchy && (!!dsFilter.length || (dsFilter.length === 1 && this.isDeletedHidden));
        break;
      default:
        break;
    }
    if (treeNodesVisibleBefore !== this.treeNodesVisible) {
      this.onTreeNodesVisibleChange();
      this.prepareDataSource(this.multiSortMeta);
      this._pageSize$.next(this.getPageSize());
    }
  }

  onTreeNodesVisibleChange() {

    this.dataSource.listOptions.withHierarchy = this.treeNodesVisible;
    if (this.treeNodesVisible && this.selection.length > 0) { this.id = this.selection[0].id; this.initNodes = true; }
    // tslint:disable-next-line: one-line
    else if (!this.treeNodesVisible && this.selectedNode) this.id = this.selectedNode.key;
    else this.id = null;
  }

  onContextMenuSelect(event) {
    let el = (event.originalEvent as MouseEvent).target as any;
    if (!el) return;
    while (!el.id && el.lastElementChild) { el = el.lastElementChild; }
    if (!el.id) return;
    const dataStorage = this.treeNodesVisible ? event.node.data : event.data;
    const value = dataStorage[el.id];
    this.ctxData = { column: el.id, value: value && value.id ? value : value };
    this.id = dataStorage.id;
  }

  private listen(first: boolean) {
    this.dataSource.result$.pipe(take(1)).subscribe(d => {
      if (d.length > 0 && !this.treeNodesVisible) this.id = d[first ? 0 : d.length - 1].id;
    });
  }

  first() { this.listen(true); this.dataSource.first(); }
  last() { this.listen(false); this.dataSource.last(); }
  prev() { this.listen(false); this.dataSource.prev(); }
  next() { this.listen(false); this.dataSource.next(); }

  private listenRefresh(id: string) {
    // this.selection = [];
    this.dataSource.result$.pipe(take(1)).subscribe(d => {
      if (d.length > 0) {
        const row = d.find(el => el.id === id);
        if (row) this.id = row.id;
      }
    });
  }

  refresh(id: string) {
    this.listenRefresh(id);
    this.dataSource.refresh(id);
  }
  goto(id: string) {
    this.listenRefresh(id);
    this.dataSource.goto(id);
  }


  onColResize(event) {
    if (this.isRelationList) return;
    if (this.columnsSettingsState.isReadonly) this.copySettings('columns');
    const col = this._getColumnByElement(event.element);
    if (!col) console.log('Unknow col: ' + event.element.outerText);
    this.settings.columns.width[col.field] = `${event.element.offsetWidth}px`;
    this._columnsSettingsState$.next({ ...this._columnsSettingsState$.value, isModify: true, apply: false });
  }

  private _getColumnByElement(element: { outerText: string, offsetWidth: number }): ColumnDef {
    const label = element.outerText.trim();
    return this.columns.find(e => e.label === label);
  }

  onColReorder(columns) {
    if (this.isRelationList) return;
    if (this.columnsSettingsState.isReadonly) this.copySettings('columns');
    this.settings.columns.order = columns.map(e => e.field);
    this.usApplyColumnsProps();
    this._columnsSettingsState$.next({ ...this._columnsSettingsState$.value, isModify: true, apply: false });
  }

  public copyToClipboardSelectedTotal() {
    copyToClipboard(this.selectedTotal);
  }

  private onFilterSettingsStateChanged(state: IUserSettingsState) {
    if (!state.settings || !state.apply) return;
    this.settings = { ...this.settings, filter: [...state.selected.settings.filter] };
    this._resetColumnsFilters();
    this.prepareDataSource(this.multiSortMeta);
    this._isInitComplete$.next(true);
    this._pageSize$.next(this.getPageSize());
    this._filterSettingsState$.next({ ...this._filterSettingsState$.value, apply: false });
  }

  private onColumnsSettingsStateChanged(state: IUserSettingsState) {
    if (!state.settings || !state.apply) return;
    this.settings = { ...this.settings, columns: { ...state.selected.settings.columns } };
    this.setSortOrder();
    this.usApplyColumnsProps();
    this.prepareDataSource(this.multiSortMeta);
    this._pageSize$.next(this.getPageSize());
    this._columnsSettingsState$.next({ ...this._columnsSettingsState$.value, apply: false });
  }

  private usApplyColumnsProps() {
    this.columns = [
      ...this.settings.columns.order.map(field => this.columns.find(e => e.field === field)),
      ...this.columns.filter(col => !this.settings.columns.order.includes(col.field))
    ];
    for (const column of this.columns.filter(e => e.style && typeof e.style !== 'string')) {
      const colStyle = { ...column.style as any };
      for (const prop of this._columnSettingsProps) {
        if (!Object.keys(this.settings.columns[prop]).includes(column.field)) continue;
        const propVal = this.settings.columns[prop][column.field];
        if (prop === 'visibility')
          column.hidden = !propVal;
        else
          colStyle[prop] = propVal;
      }
      column.style = colStyle;
    }
  }

  usColumnsInvertHidden(column: ColumnDef) {
    if (this.columnsSettingsState.isReadonly) this.copySettings('columns');
    column.hidden = !column.hidden;
    this._usNextState({ ...this._columnsSettingsState$.value, isModify: true }, 'columns');
  }



  _usStateByKind(kind: settingsKind) {
    switch (kind) {
      case 'filter':
        return this.filterSettingsState;
      case 'columns':
        return this.columnsSettingsState;
      default:
        return undefined;
    }
  }

  usGetMatchOperatorsByType(type: string) {
    return (matchOperatorByType[type] || matchOperatorByType['default']).map(e => ({ label: e, value: e }));
  }

  _cloneSettings(us: IUserSettings, partial: Partial<IUserSettings>): IUserSettings {

    const settings: FormListSettings = { filter: [...us.settings.filter], order: [...us.settings.order] };

    if (us.settings.columns)
      settings.columns = {
        color: { ...us.settings.columns.color || {} },
        width: { ...us.settings.columns.width || {} },
        visibility: { ...us.settings.columns.visibility || {} },
        order: [...us.settings.columns.order || []]
      };

    return {
      ...us,
      settings,
      ...partial || {}
    };
  }

  copySettings(kind: settingsKind) {
    const state = this._usStateByKind(kind);
    if (!state) return;
    const getUniqueSettingsName = (index) => {
      const name = `${state.selected.description.replace('(copy 1)', '').trim()} (copy ${index})`;
      return state.settings.find(e => e.description.trim() === name) ? getUniqueSettingsName(++index) : name;
    };

    const newSettings = this._cloneSettings(
      state.selected,
      { description: getUniqueSettingsName(1), id: v4().toLocaleUpperCase(), timestamp: null }
    );

    const newState: IUserSettingsState = {
      ...state,
      apply: false,
      isReadonly: false,
      isNew: true,
      isModify: true,
      settings: [...state.settings, newSettings],
      selected: newSettings
    };
    this._usNextState(newState, kind);
  }

  _usOnUserSettingsChange(event: any, kind: settingsKind) {
    const state = this._usStateByKind(kind);
    let newState: IUserSettingsState;
    if (typeof event.value === 'string') {
      state.settings.find(e => e.id === state.selected.id).description = event.value;
      newState = {
        ...state,
        selected: { ...state.selected, description: event.value },
        isModify: true,
        apply: false,
        settings: [...state.settings]
      };
    } else {
      const current = this.usGetCurrentSettings(kind);
      state.settings[state.settings.findIndex(e => e.id === current.id)] = current;
      state.settings = [...state.settings];
      newState = {
        ...state,
        selected: state.settings.find(e => e.id === event.value.id),
        apply: true,
        isReadonly: !event.value.id
      };
    }
    this._usNextState(newState, kind);
  }

  usEditDescription(kind: settingsKind, dropDown: any) {
    this.usSettingsEditMode = true;
    dropDown.focus();
  }

  deleteSettingsConfirmationHandler(kind: settingsKind, confirmed: boolean) {
    if (!confirmed) return;
    this.deleteSelectedSettings(kind, false);
  }

  deleteSelectedSettings(kind: settingsKind, withConfirmation = true) {
    const state = this._usStateByKind(kind);
    if (!state || state.isReadonly) return;

    if (withConfirmation)
      this.ds.confirmationService.confirm({
        header: 'Delete settings?',
        message: state.selected.description,
        icon: 'fa fa-question-circle',
        accept: this.deleteSettingsConfirmationHandler.bind(this, kind, true),
        reject: this.deleteSettingsConfirmationHandler.bind(this, kind, false),
        key: `list: ${this.id}`
      });
    else
      this.uss.deleteSettings(state.selected).then(e => {
        const newSettings = [
          ...state.settings.filter(el => el.id !== state.selected.id)
        ];
        const newState: IUserSettingsState = {
          selected: newSettings[0],
          settings: newSettings,
          isReadonly: !newSettings[0].id,
          isNew: false,
          isModify: false,
          apply: true
        };
        this._usNextState(newState, kind);
      });
  }

  usGetCurrentSettings(kind: settingsKind): IUserSettings {
    const state = this._usStateByKind(kind);
    return { ...state.selected, settings: this._getCurrentFormListSettings(kind) };
  }

  usSaveCurrentSettings(kind: settingsKind) {
    const state = this._usStateByKind(kind);
    if (!state || (state.isReadonly && (!state.isModify && kind !== 'filter'))) return;
    if (state.settings.find(e => e.description === state.selected.description && e.id !== state.selected.id)) {
      this.ds.openSnackBar('warning', 'Can\'t save', `The name "${state.selected.description}" is already in use`);
      return;
    }

    const selected = this.usGetCurrentSettings(kind);

    if (kind === 'filter')
      selected.settings.filter = selected.settings.filter
        .filter(e => e.isActive)
        .map(e => ({ left: e.left, center: e.center, right: e.right }));

    this.uss.saveSettings([selected]).then(saved => {
      const newState: IUserSettingsState = {
        ...state,
        selected: saved[0],
        settings: [saved[0], ...state.settings.filter(settings => settings.id !== saved[0].id)],
        isReadonly: false,
        isNew: false,
        isModify: false,
        apply: false
      };
      this._usNextState(newState, kind);
    });
  }

  _usNextState(state: IUserSettingsState, kind: settingsKind) {
    if (kind === 'columns')
      this._columnsSettingsState$.next(state);
    if (kind === 'filter')
      this._filterSettingsState$.next(state);
  }

  private usGetSettingsType() {
    return `${this.type}${this.group ? '/group/' + this.group : ''}`;
  }

  private usLoad() {
    if (this.isRelationList) return;
    const defaults = this.usGetDefaultSettings();
    const stateFromSettings = (settings: IUserSettings[]) => {
      this._usNextState({
        settings: settings,
        selected: settings[0],
        isModify: false,
        isNew: false,
        isReadonly: !settings[0].id,
        apply: true
      }, settings[0].kind);
    };
    if (this.isRelationList) {
      stateFromSettings(defaults.filter(e => e.kind === 'columns'));
      stateFromSettings(defaults.filter(e => e.kind === 'filter'));
    } else {
      this.uss.loadSettings(this.usGetSettingsType(), this._userEmail, '', defaults).then(
        savedSettings => {
          const fSet = savedSettings.filter(e => e.kind === 'filter');
          fSet
            .filter(e => !!e.id)
            .forEach(e => e.settings.filter.forEach(f => f.isActive = true));
          fSet.map(e => {
            e.settings.filter = this._usMergeSettings(e.settings.filter, this._usDefaultFilterGet());
            return e;
          })
          stateFromSettings(savedSettings.filter(e => e.kind === 'columns'));
          stateFromSettings(fSet);
        }
      );
    }
  }

  private _usMergeSettings(destination: FormListFilter[], source: FormListFilter[]) {
    const allFields = [...new Set([...(source || []).map(e => e.left), ...(destination || []).map(e => e.left)])];
    return allFields.map(f => destination.find(e => e.left === f && e.isActive) || source.find(e => e.left === f)).filter(e => !!e);
  }

  private _usDefaultFilterGet(): FormListFilter[] {
    if (this.isRelationList || !Type.isDocument(this.type)) return [];
    const current = new Date;
    const begin = new Date(new Date((addMonths(new Date, -3).setDate(1))).setHours(0, 0, 0, 0));
    const end = new Date(new Date(current.getFullYear(), current.getMonth() + 1, 0).setHours(23, 59, 59, 999));
    const defaultPeriond = [begin, end];
    return [{ left: 'date', center: 'beetwen', right: defaultPeriond, isActive: true }];
  }

  private usGetDefaultSettings(): IUserSettings[] {
    const allSettings = {
      type: this.usGetSettingsType(),
      user: this._userEmail,
      description: 'Default',
      id: '',
      settings: this._getCurrentFormListSettings()
    };
    return [
      {
        ...allSettings,
        settings: { filter: allSettings.settings.filter, order: [] },
        kind: 'filter'
      },
      {
        ...allSettings,
        settings: { filter: [], order: allSettings.settings.order, columns: allSettings.settings.columns },
        kind: 'columns'
      }
    ];

  }

  private _getCurrentFormListSettings(kind?: settingsKind): FormListSettings {
    const res: FormListSettings = { filter: [], order: [] };
    if (kind === 'filter' || !kind) res.filter = [...this.allFilters];
    if (kind === 'columns' || !kind) {
      res.order = ((<SortMeta[]>this.multiSortMeta) || [])
        .map(o => <FormListOrder>{ field: o.field, order: o.order === 1 ? 'asc' : 'desc' });
      res.columns = this._getCurrentFormListSettingsColumns();
    }
    return res;
  }

  private _getCurrentFormListSettingsColumns(): FormListColumnProps {
    const res: FormListColumnProps = { color: {}, width: {}, order: this.columns.map(col => col.field), visibility: {} };
    this.columns.forEach(col => {
      // res.color[col.field] = col.style['color'];
      res.width[col.field] = this.settings.columns.width[col.field] || col.style['width'];
      res.visibility[col.field] = !col.hidden;
    });
    return res;
  }

  ngOnDestroy() {
    this._docSubscription$.unsubscribe();
    this._routeSubscription$.unsubscribe();
    this._debonceSubscription$.unsubscribe();
    this._pageSizeSubscription$.unsubscribe();
    this._resizeSubscription$.unsubscribe();
    this._columnsSettingsStateSubscription$.unsubscribe();
    this._filterSettingsStateSubscription$.unsubscribe();
    this._debonce$.complete();
    this._pageSize$.complete();
  }

}

