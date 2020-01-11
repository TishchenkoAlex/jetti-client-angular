import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { _baseDocFormComponent } from 'src/app/common/form/_base.form.component';
import { Router, ActivatedRoute } from '@angular/router';
import { LoadingService } from 'src/app/common/loading.service';
import { AuthService } from 'src/app/auth/auth.service';
import { DocService } from 'src/app/common/doc.service';
import { TabsStore } from 'src/app/common/tabcontroller/tabs.store';
import { BPApi } from 'src/app/services/bpapi.service';
import { DynamicFormService } from 'src/app/common/dynamic-form/dynamic-form.service';
import { DocumentBase } from '../../../../../../jetti-api/server/models/document';
import { take } from 'rxjs/operators';

@Component({
  selector: 'doc-CashRequest',
  templateUrl: 'Document.CashRequest.html'
})
export class DocumentCashRequestComponent extends _baseDocFormComponent implements OnInit, OnDestroy {
  get readonlyMode() { return !this.isNew && this.Form.get('Status').value !== 'PREPARED'; }

  constructor(public router: Router, public route: ActivatedRoute, public lds: LoadingService, public auth: AuthService,
    public cd: ChangeDetectorRef, public ds: DocService, public tabStore: TabsStore,
    private bpApi: BPApi, public dss: DynamicFormService) {
    super(router, route, auth, ds, tabStore, dss, cd);
  }

  ngOnInit() {
    super.ngOnInit();

    if (this.isNew) {
      this.Form.get('Status').setValue('PREPARED');
      this.Form.get('workflowID').setValue('');
      this.Form.get('Operation').setValue('Оплата поставщику');
    }

    if (this.readonlyMode) { this.Form.disable({ emitEvent: false }); }

    this.onOperationChanges(this.Form.get('Operation').value);
  }


  onOperationChanges(operation: string) {

    // 'Оплата поставщику',
    // 'Перечисление налогов и взносов',
    // 'Оплата ДС в другую организацию',
    // 'Выдача ДС подотчетнику',
    // 'Оплата по кредитам и займам полученным',
    // 'Прочий расход ДС',
    // 'Выдача займа контрагенту',
    // 'Возврат оплаты клиенту'
    // 'Выплата заработной платы'
    this.vk['PayRollKind'].required = operation === 'Выплата заработной платы';
    this.vk['CashOrBankIn'].required = operation === 'Оплата ДС в другую организацию';
    this.vk['BalanceAnalytics'].required = operation === 'Перечисление налогов и взносов';

    this.vk['PaymentKind'].required =
      `Выплата заработной платы
      Оплата по кредитам и займам полученным`.indexOf(operation) !== -1;

    this.vk['CashOrBank'].required =
      `Выплата заработной платы
      Оплата ДС в другую организацию`.indexOf(operation) !== -1;

    this.vk['CashRecipient'].required =
      `Оплата поставщику
      Перечисление налогов и взносов
      Оплата ДС в другую организацию
      Выдача ДС подотчетнику
      Оплата по кредитам и займам полученным
      Выдача займа контрагенту
      Возврат оплаты клиенту`.indexOf(operation) !== -1;

    this.vk['Contract'].required =
      `Оплата поставщику
      Возврат оплаты клиенту`.indexOf(operation) !== -1;

    this.vk['ExpenseOrBalance'].required =
      `Перечисление налогов и взносов
      Прочий расход ДС`.indexOf(operation) !== -1;

    this.vk['Loan'].required =
      `Оплата по кредитам и займам полученным
      Выдача займа контрагенту`.indexOf(operation) !== -1;

    this.Form.markAsTouched();
  }

  onCashKindChange(event) {

    let CashKindType = '';
    if (event === 'BANK') {
      CashKindType = 'Catalog.BankAccount';
    } else {
      CashKindType = 'Catalog.CashRegister';
    }

    this.Form.get('CashOrBank').setValue(
      { id: null, code: null, type: CashKindType, value: null },
      { onlySelf: false, emitEvent: false }
    );
  }

  StartProcess() {
    this.bpApi.StartProcess(this.viewModel as DocumentBase, this.metadata.type).pipe(take(1)).subscribe(data => {
      this.Form.get('workflowID').setValue(data);
      this.Form.get('Status').setValue('AWAITING');
      this.post();
      this.Form.disable({ emitEvent: false });
      this.ds.openSnackBar('success', 'process started', 'Процесс согласования стартован');
    });
  }

}
