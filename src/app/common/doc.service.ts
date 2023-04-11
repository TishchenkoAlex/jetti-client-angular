import { Injectable } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Subject } from 'rxjs';
import { ApiService } from '../services/api.service';
import { FormGroup } from '@angular/forms';
import { DocumentBase } from 'jetti-middle/dist';

@Injectable()
export class DocService {

  private readonly _save$ = new Subject<DocumentBase>();
  save$ = this._save$.asObservable();

  private readonly _post$ = new Subject<DocumentBase>();
  post$ = this._post$.asObservable();

  private readonly _postById$ = new Subject<DocumentBase>();
  postById$ = this._postById$.asObservable();

  private readonly _unpost$ = new Subject<DocumentBase>();
  unpost$ = this._unpost$.asObservable();

  private readonly _unpostById$ = new Subject<DocumentBase>();
  unpostById$ = this._unpostById$.asObservable();

  private readonly _delete$ = new Subject<DocumentBase>();
  delete$ = this._delete$.asObservable();

  private readonly _close$ = new Subject<{ url: string, skip?: boolean }>();
  close$ = this._close$.asObservable();

  private readonly _saveClose$ = new Subject<DocumentBase>();
  saveClose$ = this._saveClose$.asObservable();

  private readonly _goto$ = new Subject<DocumentBase>();
  goto$ = this._goto$.asObservable();

  private readonly _do$ = new Subject<DocumentBase>();
  do$ = this._do$.asObservable();

  private readonly _showDialog$ = new Subject<{ uuid: string, doc: DocumentBase }>();
  showDialog$ = this._showDialog$.asObservable();

  private readonly _workflow$ = new Subject<DocumentBase>();
  workflow$ = this._workflow$.asObservable();

  private readonly _form$ = new Subject<FormGroup>();
  form$ = this._form$.asObservable();

  constructor(public api: ApiService, private messageService: MessageService, public confirmationService: ConfirmationService) { }

  async save(doc: DocumentBase) {
    const savedDoc = await this.api.saveDoc(doc).toPromise();
    this.openSnackBar('success', savedDoc.description, 'saved');
    const subject$ = this._save$;
    subject$.next(savedDoc);
  }

  async post(doc: DocumentBase, close = false) {
    const postedDoc = await this.api.savePostDoc(doc).toPromise();
    this.showOnPostDocMessage(postedDoc);
    const subject$ = close ? this._saveClose$ : this._post$;
    subject$.next(postedDoc);
  }

  async unpost(doc: DocumentBase, close = false) {
    const postedDoc = await this.api.unpostDocById(doc.id).toPromise();
    this.openSnackBar('success', doc.description, postedDoc.posted ? 'posted' : 'unposted');
    const subject$ = close ? this._saveClose$ : this._unpost$;
    subject$.next(postedDoc);
  }

  async delete(id: string) {
    const deletedDoc = await this.api.deleteDoc(id).toPromise();
    this._delete$.next(deletedDoc);
    this.openSnackBar('success', deletedDoc.description, deletedDoc.deleted ? 'deleted' : 'undeleted');
  }

  async posById(id: string) {
    const postedDoc = await this.api.postDocById(id).toPromise();
    this._postById$.next(postedDoc);
    return postedDoc;
  }

  async unpostById(id: string) {
    const postedDoc = await this.api.unpostDocById(id).toPromise();
    this._unpostById$.next(postedDoc);
    return postedDoc;
  }

  async startWorkFlow(id: string) {
    const workflow = await this.api.startWorkFlow(id).toPromise();
    return workflow;
  }

  async form(value: FormGroup) {
    this._form$.next(value);
  }

  openSnackBar(severity: string, summary: string, detail: string) {
    this.messageService.add({ severity, summary, detail, key: '1' });
  }

  showOnPostDocMessage(doc: DocumentBase) {
    this.openSnackBar('success', doc.description, doc.posted ? 'posted' : 'unposted');
  }

  showDialog(uuid: string, doc: DocumentBase) {
    this._showDialog$.next({ uuid, doc });
  }

  download(data: BlobPart, filename: string, type = 'text/xml') {
    const file = new Blob([data], { type: type });
    const anyNav: any = window.navigator;
    if (anyNav.msSaveOrOpenBlob) // IE10+
      anyNav.msSaveOrOpenBlob(file, filename);
    else { // Others
      const a = document.createElement('a'),
        url = URL.createObjectURL(file);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(function () {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
      }, 0);
    }
  }

}
