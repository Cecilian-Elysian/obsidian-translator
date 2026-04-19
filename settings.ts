import { App, PluginSettingTab, Setting, ButtonComponent } from 'obsidian';
import ObsidianTranslator from './main';

export class TranslatorSettingsTab extends PluginSettingTab {
    plugin: ObsidianTranslator;

    constructor(app: App, plugin: ObsidianTranslator) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        const { containerEl } = this;
        containerEl.empty();

        new Setting(containerEl)
            .setName('MiniMax API Key')
            .setDesc('Enter your MiniMax API key for translation')
            .addText((text) =>
                text
                    .setValue(this.plugin.translator.settings.apiKey)
                    .onChange(async (value) => {
                        this.plugin.translator.settings.apiKey = value;
                        await this.plugin.translator.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Enable Translation')
            .setDesc('Automatically translate plugin settings to Chinese')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.translator.settings.enabled)
                    .onChange(async (value) => {
                        this.plugin.translator.settings.enabled = value;
                        await this.plugin.translator.saveSettings();
                        await this.plugin.reloadObserver();
                    })
            );

        new Setting(containerEl)
            .setName('Show Original on Hover')
            .setDesc('Show original English text when hovering over translated text')
            .addToggle((toggle) =>
                toggle
                    .setValue(this.plugin.translator.settings.showOriginalOnHover)
                    .onChange(async (value) => {
                        this.plugin.translator.settings.showOriginalOnHover = value;
                        await this.plugin.translator.saveSettings();
                    })
            );

        new Setting(containerEl)
            .setName('Clear Translation Cache')
            .setDesc('Remove all cached translations')
            .addButton((button: ButtonComponent) => {
                button.setButtonText('Clear Cache').setCta();
                button.onClick(async () => {
                    await this.plugin.translator.clearCache();
                    this.display();
                });
            });

        new Setting(containerEl).setName(`Cached Translations: ${this.plugin.translator.getCacheCount()}`);
    }
}