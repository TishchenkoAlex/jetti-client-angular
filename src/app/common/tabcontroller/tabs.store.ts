import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FormGroup } from '@angular/forms';
import { IViewModel } from 'jetti-middle/dist';

export interface TabDef extends TabDefKey {
  header: string;
  icon: string;
  routerLink: string;
  query: { [x: string]: any };
  data: FormGroup | IViewModel | any;
}

export interface TabDefKey {
  type: string;
  id: string;
  group: string;
  used: string;
}

interface TabsState {
  selectedIndex: number;
  tabs: TabDef[];
}

const initialState: TabsState = {
  selectedIndex: 0,
  tabs: [{
    header: 'Home', type: 'home', icon: 'fa fa-home',
    id: '', routerLink: '/' + 'home', data: null, query: {}, group: '', used: ''
  }]
};

@Injectable()
export class TabsStore {

  private readonly _state: BehaviorSubject<TabsState> = new BehaviorSubject(initialState);
  get state() { return this._state.value; }
  state$ = this._state.asObservable();

  get selectedIndex() { return this.state.selectedIndex; }
  set selectedIndex(value) {
    this._state.next(({
      ...this.state,
      selectedIndex: value
    }));
  }

  push(tab: TabDef) {
    this._state.next(({
      ...this.state,
      tabs: [...this.state.tabs, tab],
      selectedIndex: this.state.tabs.length
    }));
  }

  replace(tab: TabDef) {
    const copy = [...this.state.tabs];
    const index = this.findTabIndex(tab);
    copy[index] = tab;
    this._state.next(({
      ...this.state,
      tabs: copy,
    }));
  }

  close(tab: TabDef) {
    const copy = [...this.state.tabs];
    const index = this.findTabIndex(tab);
    const currentTab = this.state.tabs[this.state.selectedIndex];
    copy.splice(index, 1);
    let selectedIndex = this.findTabIndex(currentTab, copy);
    if (selectedIndex === -1) selectedIndex = Math.min(this.state.selectedIndex, copy.length - 1);
    this._state.next(({
      ...this.state,
      tabs: copy,
      selectedIndex: selectedIndex
    }));
  }

  findTab(tab: TabDefKey, tabs?: TabDef[]) {
    const tabIndex = this.findTabIndex(tab, tabs);
    return tabIndex === -1 ? undefined : (tabs || this.state.tabs)[tabIndex];
  }

  findTabIndex(tab: TabDefKey, tabs?: TabDef[]) {
    return (tabs || this.state.tabs).findIndex(el =>
      el.type === tab.type
      && el.id === tab.id
      && el.group === tab.group
      && el.used === tab.used);
  }
}
