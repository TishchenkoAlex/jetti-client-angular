// ng build --configuration smv && firebase deploy --only hosting:smv
import { Configuration } from '@azure/msal-browser';
import { createMsalConfiguration } from './msal-config';

const domain = 'https://smv.jetti-app.com';
const BPAPI = 'https://bp.x100-group.com/JettiProcesses/hs';

export const environment = {
  production: true,
  api: `${domain}/api/`,
  auth: `${domain}/auth/`,
  socket: domain,
  host: domain,
  PowerBIURL: 'https://app.powerbi.com/Redirect?action=OpenApp&appId=be0489b5-9ccc-4f9c-a224-cfec72a95c05&ctid=b91c98b1-d543-428b-9469-f5f8f25bc37b',
  title: 'Jetti [SMV]',
  path: '',
  BPAPI
};

export const MsalConfiguration: Configuration = createMsalConfiguration(
  'https://login.microsoftonline.com/organizations'
);

