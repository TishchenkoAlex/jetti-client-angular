import { Component, OnInit } from '@angular/core';
import { DynamicDialogRef, DynamicDialogConfig } from 'primeng/api';

@Component({
  selector: 'app-my-dialog',
  template: `
   <div class="hotkeys-dialog">
    <h2 class="hotkeys-title">Hotkeys</h2>
    <ul class="hotkeys-list">
      <li class="hotkeys-item" *ngFor="let hotkey of data">
        <span class="hotkeys-key">{{ hotkey.key }}</span>
        <span class="hotkeys-handler">{{ hotkey.info }}</span>
      </li>
    </ul>
  </div>
  `,
  styles: [
    `:host ::ng-deep .hotkeys-dialog {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: sans-serif;
    max-width: fit-content;
    user-select: none;
  }
  
  :host ::ng-deep .hotkeys-title {
    font-size: 1.5rem;
    font-weight: bold;
    margin: 1rem;
  }
  
  :host ::ng-deep .hotkeys-list {
    display: flex;
    flex-direction: column;
    align-items: center;
    margin: 0;
    padding: 0;
  }
  
  :host ::ng-deep .hotkeys-item {
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    margin: 0.5rem 0;
    padding: 0.5rem;
    background-color: #f2f2f2;
    border-radius: 0.25rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
  
  :host ::ng-deep .hotkeys-key {
    font-weight: bold;
    margin-right: 1rem;
  }
  
  :host ::ng-deep .hotkeys-handler {
    font-style: italic;
    text-align: right;
    margin-left: 1rem;
  }`]
})
export class ImageModalComponent implements OnInit {

  get data() {
    return this.config.data;
  }

  get header() {
    return this.config.showHeader && this.config.header || '';
  }

  constructor(public ref: DynamicDialogRef, public config: DynamicDialogConfig) { }

  ngOnInit() { }

  close(result: any) {
    this.ref.close(result);
  }
}
