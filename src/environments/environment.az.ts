import { Configuration } from 'msal';
import { MsalAngularConfiguration } from '@azure/msal-angular';
import { arch } from './common';

const domain = 'https://api.azure.jetti-app.com'; // 'https://jetti-api.azurewebsites.net'; // 'http://localhost:3000';
const BPAPI = 'https://bp.x100-group.com/JettiProssscesses/hs';

export const environment = {
  production: false,
  api: `${domain}/api/`,
  auth: `${domain}/auth/`,
  socket: domain,
  host: domain,
  PowerBIURL: 'https://bi.x100-group.com/Reports/',
  title: 'Jetti [RU]',
  path: '',
  BPAPI,
  arch
};

const isIE = window.navigator.userAgent.indexOf('MSIE ') > -1 || window.navigator.userAgent.indexOf('Trident/') > -1;
export const protectedResourceMap: [string, string[]][] = [
  ['https://graph.microsoft.com/v1.0/me', ['user.read']]
];

export const MsalConfiguration: Configuration = {
  auth: {
    clientId: '8497b6af-a0c3-4b55-9e60-11bc8ff237e4',
    authority: 'https://login.microsoftonline.com/organizations',
    validateAuthority: true,
    navigateToLoginRequestUrl: true,
  },
  cache: {
    cacheLocation: 'localStorage',
    storeAuthStateInCookie: isIE, // set to true for IE 11
  },
};

export const MsalAngularConfig: MsalAngularConfiguration = {
  popUp: !isIE,
  consentScopes: [
    'user.read',
    'openid',
    'profile',
    'https://sm.azure.jetti-app.com/access_as_user'
  ],
  unprotectedResources: ['https://www.microsoft.com/en-us/'],
  protectedResourceMap,
  extraQueryParameters: {}
};
