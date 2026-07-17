import { Configuration } from '@azure/msal-browser';
import { createMsalConfiguration } from './msal-config';

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

export const MsalConfiguration: Configuration = createMsalConfiguration(
  'https://login.microsoftonline.com/b91c98b1-d543-428b-9469-f5f8f25bc37b'
);

