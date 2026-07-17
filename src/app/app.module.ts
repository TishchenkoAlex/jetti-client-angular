import { registerLocaleData } from '@angular/common';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import localeRUExtra from '@angular/common/locales/extra/ru';
import localeRU from '@angular/common/locales/ru';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import {
  MSAL_GUARD_CONFIG,
  MSAL_INSTANCE,
  MSAL_INTERCEPTOR_CONFIG,
  MsalModule,
  MsalService,
} from '@azure/msal-angular';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { MonacoEditorModule } from 'ngx-monaco-editor';
import 'reflect-metadata';
import { take } from 'rxjs/operators';
import { environment, MsalConfiguration } from '../environments/environment';
import { MsalGuardConfig, MsalInterceptorConfig } from '../environments/msal-config';
import { ApiInterceptor } from './api.interceptor';
import { AppComponent } from './app.component';
import { AppMenuComponent, AppSubMenuComponent } from './app.menu.component';
import { RoutingModule } from './app.routing.module';
import { AppTopBarComponent } from './app.topbar.component';
import { AppProfileComponent } from './auth/app.profile.component';
import { AuthService } from './auth/auth.service';
import { MaterialModule } from './material.module';
import { PrimeNGModule } from './primeNG.module';
import { DynamicFormsModule } from './UI/dynamic.froms.module';
import { UserFormsModule } from './UI/users.forms.module';

export function getJwtToken(): string {
  return localStorage.getItem('access_token') || '';
}

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(MsalConfiguration);
}

@NgModule({
  declarations: [
    AppComponent,
    AppMenuComponent,
    AppSubMenuComponent,
    AppTopBarComponent,
    AppProfileComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    MaterialModule,
    PrimeNGModule,
    MonacoEditorModule.forRoot(),
    DynamicFormsModule,
    UserFormsModule,
    RoutingModule,
    MsalModule,
    ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production }),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'ru-RU' },
    AuthService,
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },
    { provide: MSAL_GUARD_CONFIG, useValue: MsalGuardConfig },
    { provide: MSAL_INTERCEPTOR_CONFIG, useValue: MsalInterceptorConfig },
    MsalService,
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true }
  ],
  entryComponents: [],
  bootstrap: [AppComponent]
})
export class AppModule {

  constructor(private auth: AuthService) {
    registerLocaleData(localeRU, localeRUExtra);
    auth.getAccount().pipe(take(1)).subscribe();
  }
}
