import { ChangeDetectionStrategy, Component, QueryList, ViewChildren, ChangeDetectorRef } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DocumentOptions, RefValue } from 'jetti-middle';
import { merge } from 'rxjs';
import { filter } from 'rxjs/operators';
import { DocService } from '../doc.service';
import { DynamicComponent } from '../dynamic-component/dynamic-component';
import { scrollIntoViewIfNeeded } from '../utils';
import { TabDef, TabsStore } from './tabs.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-tabcontroller',
  templateUrl: './tabcontroller.component.html',
})
export class TabControllerComponent {

  @ViewChildren(DynamicComponent) components: QueryList<DynamicComponent>;

  constructor(private router: Router,
    private route: ActivatedRoute,
    private ds: DocService,
    public tabStore: TabsStore,
    private cd: ChangeDetectorRef) {

    this.tabStore.state$.subscribe(store => {
      setTimeout(() => this.cd.markForCheck());
    });


    this.route.params
      .subscribe(params => {
        const { type, id = '', group = '', used = '' } = params;
        const tabKey = { type, id, group, used };
        let index = tabStore.findTabIndex(tabKey);
        if (index === -1) {
          const title = this.getTabTitle(this.route.snapshot.data.detail);
          const newLink: TabDef = {
            ...tabKey,
            ...title,
            routerLink: this.router.url,
            query: this.route.snapshot.queryParams,
            data: this.route.snapshot.data.detail
          };
          tabStore.push(newLink);
          index = tabStore.selectedIndex;
        }
        setTimeout(() => this.tabStore.selectedIndex = index);
        setTimeout(() => scrollIntoViewIfNeeded(params.type, 'ui-state-highlight'));
      });

    merge(...[this.ds.save$, this.ds.delete$]).pipe(filter(doc => doc.id === this.route.snapshot.params.id))
      .subscribe(doc => {
        const tabKey = { type: doc.type, id: doc.id, group: doc['Group'] || '', used: '' };
        const tab = tabStore.findTab(tabKey);
        if (tab) {
          tab.header = doc.description;
          tabStore.replace(tab);
        }
      });
  }

  private getTabTitle(detail: FormGroup | { metadata: DocumentOptions & { Group: RefValue, Used: RefValue } }): { header: string, icon: string } {
    if (detail instanceof FormGroup) {
      const doc = detail.getRawValue();
      const metadata = detail['metadata'];
      return { header: `${doc.description || metadata.description}`, icon: metadata.icon };
    } else {
      if (detail && detail.metadata) {
        let postFix = '';
        if (detail.metadata.Group) postFix = ` [${detail.metadata.Group.code}]`;
        if (detail.metadata.Used) postFix = ` (${detail.metadata.Used.value})`;
        return { header: `${detail.metadata.menu} ${postFix}`.trim(), icon: detail.metadata.icon };
      }
    }
  }

  onTabSelected(event: { index: number, originalEvent: Event }) {
    event.originalEvent.stopImmediatePropagation();
    this.selectTab(this.tabStore.state.tabs[event.index]);
  }

  onTabClose(event: { index: number, originalEvent: Event }) {
    event.originalEvent.stopImmediatePropagation();
    const tab = this.tabStore.state.tabs[event.index];
    const component = this.components.find(e => e.id === tab.id && e.type === tab.type);
    if (component && component.componentRef.instance.close) {
      component.componentRef.instance.close();
    } else {
      this.tabStore.close(tab);
      this.selectTab(this.tabStore.state.tabs[this.tabStore.selectedIndex]);
    }
  }

  selectTab(tab: TabDef) {
    const route = [tab.type];
    if (tab.group) route.push('group', tab.group);
    else if (tab.used) route.push('used', tab.used);
    else route.push(tab.id);
    const tabIndex = this.tabStore.findTabIndex(tab);
    this.tabStore.selectedIndex = tabIndex;
    this.router.navigate(route, { state: { tabIndex } });
  }
}
