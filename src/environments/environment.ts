import { Configuration, LogLevel } from 'msal';
import { IPublicClientApplication, PublicClientApplication, BrowserCacheLocation, InteractionType } from '@azure/msal-browser';
import { MsalGuardConfiguration, MsalInterceptorConfiguration } from '@azure/msal-angular';

const domain = 'http://localhost:3000'; // 'https://jetti-api.azurewebsites.net'; // 'http://localhost:3000';
const BPAPI = 'https://bp.x100-group.com/JettiProcesses/hs';

export const environment = {
  production: false,
  api: `${domain}/api/`,
  auth: `${domain}/auth/`,
  socket: domain,
  host: domain,
  PowerBIURL: 'https://bi.x100-group.com/Reports/',
  title: 'Jetti [DEV]',
  path: '',
  BPAPI
};

export function loggerCallback(logLevel: LogLevel, message: string) {
  console.log(message);
}

const isIE = window.navigator.userAgent.indexOf("MSIE ") > -1 || window.navigator.userAgent.indexOf("Trident/") > -1; // Remove this line to use Angular Universal

// MSAL instance to be passed to msal-angular
export function MSALInstanceFactory(): IPublicClientApplication {
  return new PublicClientApplication({
    auth: {
      clientId: '8497b6af-a0c3-4b55-9e60-11bc8ff237e4',
      authority: 'https://login.microsoftonline.com/b91c98b1-d543-428b-9469-f5f8f25bc37b',
      redirectUri: '/',
      postLogoutRedirectUri: '/'
    },
    cache: {
      cacheLocation: BrowserCacheLocation.LocalStorage,
      storeAuthStateInCookie: isIE, // set to true for IE 11     },
    }
  });
}

export function MSALGuardConfigFactory(): MsalGuardConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    authRequest: {
      scopes: ['user.read']
    },
    loginFailedRoute: '/'
  };
}

export const protectedResourceMap: [string, string[]][] = [
  ['https://graph.microsoft.com/v1.0/me', ['user.read']]
];

export function MSALInterceptorConfigFactory(): MsalInterceptorConfiguration {
  return {
    interactionType: InteractionType.Redirect,
    protectedResourceMap: protectedResourceMap as any
  };
}


export const MsalConfiguration: Configuration = {
  auth: {
    clientId: '8497b6af-a0c3-4b55-9e60-11bc8ff237e4',
    authority: 'https://login.microsoftonline.com/b91c98b1-d543-428b-9469-f5f8f25bc37b',
    validateAuthority: true,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: isIE, // set to true for IE 11
  },
};

// export const MsalAngularConfig: MsalAngularConfiguration = {
//   popUp: !isIE,
//   consentScopes: [
//     'user.read',
//     'openid',
//     'profile',
//     'https://sm.jetti-app.com/access_as_user'
//   ],
//   unprotectedResources: ['https://www.microsoft.com/en-us/'],
//   protectedResourceMap,
//   extraQueryParameters: {}
// };

