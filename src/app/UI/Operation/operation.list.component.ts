import { ActivatedRoute } from '@angular/router';
import { ChangeDetectionStrategy, Component, OnInit, ViewChild, Input } from '@angular/core';
import { AuthService } from 'src/app/auth/auth.service';
import { BaseHierarchyListComponent } from 'src/app/common/datatable/base.hierarchy-list.component';
import { FormListFilter, IViewModel } from 'jetti-middle';
import { combineLatest } from 'rxjs';
import { filter, take } from 'rxjs/operators';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
  <div fxLayout="column" style="padding: 6px" cdkTrapFocus [cdkTrapFocusAutoCapture]="true" cdkFocusInitial>
    <div *ngIf="getSuperColumn('company')" fxLayout="row" fxLayout.xs="column" fxLayoutGap="35px" fxLayoutGap.xs="6px" style="margin-top: 12px; margin-bottom: 6px">
      <div fxFlex *ngIf="['in','not in'].includes(getSuperColumn('company').filter.center)">
        <j-ng-select class="ng-select-container-mini-yellow" placeholder="Select company"
           storageType="elements" type="Catalog.Company" id="company"
           [selectedItems]="getSuperColumn('company').filter.right" maxVisibleItems="1"
           (select)="super.update(getSuperColumn('company'), $event,  getSuperColumn('company').filter.center)">
        </j-ng-select>
      </div>
      <div fxFlex *ngIf="!['in','not in'].includes(getSuperColumn('company').filter.center)">
        <j-autocomplete-png [ngModel]="getSuperColumn('company')?.filter.right" [inputStyle]="{'background-color': 'lightgoldenrodyellow'}"
          (ngModelChange)="super.update(getSuperColumn('company'), $event, '=')" (clear)="super.update(getSuperColumn('company'), $event,  '=')"
          id="company" placeholder="Select company" type="Catalog.Company">
        </j-autocomplete-png>
      </div>
      <div fxFlex *ngIf="!super.group && ['in','not in'].includes(getSuperColumn('Group').filter.center)">
        <j-ng-select class="ng-select-container-mini-yellow"
            storageType="elements" type="Catalog.Operation.Group" id="Group"
            [selectedItems]="getSuperColumn('Group').filter.right" maxVisibleItems="1" placeholder="Select group of operation"
            (select)="super.update(getSuperColumn('Group'), $event,  getSuperColumn('Group').filter.center)">
        </j-ng-select>
      </div>
      <div fxFlex *ngIf="!super.group && !['in','not in'].includes(getSuperColumn('Group').filter.center)">
        <j-autocomplete-png [ngModel]="getSuperColumn('Group')?.filter.right" [inputStyle]="{'background-color': 'lightgoldenrodyellow'}"
          (ngModelChange)="super.update(getSuperColumn('Group'), $event, '=')" (clear)="super.update(getSuperColumn('Group'), $event,  '=')"
          id="Group" placeholder="Select group of operation" type="Catalog.Operation.Group">
        </j-autocomplete-png>
      </div>
      <div fxFlex *ngIf="['in','not in'].includes(getSuperColumn('user').filter.center)">
        <j-ng-select class="ng-select-container-mini-yellow"
            *ngIf="['in','not in'].includes(getSuperColumn('user').filter.center)"
            storageType="elements" type="Catalog.User" id="user"
            [selectedItems]="getSuperColumn('user').filter.right" maxVisibleItems="1" placeholder="Select user"
            (select)="super.update(getSuperColumn('user'), $event,  getSuperColumn('user').filter.center)">
        </j-ng-select>
      </div>
      <div fxFlex *ngIf="!['in','not in'].includes(getSuperColumn('user').filter.center)">
        <j-autocomplete-png [ngModel]="getSuperColumn('user')?.filter.right" [inputStyle]="{'background-color': 'lightgoldenrodyellow'}"
          (ngModelChange)="super.update(getSuperColumn('user'), $event, '=')" (clear)="super.update(getSuperColumn('user'), $event,  '=')"
          id="user" placeholder="Select user" type="Catalog.User">
        </j-autocomplete-png>
      </div>
    </div>
  </div>
  <j-hierarchy-list [data]="this.data" [type]="this.type"></j-hierarchy-list>
  `
})
export class OperationListComponent implements OnInit {
  @Input() type: string;
  @Input() data: IViewModel;

  @ViewChild(BaseHierarchyListComponent, { static: true }) super: BaseHierarchyListComponent;

  constructor(public appAuth: AuthService, public route: ActivatedRoute) { }

  ngOnInit() {
    if (this.route.snapshot.queryParams.goto || this.route.snapshot.params.used) return;
    combineLatest([this.appAuth.userProfile$, this.super.isInitComplete$])
      .pipe(filter(state => state[0] && state[1]))
      .pipe(take(1)).subscribe(state => {
        this.super.addFilterToSettings(new FormListFilter('user', '=', state[0].account.env.view, true), '');
      });
  }

  getSuperColumn(field: string) {
    return this.super.getColumn(field);
  }

}
