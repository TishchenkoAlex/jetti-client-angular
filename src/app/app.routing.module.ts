import { Injectable, NgModule } from '@angular/core';
// eslint-disable-next-line max-len
import { ActivatedRouteSnapshot, DetachedRouteHandle, RouteReuseStrategy, RouterModule, Routes } from '@angular/router';
import { environment } from '../environments/environment';
import { AuthGuardService } from './auth/auth.guard.service';
import { AuthCallbackComponent } from './auth/auth-callback.component';
import { DynamicFormService } from './common/dynamic-form/dynamic-form.service';
import { TabControllerComponent } from './common/tabcontroller/tabcontroller.component';
import { TabsStore } from './common/tabcontroller/tabs.store';
import { ApiService } from './services/api.service';

@Injectable()
export class AppRouteReuseStrategy extends RouteReuseStrategy {
  shouldDetach(): boolean {
    return false;
  }

  store(): void { }

  shouldAttach(): boolean {
    return false;
  }

  retrieve(): DetachedRouteHandle | null {
    return null;
  }

  shouldReuseRoute(): boolean {
    return true;
  }
}

@Injectable()
export class TabResolver {
  constructor(private dfs: DynamicFormService, private api: ApiService, private tabStore: TabsStore) { }

  public resolve(route: ActivatedRouteSnapshot) {
    const { type, id = '', group = '', used = '' } = route.params;
    if (type === 'home') return null;
    if (type.startsWith('Form.')) {
      return this.dfs.getFormView$(type);
    }
    const tabKey = { type, id, group, used };
    if (!this.tabStore.findTab(tabKey)) {
      return id ?
        this.dfs.getViewModel$(type, id, route.queryParams) :
        this.api.getView(type, { group, used });
    }
    return null;
  }
}

/* eslint-disable max-len */
const developmentRoutes: Routes = environment.production ? [] : [
  {
    path: 'business-process/bpmn-demo',
    loadComponent: () => import('./business-process/diagram/components/bpmn-editor-demo/bpmn-editor-demo.component')
      .then(module => module.BpmnEditorDemoComponent)
  }
];

export const routes: Routes = [
  ...developmentRoutes,
  { path: 'auth-callback-v2', component: AuthCallbackComponent },
  { path: ':type/:id', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type/used/:used', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: ':type/group/:group', component: TabControllerComponent, resolve: { detail: TabResolver }, canActivate: [AuthGuardService] },
  { path: '', redirectTo: 'home', pathMatch: 'full' },
  { path: '**', redirectTo: 'home' }
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {})],
  exports: [RouterModule],
  providers: [
    { provide: RouteReuseStrategy, useClass: AppRouteReuseStrategy },
    AuthGuardService,
    TabResolver,
  ]
})
export class RoutingModule { }
