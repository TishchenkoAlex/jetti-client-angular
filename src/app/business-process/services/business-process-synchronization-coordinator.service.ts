import { Injectable } from '@angular/core';

import { BusinessProcessValidationIssue } from '../models/business-process-route-graph.models';

export type BusinessProcessSynchronizationOrigin = 'TABLES' | 'DIAGRAM' | 'LOAD' | 'SAVE';
export type BusinessProcessSynchronizationStatus = 'IDLE' | 'RUNNING' | 'ERROR';

export interface BusinessProcessSynchronizationFingerprint {
  routeHash?: string;
  xmlHash?: string;
  resourceVersion?: string;
}

export interface BusinessProcessSynchronizationToken {
  generation: number;
  origin: BusinessProcessSynchronizationOrigin;
  fingerprint: BusinessProcessSynchronizationFingerprint;
}

export interface BusinessProcessSynchronizationDecision {
  accepted: boolean;
  duplicate: boolean;
  token?: BusinessProcessSynchronizationToken;
}

export interface BusinessProcessSynchronizationState {
  generation: number;
  status: BusinessProcessSynchronizationStatus;
  activeOrigin?: BusinessProcessSynchronizationOrigin;
  lastCompletedOrigin?: BusinessProcessSynchronizationOrigin;
  lastRouteHash?: string;
  lastXmlHash?: string;
  lastResourceVersion?: string;
  diagnostics: BusinessProcessValidationIssue[];
}

@Injectable()
export class BusinessProcessSynchronizationCoordinator {
  private generation = 0;
  private active?: BusinessProcessSynchronizationToken;
  private state: BusinessProcessSynchronizationState = this.initialState();

  reset(): void {
    this.generation = 0;
    this.active = undefined;
    this.state = this.initialState();
  }

  begin(
    origin: BusinessProcessSynchronizationOrigin,
    fingerprint: BusinessProcessSynchronizationFingerprint = {}
  ): BusinessProcessSynchronizationDecision {
    if (this.isDuplicate(origin, fingerprint)) return { accepted: false, duplicate: true };

    const previous = this.active;
    const token: BusinessProcessSynchronizationToken = {
      generation: ++this.generation,
      origin,
      fingerprint: { ...fingerprint }
    };
    this.active = token;
    this.state = {
      ...this.state,
      generation: token.generation,
      status: 'RUNNING',
      activeOrigin: origin
    };

    if (previous && previous.origin !== origin) {
      this.addDiagnostic({
        severity: 'warning',
        code: 'SYNC_OPERATION_SUPERSEDED',
        path: '$.synchronization',
        message: `${previous.origin} generation ${previous.generation} was superseded by ${origin} generation ${token.generation}`
      });
    }
    return { accepted: true, duplicate: false, token };
  }

  complete(
    token: BusinessProcessSynchronizationToken,
    fingerprint: BusinessProcessSynchronizationFingerprint = token.fingerprint
  ): boolean {
    if (!this.isCurrent(token)) return false;

    this.active = undefined;
    this.state = {
      ...this.state,
      generation: token.generation,
      status: 'IDLE',
      activeOrigin: undefined,
      lastCompletedOrigin: token.origin,
      lastRouteHash: fingerprint.routeHash || this.state.lastRouteHash,
      lastXmlHash: fingerprint.xmlHash || this.state.lastXmlHash,
      lastResourceVersion: fingerprint.resourceVersion || this.state.lastResourceVersion
    };
    return true;
  }

  fail(
    token: BusinessProcessSynchronizationToken,
    code: string,
    message: string,
    path = '$.synchronization'
  ): boolean {
    if (!this.isCurrent(token)) return false;

    this.active = undefined;
    this.state = {
      ...this.state,
      generation: token.generation,
      status: 'ERROR',
      activeOrigin: undefined
    };
    this.addDiagnostic({ severity: 'error', code, path, message });
    return true;
  }

  cancel(token: BusinessProcessSynchronizationToken, reason: string): boolean {
    if (!this.isCurrent(token)) return false;

    this.active = undefined;
    this.state = {
      ...this.state,
      generation: token.generation,
      status: 'IDLE',
      activeOrigin: undefined
    };
    this.addDiagnostic({
      severity: 'warning',
      code: 'SYNC_OPERATION_CANCELLED',
      path: '$.synchronization',
      message: `${token.origin} generation ${token.generation} was cancelled: ${reason}`
    });
    return true;
  }

  discardStale(token: BusinessProcessSynchronizationToken): void {
    if (this.isCurrent(token)) return;
    this.addDiagnostic({
      severity: 'warning',
      code: 'SYNC_STALE_RESULT_IGNORED',
      path: '$.synchronization',
      message: `${token.origin} generation ${token.generation} result was ignored because it is no longer current`
    });
  }

  seed(fingerprint: BusinessProcessSynchronizationFingerprint): void {
    this.state = {
      ...this.state,
      lastRouteHash: fingerprint.routeHash || this.state.lastRouteHash,
      lastXmlHash: fingerprint.xmlHash || this.state.lastXmlHash,
      lastResourceVersion: fingerprint.resourceVersion || this.state.lastResourceVersion
    };
  }

  isCurrent(token: BusinessProcessSynchronizationToken | undefined): boolean {
    return !!token && !!this.active
      && token.generation === this.active.generation
      && token.origin === this.active.origin;
  }

  isOrigin(origin: BusinessProcessSynchronizationOrigin): boolean {
    return this.active?.origin === origin;
  }

  activeToken(origin?: BusinessProcessSynchronizationOrigin): BusinessProcessSynchronizationToken | undefined {
    if (!this.active || (origin && this.active.origin !== origin)) return undefined;
    return this.active;
  }

  xmlHash(xml: string): string {
    return this.hash(String(xml || ''));
  }

  snapshot(): BusinessProcessSynchronizationState {
    return {
      ...this.state,
      diagnostics: this.state.diagnostics.map(issue => ({ ...issue }))
    };
  }

  private isDuplicate(
    origin: BusinessProcessSynchronizationOrigin,
    fingerprint: BusinessProcessSynchronizationFingerprint
  ): boolean {
    if (this.active) return false;
    if (origin === 'TABLES' && fingerprint.routeHash) {
      return fingerprint.routeHash === this.state.lastRouteHash;
    }
    if (origin === 'DIAGRAM' && fingerprint.xmlHash) {
      return fingerprint.xmlHash === this.state.lastXmlHash;
    }
    if ((origin === 'LOAD' || origin === 'SAVE') && fingerprint.resourceVersion) {
      return fingerprint.resourceVersion === this.state.lastResourceVersion;
    }
    return false;
  }

  private addDiagnostic(issue: BusinessProcessValidationIssue): void {
    const duplicate = this.state.diagnostics.some(current => current.code === issue.code
      && current.message === issue.message);
    if (duplicate) return;
    this.state = {
      ...this.state,
      diagnostics: [...this.state.diagnostics.slice(-19), issue]
    };
  }

  private hash(value: string): string {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index++) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(16).padStart(8, '0');
  }

  private initialState(): BusinessProcessSynchronizationState {
    return { generation: 0, status: 'IDLE', diagnostics: [] };
  }
}
