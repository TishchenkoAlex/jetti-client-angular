import { ChangeDetectionStrategy, Component } from '@angular/core';
import { take } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { EventsService } from './../services/events.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-home',
  templateUrl: 'home.component.html',
  styleUrls: ['home.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeComponent  {

  constructor(public ts: EventsService, public auth: AuthService) { }

  async login() {
    (await this.auth.login()).pipe(take(1)).subscribe();
  }

  powerBi() {
    window.open(environment.PowerBIURL, '_blank');
  }
}
