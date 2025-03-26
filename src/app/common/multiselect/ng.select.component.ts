import { ChangeDetectionStrategy, Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { ISuggest, StorageType, FormListFilter } from 'jetti-middle/dist';
import { IComplexObject } from '../dynamic-form/dynamic-form-base';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-ng-select',
  templateUrl: './ng.select.component.html'
})

export class JNgSelectComponent implements OnInit {

  @Input() selectedItems: IComplexObject[] = [];
  @Input() selectedItemsSimple: { label: string, value: string }[] = [];
  @Input() options: { label: string, value: string }[];
  @Input() type: string;
  @Input() storageType: StorageType;
  @Input() inputStyle: { [x: string]: any };
  @Input() id: string;
  @Input() placeholder = '';
  @Input() multiple = true;
  @Input() maxVisibleItems = 10;
  @Output() select = new EventEmitter<IComplexObject[]>();

  suggests$: Observable<ISuggest[]>;
  filters: FormListFilter[] = [];

  constructor(private api: ApiService) { }

  ngOnInit(): void {

    if (this.storageType === 'folders') { this.filters.push({ left: 'isfolder', center: '=', right: true }); }
    if (this.storageType === 'elements') { this.filters.push({ left: 'isfolder', center: '=', right: false }); }
    if (this.storageType === 'all') { this.filters.push({ left: 'isfolder', center: '=', right: undefined }); }

  }

  emitSelect() {
    if (!Array.isArray(this.selectedItems)) return;
    this.select.emit(this.selectedItems.map(e => ({ id: e.id, code: e.code, type: e.type, value: e.value })));
  }

  emitSelectSimple() {
    if (!Array.isArray(this.selectedItemsSimple)) return;
    this.select.emit([...this.selectedItemsSimple] as any);
  }

  onFilterChange(ev) {
    this.getSuggests(ev);
  }

  clear(item: IComplexObject) {
    this.selectedItems = [...this.selectedItems.filter(e => e.id !== item.id)];
  }

  getSuggests(text: string) {
    if (!text) return;
    this.suggests$ = this.api.getSuggests(this.type, text, this.filters);
  }

}
