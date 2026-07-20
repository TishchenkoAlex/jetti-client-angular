import { Configuration } from '@azure/msal-browser';
import { createMsalConfiguration } from './msal-config';

const domain = 'http://api.arch.jetti-app.com'; // 'https://jetti-api.azurewebsites.net'; // 'http://localhost:3000';
const BPAPI = 'https://bp.x100-group.com/JettiProssscesses/hs';

export const environment = {
  production: false,
  AUTH_TOKEN: '',
  api: `${domain}/api/`,
  auth: `${domain}/auth/`,
  socket: domain,
  host: domain,
  PowerBIURL: 'https://bi.x100-group.com/Reports/',
  title: 'Jetti [RU]',
  path: '',
  BPAPI
};

export const MsalConfiguration: Configuration = createMsalConfiguration(
  'https://login.microsoftonline.com/organizations'
);
