import { ChangeDetectionStrategy, Component, Input, OnInit } from '@angular/core';
import { Observable } from 'rxjs';
import { ApiService } from '../../services/api.service';
import { DocService } from '../doc.service';
import { DocumentBase } from 'jetti-middle/dist';
import { DynamicFormService } from '../dynamic-form/dynamic-form.service';

const AddPropsType = 'Catalog.Operation.Type';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-additional-props-list',
  templateUrl: './additional-props-list.component.html',
})
export class AdditionalPropsListComponent implements OnInit {

  propsList$: Observable<{ id: string, description: string }[]>;
  
  @Input() owner: DocumentBase;

  type = AddPropsType;

  constructor(private api: ApiService, private ds: DocService, private dfs: DynamicFormService) { }

  ngOnInit() {
    // const vm = this.owner.id ?
    // this.dfs.getViewModel$(type, id, route.queryParams) :
    // this.api.getView(type, { group, used });

    this.propsList$ = this.api.getAdditionalPropsList(this.owner.type);

    // this.movementsList$ = merge(...[
    //   this.ds.save$,
    //   this.ds.delete$,
    //   this.ds.post$,
    //   this.ds.do$]
    // ).pipe(
    //   strtWith(this.doc),
    //   filter(doc => doc.id === this.doc.id),
    //   switchMap(doc => this.api.getDocRegisterMovementsList(this.doc.id)));
  }

  resolvePropsView(id: string) {
    this.dfs.getViewModel$(this.type, id)
  }

}
