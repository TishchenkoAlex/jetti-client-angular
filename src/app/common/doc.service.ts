import { Injectable } from '@angular/core';
import { ConfirmationService, MessageService } from 'primeng/api';
import { firstValueFrom, Subject } from 'rxjs';
import { ApiService } from '../services/api.service';
import { UntypedFormGroup } from '@angular/forms';
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

  private readonly _deleteById$ = new Subject<DocumentBase>();
  deleteById$ = this._deleteById$.asObservable();

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

  private readonly _form$ = new Subject<UntypedFormGroup>();
  form$ = this._form$.asObservable();

  constructor(public api: ApiService, private messageService: MessageService, public confirmationService: ConfirmationService) { }

  async save(doc: DocumentBase) {
    const savedDoc = await firstValueFrom(this.api.saveDoc(doc));
    this.openSnackBar('success', savedDoc.description, 'saved');
    const subject$ = this._save$;
    subject$.next(savedDoc);
  }

  async post(doc: DocumentBase, close = false) {
    const postedDoc = await firstValueFrom(this.api.savePostDoc(doc));
    this.showOnPostDocMessage(postedDoc);
    const subject$ = close ? this._saveClose$ : this._post$;
    subject$.next(postedDoc);
  }

  async unpost(doc: DocumentBase, close = false) {
    const postedDoc = await firstValueFrom(this.api.unpostDocById(doc.id));
    this.openSnackBar('success', doc.description, postedDoc.posted ? 'posted' : 'unposted');
    const subject$ = close ? this._saveClose$ : this._unpost$;
    subject$.next(postedDoc);
  }

  async delete(id: string) {
    const deletedDoc = await firstValueFrom(this.api.deleteDoc(id));
    this._delete$.next(deletedDoc);
    this.openSnackBar('success', deletedDoc.description, deletedDoc.deleted ? 'deleted' : 'undeleted');
  }

  async deleteById(id: string) {
    const deletedDoc = await firstValueFrom(this.api.deleteDoc(id));
    this._deleteById$.next(deletedDoc);
    this.openSnackBar('success', deletedDoc.description, deletedDoc.deleted ? 'deleted' : 'undeleted');
  }

  async posById(id: string) {
    const postedDoc = await firstValueFrom(this.api.postDocById(id));
    this._postById$.next(postedDoc);
    return postedDoc;
  }

  async unpostById(id: string) {
    const postedDoc = await firstValueFrom(this.api.unpostDocById(id));
    this._unpostById$.next(postedDoc);
    return postedDoc;
  }

  async startWorkFlow(id: string) {
    const workflow = await firstValueFrom(this.api.startWorkFlow(id));
    return workflow;
  }

  async form(value: UntypedFormGroup) {
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

  async copyToClipboard(data: BlobPart | BlobPart[], type = 'text/plain'): Promise<void> {
    const parts = Array.isArray(data) ? data : [data];
    const blob = new Blob(parts, { type });
    const text = await this.blobToText(blob);

    const nav: any = window.navigator;

    if (nav.clipboard && nav.clipboard.writeText && window.isSecureContext) {
      await nav.clipboard.writeText(text);
      return;
    }

    this.fallbackCopyTextToClipboard(text);
  }

  private blobToText(blob: Blob): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = () => resolve(String(reader.result || ''));
      reader.onerror = () => reject(reader.error);

      reader.readAsText(blob);
    });
  }


  private fallbackCopyTextToClipboard(text: string): void {
    const textarea = document.createElement('textarea');

    textarea.value = text;
    textarea.setAttribute('readonly', '');

    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '0';
    textarea.style.opacity = '0';

    document.body.appendChild(textarea);

    textarea.focus();
    textarea.select();

    const copied = document.execCommand('copy');

    document.body.removeChild(textarea);

    if (!copied) {
      throw new Error('Failed to copy data to clipboard');
    }
  }

}
