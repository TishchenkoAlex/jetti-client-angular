import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnDestroy, OnInit, Output, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { TreeNode } from 'primeng/api';
import { merge, Observable, Subject, Subscription } from 'rxjs';
import { filter, map, switchMap, tap, take } from 'rxjs/operators';
import { ITree, DocumentBase } from 'jetti-middle/dist';
import { v1 } from 'uuid';
import { DocService } from '../../common/doc.service';
import { ApiService } from '../../services/api.service';
import { LoadingService } from '../loading.service';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-tree-list',
  templateUrl: 'base.tree-list.component.html',
})
export class BaseTreeListComponent implements OnInit, OnDestroy {
  @Output() selectionChange = new EventEmitter();
  @Input() type: string;
  @Input() showCommands = true;
  @Input() scrollHeight = `${(window.innerHeight - 275)}px`;
  treeNodes$: Observable<TreeNode[]>;
  treeNodes: TreeNode[] = [];
  selection: TreeNode;

  private paginator = new Subject<DocumentBase>();
  private _docSubscription$: Subscription = Subscription.EMPTY;

  // tslint:disable-next-line: max-line-length
  constructor(private api: ApiService, public router: Router, public ds: DocService, public lds: LoadingService, private cd: ChangeDetectorRef) { }

  ngOnInit() {

    this._docSubscription$ = merge(...[this.ds.save$, this.ds.delete$, this.ds.saveClose$, this.ds.goto$]).pipe(
      filter(doc => doc && doc.type === this.type)).
      subscribe(doc => this.paginator.next(doc));

    this.treeNodes$ = this.paginator.pipe(
      switchMap(doc => {
        return this.api.tree(this.type).pipe(
          map(tree => <TreeNode[]>[{
            label: '(All)',
            data: { id: undefined, description: '(All)', type: this.type, value: null, code: null },
            expanded: true,
            expandedIcon: 'fa fa-folder-open',
            collapsedIcon: 'fa fa-folder',
            children: this.buildTreeNodes(tree, null),
          }]),
          tap(treeNodes => {
            this.treeNodes = treeNodes;
          }));
      }));
    setTimeout(() => this.paginator.next());

    // this.hotkeys.addShortcut({ keys: 'Insert', description: 'Add' }).subscribe(() => { this.add(); });
    // this.hotkeys.addShortcut({ keys: 'F2', description: 'Open' }).subscribe(() => { this.open(); });
    // this.hotkeys.addShortcut({ keys: 'F9', description: 'Copy' }).subscribe(() => { this.copy(); });
    // this.hotkeys.addShortcut({ keys: 'Delete', description: 'Delete' }).subscribe(() => { this.delete(); });
  }

  private findDoc(tree: TreeNode[], id: string): TreeNode | undefined {
    if (!id) { return undefined; }
    const result = tree.find(el => el.data.id === id);
    if (result) return result;
    for (let i = 0; i < tree.length; i++) {
      const childrenResult = this.findDoc(tree[i].children || [], id);
      if (childrenResult) return childrenResult;
    }
  }

  setSelection(id: string) {
    this.selection = this.findDoc(this.treeNodes, id);
    this.cd.markForCheck();
  }

  private buildTreeNodes(tree: ITree[], parent: string | null): TreeNode[] {
    return tree.filter(el => el.parent === parent).map(el => {
      return <TreeNode>{
        label: el.description,
        data: { id: el.id, description: el.description, type: this.type, value: el.description, code: null },
        expanded: true,
        expandedIcon: 'fa fa-folder-open',
        collapsedIcon: 'fa fa-folder',
        children: this.buildTreeNodes(tree, el.id) || [],
      };
    });
  }

  add() {
    const id = v1().toUpperCase();
    this.router.navigate([this.type, id],
      { queryParams: { new: id, isfolder: true, parent: this.selection.data.id } });
  }

  copy() {
    const id = v1().toUpperCase();
    this.router.navigate([this.type, id],
      { queryParams: { copy: this.selection.data.id, isfolder: true, parent: this.selection.data.id } });
  }

  open = () => {
    this.router.navigate([this.type, this.selection.data.id], { queryParams: {} });
  }

  delete = () => this.ds.delete(this.selection.data.id);

  onDragEnd(event) {
  }

  onNodeSelect(event) {
    this.selectionChange.emit(event.node);
  }

  ngOnDestroy() {
    this._docSubscription$.unsubscribe();
  }
}
