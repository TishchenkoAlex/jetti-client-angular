import { Injectable } from '@angular/core';
import { IUserSettings } from 'jetti-middle/dist/common/classes/user-settings';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';

@Injectable({ providedIn: 'root' })
export class UserSettingsService {

  constructor(private api: ApiService, private messageService: MessageService) { }

  async loadSettings(type: string, user: string, id?: string, defaultSettings?: IUserSettings[]) {
    const savedSettings = await this.api.getUserSettings(type, user, id);
    return [...savedSettings || [], ...defaultSettings || []];
  }

  async deleteSettings(settings: IUserSettings) {
    this.api.deleteUserSettings(settings.id).then(_ => this.showSuccessMessage(`Settings "${settings.description}" is deleted`));
  }

  async saveSettings(settings: IUserSettings[]) {
    const savedSettings = await this.api.saveUserSettings(settings);
    for (const set of savedSettings) {
      this.showSuccessMessage(`Settings ${set.description} is saved`);
    }
    return savedSettings;
  }

  getSettingsFromCache(id: string) {
    if (!id) return null;
    const settings = localStorage.getItem(this.settingsCacheKey(id));
    return settings ? JSON.parse(settings) as IUserSettings : null;
  }

  cacheSettings(settings: IUserSettings) {
    return localStorage.setItem(this.settingsCacheKey(settings.id), JSON.stringify(settings));
  }

  settingsCacheKey(id: string) {
    return `formSettings: ${id} `;
  }

  private showSuccessMessage(summary: string, detail = '') {
    this.messageService.add({ severity: 'success', summary, detail, key: '1' });
  }
}
