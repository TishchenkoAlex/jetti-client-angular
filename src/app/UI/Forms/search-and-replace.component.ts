import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { _baseDocFormComponent } from 'src/app/common/form/_base.form.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from 'src/app/auth/auth.service';
import { DocService } from 'src/app/common/doc.service';
import { TabsStore } from 'src/app/common/tabcontroller/tabs.store';
import { DynamicFormService, getFormGroup } from 'src/app/common/dynamic-form/dynamic-form.service';
import { LoadingService } from 'src/app/common/loading.service';
import { take } from 'rxjs/operators';
import { FormBase } from 'jetti-middle/dist';
import { BehaviorSubject } from 'rxjs';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-search-and-replace',
  templateUrl: './search-and-replace.component.html'
})
export class SearchAndReplaceComponent extends _baseDocFormComponent implements OnInit, OnDestroy {

  readonly = false;
  header = 'Search and replace';
  inited$ = new BehaviorSubject(false);

  constructor(
    public router: Router, public route: ActivatedRoute, public auth: AuthService,
    public ds: DocService, public tabStore: TabsStore, public dss: DynamicFormService,
    public lds: LoadingService, public cd: ChangeDetectorRef) {
    super(router, route, auth, ds, tabStore, dss, cd);
  }

  ngOnInit() {
    super.ngOnInit();
    const id = this.route.snapshot.params.id;
    if (id) {
      this.ds.api.byId(id).then(val => {
        if (!val) return;
        this.readonly = true;
        this.form.get('OldValue').setValue({ id: val.id, code: val.code, type: val.type, value: val.description });
        this.updateHeader();
        this.executeServerMethod('search').then(_ => this.inited$.next(true));
      });
    } else {
      this.inited$.next(true);
    }
  }

  ngOnDestroy() {
    super.ngOnDestroy();
  }

  updateHeader() {
    if (this.readonly) {
      const oldval = this.form.get('OldValue').value;
      this.header = `"${oldval.value}" используется в`;
    }
  }

  openUsedInPage(event) {
    this.router.navigate([event.Type, 'used', this.id]);
  }

  close() {
    this.form.markAsPristine();
    super.close();
  }

  async executeServerMethod(methodName: string) {

    this.ds.api.execute(this.type, methodName, this.form.getRawValue() as FormBase).pipe(take(1))
      .subscribe(value => {
        if (this.readonly) delete value.schema.SearchResult.SearchResult.Source;
        const form = getFormGroup(value.schema, value.model, true);
        form['metadata'] = value.metadata;
        super.Next(form);
        this.form.markAsDirty();
      });
  }
}

