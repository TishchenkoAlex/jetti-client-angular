import { Component, Input } from '@angular/core';
import { BusinessProcessEvent } from '../../models/business-process.models';

@Component({
  selector: 'bp-process-timeline',
  templateUrl: './process-timeline.component.html'
})
export class ProcessTimelineComponent {
  @Input() events: BusinessProcessEvent[] = [];

  getUserDisplay(event: BusinessProcessEvent): string {
    if (!event) return '';
    const user: any = event.user;
    if (user && user.value) return user.value;
    if (user && user.name) return user.name;
    if (event.userId) return event.userId;
    return '';
  }
}
