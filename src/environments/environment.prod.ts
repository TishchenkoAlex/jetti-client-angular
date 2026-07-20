// ng build --prod --aot && firebase deploy --only hosting:x100
import { Configuration } from '@azure/msal-browser';
import { createMsalConfiguration } from './msal-config';

const domain = 'https://sm.jetti-app.com';
const BPAPI = 'https://bp.x100-group.com/JettiProcesses/hs';

export const environment = {
  production: true,
  AUTH_TOKEN: '',
  api: `${domain}/api/`,
  auth: `${domain}/auth/`,
  socket: domain,
  host: domain,
  PowerBIURL: 'https://bi.x100-group.com/Reports/',
  title: 'Jetti (C1)',
  path: '',
  BPAPI
};

export const MsalConfiguration: Configuration = createMsalConfiguration(
  'https://login.microsoftonline.com/organizations'
);

