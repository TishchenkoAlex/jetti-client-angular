import { ChangeDetectionStrategy, Component } from '@angular/core';

/**
 * Empty landing page used by MSAL's popup while the opener redeems the
 * authorization code. It must not run the application's dynamic route resolver.
 */
@Component({
  selector: 'app-auth-callback',
  template: '',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthCallbackComponent { }
