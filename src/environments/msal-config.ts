import { Configuration } from '@azure/msal-browser';

export const MSAL_LOGIN_SCOPES = ['user.read'];

export function createMsalConfiguration(authority: string): Configuration {
  const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 ||
    window.navigator.userAgent.indexOf('Trident/') > -1;

  return {
    auth: {
      clientId: '8497b6af-a0c3-4b55-9e60-11bc8ff237e4',
      authority,
      redirectUri: window.location.origin,
      postLogoutRedirectUri: window.location.origin,
      navigateToLoginRequestUrl: true,
    },
    cache: {
      cacheLocation: 'localStorage',
      storeAuthStateInCookie: isIE,
    },
  };
}
