import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BusinessProcessTemplate,
  BusinessProcessTemplateDraft
} from '../models/business-process-template.models';

@Injectable({ providedIn: 'root' })
export class BusinessProcessTemplateApiService {
  constructor(private readonly http: HttpClient) {}

  getTemplate(id: string): Observable<BusinessProcessTemplate> {
    return this.http.get<BusinessProcessTemplate>(this.buildUrl('/' + encodeURIComponent(id)));
  }

  createDraft(draft: BusinessProcessTemplateDraft): Observable<BusinessProcessTemplate> {
    return this.http.post<BusinessProcessTemplate>(this.buildUrl(''), draft);
  }

  updateDraft(id: string, draft: BusinessProcessTemplateDraft): Observable<BusinessProcessTemplate> {
    return this.http.put<BusinessProcessTemplate>(this.buildUrl('/' + encodeURIComponent(id)), draft);
  }

  validateDraft(draft: BusinessProcessTemplateDraft): Observable<{ valid: boolean }> {
    return this.http.post<{ valid: boolean }>(this.buildUrl('/validate'), draft);
  }

  private buildUrl(path: string): string {
    const base = environment.api.endsWith('/')
      ? environment.api.substring(0, environment.api.length - 1)
      : environment.api;
    return base + '/business-process/templates' + path;
  }
}
