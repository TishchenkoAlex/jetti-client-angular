import { InjectionToken } from '@angular/core';
import { IPublicClientApplication } from '@azure/msal-browser';

export const MSAL_INSTANCE = new InjectionToken<IPublicClientApplication>('MSAL_INSTANCE');
