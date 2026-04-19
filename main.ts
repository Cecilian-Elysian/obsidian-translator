import { App, Plugin } from 'obsidian';
import { TranslatorService } from './translator';
import { TranslationObserver } from './observer';
import { TranslatorSettingsTab } from './settings';

export default class ObsidianTranslator extends Plugin {
    translator: TranslatorService;
    observer: TranslationObserver;
    settingsTab: TranslatorSettingsTab;

    async onload() {
        this.translator = new TranslatorService(this);
        await this.translator.loadSettings();

        this.settingsTab = new TranslatorSettingsTab(this.app, this);
        this.addSettingTab(this.settingsTab);

        if (this.translator.settings.enabled) {
            this.observer = new TranslationObserver(this);
            this.observer.start();
        }
    }

    onunload() {
        if (this.observer) {
            this.observer.stop();
        }
    }

    async reloadObserver() {
        if (this.observer) {
            this.observer.stop();
        }

        if (this.translator.settings.enabled) {
            this.observer = new TranslationObserver(this);
            this.observer.start();
        }
    }
}