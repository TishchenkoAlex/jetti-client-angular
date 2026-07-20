import { HttpClient } from '@angular/common/http';
import { Inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { IPublicClientApplication } from '@azure/msal-browser';
import { BehaviorSubject, from, Observable, of } from 'rxjs';
import { filter, map, shareReplay, switchMap, take, tap } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { MSAL_LOGIN_SCOPES } from 'src/environments/msal-config';
import jwt_decode, { JwtPayload } from 'jwt-decode';
import { IAccount, ILoginResponse } from 'jetti-middle/dist';
import { MSAL_INSTANCE } from './msal-instance';
export const ANONYMOUS_USER: ILoginResponse = { account: undefined, token: '', photo: undefined };

@Injectable()
export class AuthService {

  private readonly _userProfile$ = new BehaviorSubject<ILoginResponse | undefined>(undefined);
  userProfile$ = this._userProfile$.asObservable().pipe(filter((u: ILoginResponse) => !!u));
  isLoggedIn$ = this.userProfile$.pipe(map(p => p.account !== undefined));
  isLoggedOut$ = this.isLoggedIn$.pipe(map(isLoggedIn => !isLoggedIn));

  isAdmin$ = this.userProfile$.pipe(map(u => u.account.isAdmin));
  userRoles$ = this.userProfile$.pipe(map(u => u.account.roles));
  get userProfile() { return this._userProfile$.value; }
  get userEmail() { return this.tokenPayload ? this.tokenPayload['email'] : ''; }
  get token() { return this.environmentToken || localStorage.getItem('jetti_token') || ''; }
  set token(value) {
    if (!this.environmentToken) localStorage.setItem('jetti_token', value);
  }
  get tokenPayload() { return jwt_decode<JwtPayload>(this.token); }

  private get environmentToken(): string {
    if (environment.production) return '';
    return (environment.AUTH_TOKEN || '').trim().replace(/^Bearer\s+/i, '');
  }

  constructor(
    private router: Router,
    private http: HttpClient,
    @Inject(MSAL_INSTANCE) private msalInstance: IPublicClientApplication
  ) { }

  public login() {
    if (this.environmentToken) return this.getAccount().pipe(shareReplay());

    return from(this.msalInstance.loginPopup({ scopes: MSAL_LOGIN_SCOPES })).pipe(
      switchMap(loginResult => {
        if (!loginResult.account) {
          throw new Error('Microsoft authentication did not return an account.');
        }

        this.msalInstance.setActiveAccount(loginResult.account);
        return from(this.msalInstance.acquireTokenSilent({
          account: loginResult.account,
          scopes: MSAL_LOGIN_SCOPES,
        }));
      }),
      switchMap(tokenResult => {
        const account = tokenResult.account || this.getMsalAccount();
        if (!account) {
          throw new Error('Microsoft authentication account is not available.');
        }

        return this.http.post<ILoginResponse>(`${environment.auth}login`, {
          email: account.username,
          password: null,
          token: tokenResult.accessToken,
          timezoneOffset: (new Date).getTimezoneOffset()
        });
      }),
      shareReplay(),
      tap(loginResponse => this.init(loginResponse))
    );
  }

  public logout() {
    localStorage.removeItem('jetti_token');
    if (!this.environmentToken) {
      const account = this.getMsalAccount();
      if (account) {
        from(this.msalInstance.logoutPopup({ account })).pipe(take(1)).subscribe();
      }
    }
    this._userProfile$.next({ ...ANONYMOUS_USER });
    return this.router.navigate([''], { queryParams: {} });
  }

  public getAccount(): Observable<ILoginResponse> {
    if (!this.token) {
      const anonymousUser = { ...ANONYMOUS_USER };
      this._userProfile$.next(anonymousUser);
      return of(anonymousUser);
    }

    return this.http.get<IAccount>(`${environment.auth}account`).pipe(
      map(account => ({ account, token: this.token, photo: null })),
      tap(loginResponse => this.init(loginResponse))
    );
  }

  public isRoleAvailable(roleName: string): boolean {
    if (!this.token) return false;
    const token = this.tokenPayload as { roles: string[] };
    return token.roles.includes(roleName);
  }

  public getUserView(envKey: string): string {
    if (!this.token || !envKey) return '';
    return this.tokenPayload['env']['view'];
  }

  public getUserEnviromentSettingsValueByKey(envKey: string): string {
    if (!this.token || !envKey) return '';
    return this.tokenPayload['env']['settings'][envKey];
  }

  public getCurrentContour() {
    return this.getUserEnviromentSettingsValueByKey('contour');
  }

  public getCurrentLink() {
    return this.getUserEnviromentSettingsValueByKey('link');
  }

  public LOGIC_USECASHREQUESTAPPROVING(): boolean {
    return false; // this.getUserEnviromentSettingsValueByKey('LOGIC_USECASHREQUESTAPPROVING') === '1';
  }

  public isRoleAvailableReadonly(): boolean {
    return this.isRoleAvailable('Readonly');
  }

  public isRoleAvailableAllColumns(): boolean {
    return this.isRoleAvailable('All columns');
  }

  public isRoleAvailableDepartmentCompanyEditor(): boolean {
    return this.isRoleAvailable('Department company editor');
  }

  public isRoleAvailableOperationRulesDesigner(): boolean {
    return this.isRoleAvailable('Operation rules designer');
  }

  public isRoleAvailableCompanyEditor(): boolean {
    return this.isRoleAvailable('Company editor');
  }

  public isRoleAvailableDepartmentEditor(): boolean {
    return this.isRoleAvailable('Department editor');
  }

  public isRoleAvailableResponsibilityCenterEditor(): boolean {
    return this.isRoleAvailable('Responsibility center editor');
  }

  public isRoleAvailableCashRequestAdmin(): boolean {
    return this.isRoleAvailable('Cash request admin');
  }

  public isRoleAvailableCashRequestCommentEditor(): boolean {
    return this.isRoleAvailable('Cash request comment editor');
  }

  public isRoleAvailableCashRequestApprover(): boolean {
    return this.isRoleAvailable('Cash request approver');
  }

  public isRoleAvailableCommonDataEditor(): boolean {
    return this.isRoleAvailable('Common data editor');
  }

  public isRoleAvailableReadonlyCompanyContourEditor(): boolean {
    return this.isRoleAvailable('Readonly company contour editor');
  }

  public isRoleAvailableTester(): boolean {
    return true; // this.isRoleAvailable('New features tester');
  }

  private init(loginResponse: ILoginResponse) {
    if (loginResponse.token && loginResponse.account) {
      if (loginResponse.photo !== null) localStorage.setItem('photo', loginResponse.photo);
      this.token = loginResponse.token;
      this._userProfile$.next(loginResponse);
    }
  }

  private getMsalAccount() {
    return this.msalInstance.getActiveAccount() || this.msalInstance.getAllAccounts()[0];
  }
}
