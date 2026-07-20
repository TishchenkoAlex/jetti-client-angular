import { registerLocaleData } from '@angular/common';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import localeRUExtra from '@angular/common/locales/extra/ru';
import localeRU from '@angular/common/locales/ru';
import { LOCALE_ID, NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { ServiceWorkerModule } from '@angular/service-worker';
import { IPublicClientApplication, PublicClientApplication } from '@azure/msal-browser';
import { MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { definePreset } from '@primeng/themes';
import Aura from '@primeng/themes/aura';
import { providePrimeNG } from 'primeng/config';
import 'reflect-metadata';
import { take } from 'rxjs/operators';
import { environment, MsalConfiguration } from '../environments/environment';
import { ApiInterceptor } from './api.interceptor';
import { AppComponent } from './app.component';
import { AppMenuComponent, AppSubMenuComponent } from './app.menu.component';
import { RoutingModule } from './app.routing.module';
import { AppTopBarComponent } from './app.topbar.component';
import { AppProfileComponent } from './auth/app.profile.component';
import { AuthService } from './auth/auth.service';
import { MSAL_INSTANCE } from './auth/msal-instance';
import { MaterialModule } from './material.module';
import { calendarLocale, PrimeNGModule } from './primeNG.module';
import { DynamicFormsModule } from './UI/dynamic.froms.module';
import { UserFormsModule } from './UI/users.forms.module';

export function getJwtToken(): string {
  return localStorage.getItem('access_token') || '';
}

export function msalInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication(MsalConfiguration);
}

const JettiPreset = definePreset(Aura, {
  semantic: {
    primary: {
      50: '{blue.50}',
      100: '{blue.100}',
      200: '{blue.200}',
      300: '{blue.300}',
      400: '{blue.400}',
      500: '{blue.500}',
      600: '{blue.600}',
      700: '{blue.700}',
      800: '{blue.800}',
      900: '{blue.900}',
      950: '{blue.950}',
    },
  },
});

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
    MaterialModule,
    PrimeNGModule,
    MonacoEditorModule,
    DynamicFormsModule,
    UserFormsModule,
    RoutingModule,
    ServiceWorkerModule.register('/ngsw-worker.js', { enabled: environment.production }),
  ],
  providers: [
    { provide: LOCALE_ID, useValue: 'ru-RU' },
    AuthService,
    { provide: MSAL_INSTANCE, useFactory: msalInstanceFactory },
    { provide: HTTP_INTERCEPTORS, useClass: ApiInterceptor, multi: true },
    provideHttpClient(withInterceptorsFromDi()),
    providePrimeNG({
      translation: calendarLocale,
      theme: {
        preset: JettiPreset,
        options: {
          darkModeSelector: false,
        },
      },
    }),
  ],
  bootstrap: [AppComponent],
})
export class AppModule {

  constructor(private auth: AuthService) {
    registerLocaleData(localeRU, localeRUExtra);
    auth.getAccount().pipe(take(1)).subscribe();
  }
}
