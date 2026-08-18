import { HttpClient } from '@angular/common/http';
import { HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  BusinessProcessEvent,
  BusinessProcessInstance,
  BusinessProcessInstanceDetails,
  BusinessProcessStartResult,
  BusinessProcessTask,
  BusinessProcessTaskActionResult,
  MyTasksQuery,
  StartBusinessProcessRequest,
  TaskDecisionRequest,
  TaskDelegateRequest,
  TaskRedirectRequest,
} from '../models/business-process.models';

@Injectable({
  providedIn: 'root',
})
export class BusinessProcessApiService {
  constructor(private readonly http: HttpClient) {}

  getMyTasks(query?: MyTasksQuery): Observable<BusinessProcessTask[]> {
    return this.http.get<BusinessProcessTask[]>(this.buildUrl('/tasks/my'), {
      params: this.buildMyTasksParams(query)
    });
  }

  getTask(taskId: string): Observable<BusinessProcessTask> {
    return this.http.get<BusinessProcessTask>(
      this.buildUrl('/tasks/' + encodeURIComponent(taskId))
    );
  }

  startInstance(body: StartBusinessProcessRequest): Observable<BusinessProcessStartResult> {
    return this.http.post<BusinessProcessStartResult>(this.buildUrl('/instances/start'), body);
  }

  getInstance(instanceId: string): Observable<BusinessProcessInstanceDetails> {
    return this.http.get<BusinessProcessInstanceDetails>(
      this.buildUrl('/instances/' + encodeURIComponent(instanceId))
    );
  }

  getInstanceByObject(objectType: string, objectId: string): Observable<BusinessProcessInstance | null> {
    return this.http.get<BusinessProcessInstance | null>(
      this.buildUrl(
        '/instances/by-object/' + encodeURIComponent(objectType) + '/' + encodeURIComponent(objectId)
      )
    );
  }

  getEvents(instanceId: string): Observable<BusinessProcessEvent[]> {
    return this.http.get<BusinessProcessEvent[]>(
      this.buildUrl('/instances/' + encodeURIComponent(instanceId) + '/events')
    );
  }

  approveTask(taskId: string, body: TaskDecisionRequest): Observable<BusinessProcessTaskActionResult> {
    return this.http.post<BusinessProcessTaskActionResult>(
      this.buildUrl('/tasks/' + encodeURIComponent(taskId) + '/approve'),
      body
    );
  }

  rejectTask(taskId: string, body: TaskDecisionRequest): Observable<BusinessProcessTaskActionResult> {
    return this.http.post<BusinessProcessTaskActionResult>(
      this.buildUrl('/tasks/' + encodeURIComponent(taskId) + '/reject'),
      body
    );
  }

  redirectTask(taskId: string, body: TaskRedirectRequest): Observable<BusinessProcessTaskActionResult> {
    return this.http.post<BusinessProcessTaskActionResult>(
      this.buildUrl('/tasks/' + encodeURIComponent(taskId) + '/redirect'),
      body
    );
  }

  delegateTask(taskId: string, body: TaskDelegateRequest): Observable<BusinessProcessTaskActionResult> {
    return this.http.post<BusinessProcessTaskActionResult>(
      this.buildUrl('/tasks/' + encodeURIComponent(taskId) + '/delegate'),
      body
    );
  }

  private buildUrl(path: string): string {
    const base = environment.api.endsWith('/')
      ? environment.api.substring(0, environment.api.length - 1)
      : environment.api;

    return base + '/business-process' + path;
  }

  private buildMyTasksParams(query?: MyTasksQuery): HttpParams {
    let params = new HttpParams();
    if (!query) return params;
    if (query.status) params = params.set('status', query.status);
    if (query.includeCompleted !== undefined) params = params.set('includeCompleted', String(query.includeCompleted));
    if (query.limit !== undefined) params = params.set('limit', String(query.limit));
    return params;
  }
}
