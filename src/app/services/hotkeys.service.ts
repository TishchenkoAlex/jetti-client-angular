import { Injectable } from '@angular/core';
import { fromEvent } from 'rxjs';
import { filter, map, tap, switchMap } from 'rxjs/operators';
import { TabsStore } from '../common/tabcontroller/tabs.store';

@Injectable({ providedIn: 'root' })
export class HotkeysService {

  private readonly keyMap = {
    single: [
      'Insert',
      'F9',
      'F2',
      'F4',
      'F5',
    ],
    multi: {
      ctrlKey: [],
      shiftKey: [],
      altKey: [
        'KeyQ',
        'KeyA',
        'ArrowRight',
        'ArrowLeft',
        'ArrowUp',
        'ArrowDown'
      ]
    }
  };

  private _activeUrl$ = this.tabs.state$.pipe(map(({ selectedIndex, tabs }) => tabs[selectedIndex].routerLink));
  private _keyboardEvent$ = fromEvent<KeyboardEvent>(document, 'keydown').pipe(
    filter(this.filterEvents.bind(this)),
    map<KeyboardEvent, { key: string, event: KeyboardEvent }>(this.mapEvent.bind(this))
  );

  hotKeyEvent$ = this._activeUrl$.pipe(
    switchMap(activeUrl => this._keyboardEvent$.pipe(map(event => ({ ...event, activeUrl })))),
    tap(event => console.log('HotKey', event)),
  );

  constructor(private tabs: TabsStore) { }

  filterEvents(event: KeyboardEvent) {
    const isSingle = Object.keys(this.keyMap.multi)
      .every(key => !event[key]) && this.keyMap.single.includes(event.code);
    if (isSingle) return true;
    return Object.entries(this.keyMap.multi)
      .filter(([key]) => event[key])
      .map(([key, value]) => value.includes(event.code))
      .filter(e => e).length === 1;
  }

  mapEvent(event: KeyboardEvent) {
    const deleteKey = (s: string) => s.replace('Key', '');
    const mod = Object.keys(this.keyMap.multi).filter(k => !!event[k]).map(deleteKey);
    return {
      key: mod.length ? [mod.join('+'), deleteKey(event.code)].join('+') : deleteKey(event.code),
      event
    };
  }
}
