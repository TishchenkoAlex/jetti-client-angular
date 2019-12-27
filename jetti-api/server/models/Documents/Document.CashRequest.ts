import { DocumentBase, JDocument, Props, Ref } from '../document';

@JDocument({
  type: 'Document.CashRequest',
  description: 'Заявка на расходование ДС',
  dimensions: [
    { Status: 'enum' },
    { Document: 'Types.Object' },
    { user: 'Catalog.User' },
  ],
  icon: 'fa fa-file-text-o',
  menu: 'Заявка на ДС',
  prefix: 'CR-',
  copyTo: [
    'Document.Operation'
  ],
  relations: [
    { name: 'Operations', type: 'Document.Operation', field: 'parent' }
  ]
})
export class DocumentCashRequest extends DocumentBase {

  @Props({ type: 'Types.Document', hiddenInList: true, order: -1 })
  parent: Ref = null;

  @Props({ type: 'Catalog.User', hiddenInList: false, order: -1 })
  user: Ref = null;

  @Props({
    type: 'enum', required: true, value: [
      'PREPARED',
      'AWAITING',
      'APPROVED',
      'REJECTED',
    ]
  })
  Status = 'PREPARED';

  @Props({
    type: 'enum', required: true, value: [
      'Оплата поставщику',
      'Перечисление налогов и взносов',
      'Оплата ДС в другую организацию',
      'Выдача ДС подотчетнику',
      'Оплата по кредитам и займам полученным',
      'Прочий расход ДС',
      'Выдача займа контрагенту',
      'Возврат оплаты клиенту'
    ]
  })
  Operation = 'Оплата поставщику';

  @Props({
    type: 'enum', value: [
      'BODY',
      'PERCENT',
      'SHARE',
      'CUSTOM1'
    ]
  })
  PaymentKind = 'BODY';

  @Props({
    type: 'enum', required: true,  value: [
      'CASH',
      'BANK',
      'ANY'
    ]
  })
  CashKind = 'ANY';

  @Props({ type: 'Catalog.Department' })
  Department: Ref = null;

  @Props({ type: 'Types.CashRecipient', required: true })
  CashRecipient: Ref = null;

  @Props({
    type: 'Catalog.Contract', required: true, owner: [
      { dependsOn: 'CashRecipient', filterBy: 'owner' },
      { dependsOn: 'company', filterBy: 'company' },
      { dependsOn: 'currency', filterBy: 'currency' }]
  })
  Contract: Ref = null;

  @Props({ type: 'Catalog.CashFlow', required: true })
  CashFlow: Ref = null;

  @Props({
    type: 'Catalog.Loan', owner: [
      { dependsOn: 'CashRecipient', filterBy: 'owner' },
      { dependsOn: 'company', filterBy: 'company' },
      { dependsOn: 'currency', filterBy: 'currency' }]
  })
  Loan: Ref = null;

  @Props({
    type: 'Types.CashOrBank',
    owner: [
      { dependsOn: 'company', filterBy: 'company' },
      { dependsOn: 'сurrency', filterBy: 'currency' }
    ]
  })
  CashOrBank: Ref = null;

  @Props({
    type: 'Catalog.Counterpartie.BankAccount',
    owner: [
      { dependsOn: 'CashRecipient', filterBy: 'owner' },
      { dependsOn: 'сurrency', filterBy: 'currency' }
    ]
  })
  CashRecipientBankAccount: Ref = null;

  @Props({
    type: 'Types.CashOrBank',
    owner: [
      { dependsOn: 'сurrency', filterBy: 'currency' }
    ]
  })
  CashOrBankIn: Ref = null;

  @Props({ type: 'date' })
  PayDay = new Date();

  @Props({ type: 'number', required: true, style: { width: '50px' } })
  Amount = 0;

  @Props({ type: 'Catalog.Currency', required: true })
  сurrency: Ref = null;

  @Props({ type: 'Types.ExpenseOrBalance' })
  ExpenseOrBalance: Ref = null;

  @Props({ type: 'Catalog.Expense.Analytics' })
  ExpenseAnalytics: Ref = null;

  @Props({ type: 'Catalog.Balance.Analytics' })
  BalanceAnalytics: Ref = null;

  @Props({ type: 'string' })
  workflowID = '';
}
