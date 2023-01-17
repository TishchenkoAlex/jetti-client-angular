import { Component, ChangeDetectionStrategy, OnInit, OnDestroy, Input, ChangeDetectorRef } from '@angular/core';
import { BaseDocFormComponentParent } from '../form/base.parent.form.component';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { DocService } from '../doc.service';
import { TabsStore } from '../tabcontroller/tabs.store';
import { DynamicFormService } from '../dynamic-form/dynamic-form.service';
import { LoadingService } from '../loading.service';
import { take } from 'rxjs/operators';
import { FormBase } from 'jetti-middle/dist';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'j-forms',
  templateUrl: './base.form.component.html'
})
export class BaseFormComponent extends BaseDocFormComponentParent implements OnInit, OnDestroy {

  @Input() id = Math.random().toString();

  constructor(
    public router: Router, public route: ActivatedRoute, public auth: AuthService,
    public ds: DocService, public tabStore: TabsStore, public dss: DynamicFormService,
    public lds: LoadingService, public cd: ChangeDetectorRef) {
    super(router, route, auth, ds, tabStore, dss, lds, cd);
  }

  async Execute() {
    this.ds.api.execute(this.type, 'Execute', this.form.getRawValue() as FormBase).pipe(take(1))
      .subscribe(data => {
        // this.form.patchValue(data);
      });
  }

}
