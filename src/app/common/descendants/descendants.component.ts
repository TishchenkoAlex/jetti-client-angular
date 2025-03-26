import { ChangeDetectionStrategy, Component, Input, OnInit, OnDestroy } from '@angular/core';
import { Subject, Subscription, merge } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { ApiService } from '../../services/api.service';
import { Router } from '@angular/router';
import { DocService } from '../doc.service';
import { LoadingService } from '../loading.service';
import { DocumentBase, Type } from 'jetti-middle/dist';

export interface IDescedantData {
  amount: number;
  code: string;
  company: string;
  date: string;
  deleted: false
  description: string;
  id: string;
  info: string;
  posted: true
  type: string;
  user: string;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-descendants',
  templateUrl: './descendants.component.html',
})
export class DescendantsComponent implements OnInit, OnDestroy {

  @Input() doc: DocumentBase;

  get isDoc() { return Type.isDocument(this.doc.type); }
  get isForm() { return Type.isForm(this.doc.type); }
  get isCatalog() { return Type.isCatalog(this.doc.type); }

  selection: any;
  private _subscription$: Subscription = Subscription.EMPTY;
  descendantsListSub$ = new Subject<any[]>();
  infoText = '';

  dataSource = [];
  constructor(private apiService: ApiService, public router: Router, private ds: DocService, public lds: LoadingService) { }

  ngOnInit() {
    this.apiService.getDescedantsObjects(this.doc.id)
      .pipe(take(1))
      .subscribe(data => {
        data.forEach(e => e.description = (e.description || '').replace('Operation ', ''));
        this.descendantsListSub$.next(data);
      });

    if (this.isCatalog) this._subscription$ = this.descendantsListSub$.subscribe(data => {
      this.infoText = '';
      if (data.length === 20) this.infoText = 'First 20 objects';
    });
  }

  search(searchedValue: string) {
    if (!searchedValue) return;
    this.descendantsListSub$.pipe(take(1)).subscribe(data => {
      searchedValue = searchedValue.toLowerCase();
      const dataSourceFiltred = data.filter(el => {
        for (const key of Object.keys(el)) {
          let curVal = el[key];
          if (curVal && curVal.type && curVal.type.includes('.')) curVal = curVal.value;
          if (curVal && curVal.toString().toLowerCase().includes(searchedValue)) return true;
        }
        return false;
      });
      this.descendantsListSub$.next(dataSourceFiltred);
    });
  }

  openOnClick() {
    this.openDescedant(this.selection);
  }

  openDescedant(descedantData: { type, id }) {
    this.router.navigate([descedantData.type, descedantData.id]);
  }

  ngOnDestroy() {
    this._subscription$.unsubscribe();
  }
}
