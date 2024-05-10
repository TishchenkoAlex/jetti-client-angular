import { ChangeDetectionStrategy, Component, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocService } from '../doc.service';
import { DynamicFormService } from '../dynamic-form/dynamic-form.service';
import { FormGroup } from '@angular/forms';
import { map, share, take, tap } from 'rxjs/operators';
import { DocumentOptions, Relation } from 'jetti-middle/dist/common/interfaces/document';
import { DocumentBase, FormBase } from 'jetti-middle';
import { FormControlInfo, IFormControlPlacing } from '../dynamic-form/dynamic-form-base';
import { LoadingService } from '../loading.service';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { MenuItem } from 'primeng/api';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-additional-props-item',
  templateUrl: './additional-props-item.component.html',
})
export class AdditionalPropsItemComponent implements OnInit {

  private readonly _hiddenFields = ['code', 'description', 'company', 'info'];
  private readonly _form$ = new BehaviorSubject<FormGroup>(undefined);
  form$ = this._form$.asObservable();
  readonly = false;
  historyVisible = false;
  private savedValue = '';

  buttons: MenuItem[] = [
    {
      label: 'Refresh', icon: 'pi pi-refresh', command: () => {
        this.refresh();
      }
    },
    {
      label: 'Delete', icon: 'far fa-trash-alt', command: async () => {
        await this.delete();
      }
    }
  ]
  @Input() ownerId: string;
  @Input() propsId: string;
  @Input() type: string;
  // @ViewChildren(CdkTrapFocus) cdkTrapFocus: QueryList<CdkTrapFocus>;

  constructor(private api: ApiService, private ds: DocService, private dfs: DynamicFormService, public lds: LoadingService) { }

  viewModel$ = this.form$.pipe(map(f => f.getRawValue() as DocumentBase | FormBase));
  metadata$ = this.form$.pipe(map(f => <DocumentOptions>f['metadata']));
  v$ = this.form$.pipe(map(f => (<FormControlInfo[]>f['orderedControls'])));
  vk$ = this.form$.pipe(map(f => (<{ [key: string]: FormControlInfo }>f['byKeyControls'])));
  tables$ = this.form$.pipe(map(f => (<FormControlInfo[]>f['orderedControls']).filter(t => t.controlType === 'table')));
  isPosted$ = this.form$.pipe(map(f => (<boolean>!!f.get('posted').value)));
  isDeleted$ = this.form$.pipe(map(f => (<boolean>!!f.get('deleted').value)));
  isDirty$ = this.form$.pipe(map(f => (<boolean>!!f.dirty)));
  isNew$ = this.form$.pipe(map(f => (!f.get('timestamp').value)));

  get form() { return this._form$.value; }
  get viewModel() { return this.form.getRawValue(); }
  get metadata() { return <DocumentOptions>this.form['metadata']; }
  get v() { return <FormControlInfo[]>this.form['orderedControls']; }
  get tables() { return (<FormControlInfo[]>this.form['orderedControls']).filter(t => t.controlType === 'table' && !t.panel); }
  get hasTables() { return this.tables.length > 0; }
  get headFields() {
    return <FormControlInfo[]>this.v.filter(el =>
      el.order !== 777
      && !this._hiddenFields.includes(el.key)
      && !el.isAdditional
      && !el.panel
      && el.controlType !== 'table'
      && el.controlType !== 'script'
      && el.order !== 1000
      && el.order > 0);
  }
  get isPosted() { return <boolean>!!this.form.get('posted').value; }
  get isDeleted() { return <boolean>!!this.form.get('deleted').value; }
  get isNew() { return !this.form.get('timestamp').value; }
  get id() { return this.form.get('id').value as string; }
  get model() { return this.form.get('parent').value['value'] as string; }

  get isDirty() { return !!this.form.dirty; }

  ngOnInit() {
    this.refresh();
  }

  async refresh() {
    this.api.getAdditionalPropsView(this.ownerId, this.propsId)
      .pipe(take(1),
        map(vm => this.dfs.viewModelToFormGroup(vm)),
        share(),
      ).subscribe(e => {
        this.savedValue = JSON.stringify(e.getRawValue());
        this._form$.next(e);
      });
  }

 async save() {
    const currentValue = JSON.stringify(this.viewModel);
    if (currentValue === this.savedValue) return;
    await this.ds.post(this.viewModel as DocumentBase);
    await this.refresh();
    this.savedValue = currentValue;
  }

  delete() {
    if (this.isNew) return;
    console.log(this.form.get('Model'));
    this.confirm(`Do you really want to remove the additional property "${this.model}"?`, 'Confirm deletion', this._delete.bind(this));
  }

  async _delete() {
    await this.ds.delete(this.viewModel.id);
    await this.refresh();
  }

  confirm(message: string, header: string, accept: Function) {
    return this.ds.confirmationService.confirm({
      header,
      message,
      accept,
      key: this.id
    });
  }

}
