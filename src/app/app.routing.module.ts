import { Injectable, NgModule } from '@angular/core';
import { FormGroup } from '@angular/forms';
// tslint:disable-next-line:max-line-length
import { ActivatedRouteSnapshot, DetachedRouteHandle, Resolve, RouteReuseStrategy, RouterModule, RouterStateSnapshot, Routes } from '@angular/router';
import { AuthGuardService } from './auth/auth.guard.service';
import { DynamicFormService } from './common/dynamic-form/dynamic-form.service';
import { TabControllerComponent } from './common/tabcontroller/tabcontroller.component';
import { TabsStore } from './common/tabcontroller/tabs.store';
import { ApiService } from './services/api.service';
import { IViewModel } from 'jetti-middle/dist';

export class AppRouteReuseStrategy extends RouteReuseStrategy {
  shouldDetach(route: ActivatedRouteSnapshot): boolean { return false; }
  store(route: ActivatedRouteSnapshot, detachedTree: DetachedRouteHandle): void { }
  shouldAttach(route: ActivatedRouteSnapshot): boolean { return false; }
  retrieve(route: ActivatedRouteSnapshot): DetachedRouteHandle | null { return null; }
  shouldReuseRoute(future: ActivatedRouteSnapshot, curr: ActivatedRouteSnapshot): boolean {
    return true;
  }
}

@Injectable()
export class TabResolver implements Resolve<FormGroup | IViewModel | null> {
  constructor(private dfs: DynamicFormService, private api: ApiService, private tabStore: TabsStore) { }

  public resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
    const { type, id = '', group = '', used = '' } = route.params;
    if (type === 'home') return null;
    if (type.startsWith('Form.')) { return this.dfs.getFormView$(type); }
    const tabKey = { type, id, group, used };
    if (!this.tabStore.findTab(tabKey)) {
      return id ?
        this.dfs.getViewModel$(type, id, route.queryParams) :
        this.api.getView(type, { group, used });
    }
    return null;
  }
}

// tslint:disable:max-line-length
export const routes: Routes = [
  { path: ':type/:id', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type/used/:used', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type/group/:group', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy },
    AuthGuardService,
    TabResolver,
  ]
})
export class RoutingModule { }
