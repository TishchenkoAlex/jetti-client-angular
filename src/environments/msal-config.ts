import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';
import { Configuration, InteractionType } from '@azure/msal-browser';

export const MSAL_LOGIN_SCOPES = ['user.read'];

export function createMsalConfiguration(authority: string): Configuration {
  const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 ||
    window.navigator.userAgent.indexOf('Trident/') > -1;

  return {
    auth: {
      clientId: '8497b6af-a0c3-4b55-9e60-11bc8ff237e4',
      authority,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: isIE,
    },
  };
}

export const MsalGuardConfig: MsalGuardConfiguration = {
  interactionType: InteractionType.Popup,
  authRequest: {
    scopes: MSAL_LOGIN_SCOPES,
  },
};

export const MsalInterceptorConfig: MsalInterceptorConfiguration = {
  interactionType: InteractionType.Popup,
  protectedResourceMap: new Map([
    ['https://graph.microsoft.com/v1.0/me', MSAL_LOGIN_SCOPES],
  ]),
};
