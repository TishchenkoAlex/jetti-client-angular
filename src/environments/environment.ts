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
  BPAPI,
  AUTH_TOKEN: ''  //'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0aW1lem9uZU9mZnNldCI6LTE4MCwiZW1haWwiOiJiZXprb3JvdmF5bml5LmRAc3VzaGktbWFzdGVyLm5ldCIsImRlc2NyaXB0aW9uIjoi0JHQtdC30LrQvtGA0L7QstCw0LnQvdGL0Lkg0JTQvNC40YLRgNC40LkiLCJpc0FkbWluIjp0cnVlLCJyb2xlcyI6WyJPcGVyYXRpb24gcnVsZXMgZGVzaWduZXIiLCJVc2VyIHNldHRpbmdzIiwiRGVwYXJ0bWVudCBlZGl0b3IiLCJDb21wYW55IGVkaXRvciIsIkRlcGFydG1lbnQgY29tcGFueSBlZGl0b3IiLCJBZG1pbiBncmFudG9yIiwiRnJvbnQgc2V0dGluZ3MgKEFETUlOKSIsIkNvbW1vbiBkYXRhIGVkaXRvciIsIlJlYWRvbmx5IGNvbXBhbnkgY29udG91ciBlZGl0b3IiXSwiZW52Ijp7InZpZXciOnsiaWQiOiIwOEQ1NzdBMC1GOTlELTExRTktODE3Qy00QjI3RjhFOTRGMzciLCJjb2RlIjoiYmV6a29yb3ZheW5peS5kQHN1c2hpLW1hc3Rlci5uZXQiLCJ0eXBlIjoiQ2F0YWxvZy5Vc2VyIiwidmFsdWUiOiJCZXprb3JvdmF5bml5LkQifSwic2V0dGluZ3MiOnsiTE9HSUNfVVNFQ0FTSFJFUVVFU1RBUFBST1ZJTkciOiIwIn0sImNvbnRvdXIiOjEsImxpbmsiOiJodHRwczovL3gxMDAtamV0dGkud2ViLmFwcCJ9LCJpYXQiOjE3ODQ1Mzc4ODcsImV4cCI6MTc4NDc5NzA4N30.MmazoGHy9EEoRJ51C2dPWnEuIfbF_ZdqG0HEa4AtHR8'
};

export const MsalConfiguration: Configuration = createMsalConfiguration(
  'https://login.microsoftonline.com/b91c98b1-d543-428b-9469-f5f8f25bc37b'
);

