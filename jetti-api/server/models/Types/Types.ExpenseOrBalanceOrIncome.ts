import { RegisteredDocument } from '../documents.factory';
import { TypesBase } from './TypesBase';

export class TypesExpenseOrBalanceOrIncome extends TypesBase {

  getTypes() {
    const types = ['Catalog.Expense', 'Catalog.Balance', 'Catalog.Income'];
    return RegisteredDocument()
      .filter(d => types.includes(d.type))
      .map(e => e.type);
  }

}
