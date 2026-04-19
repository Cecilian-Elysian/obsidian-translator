import { App, Plugin } from 'obsidian';
import ObsidianTranslator from './main';

export interface TranslatorSettings {
    apiKey: string;
    enabled: boolean;
    showOriginalOnHover: boolean;
}

export interface CacheData {
    cache: Record<string, string>;
}

export class TranslatorService {
    plugin: ObsidianTranslator;
    settings: TranslatorSettings;
    cache: Record<string, string> = {};
    private apiBase = 'https://api.minimaxi.com/anthropic';

    constructor(plugin: ObsidianTranslator) {
        this.plugin = plugin;
        this.settings = {
            apiKey: '',
            enabled: true,
            showOriginalOnHover: true,
        };
    }

    async loadSettings() {
        const data = await this.plugin.loadData();
        if (data) {
            this.settings = {
                apiKey: data.apiKey || '',
                enabled: data.enabled ?? true,
                showOriginalOnHover: data.showOriginalOnHover ?? true,
            };
            this.cache = data.cache || {};
        }
    }

    async saveSettings() {
        await this.plugin.saveData({
            ...this.settings,
            cache: this.cache,
        });
    }

    async saveCache() {
        await this.plugin.saveData({
            ...this.settings,
            cache: this.cache,
        });
    }

    async translate(texts: string[]): Promise<Record<string, string>> {
        if (!this.settings.apiKey) {
            return {};
        }

        const uncached: string[] = [];
        const result: Record<string, string> = {};

        for (const text of texts) {
            const lower = text.toLowerCase();
            if (this.cache[lower] !== undefined) {
                result[lower] = this.cache[lower];
            } else {
                uncached.push(text);
            }
        }

        if (uncached.length > 0) {
            const translated = await this.batchTranslate(uncached);
            for (const [text, translation] of Object.entries(translated)) {
                const lower = text.toLowerCase();
                this.cache[lower] = translation;
                result[lower] = translation;
            }
            await this.saveCache();
        }

        return result;
    }

    private async batchTranslate(texts: string[]): Promise<Record<string, string>> {
        if (texts.length === 0) return {};

        const prompt = `You are a professional English to Chinese translator. Translate the following English plugin setting texts to Chinese. Keep the translation concise and natural. Return each translation in the format: "ORIGINAL_TEXT => TRANSLATED_TEXT"\n\n${texts.map(t => `"${t}"`).join('\n')}`;

        try {
            const response = await fetch(this.apiBase, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-api-key': this.settings.apiKey,
                    'anthropic-version': '2023-06-01',
                },
                body: JSON.stringify({
                    model: 'MiniMax-M2.5',
                    max_tokens: 1024,
                    messages: [
                        {
                            role: 'user',
                            content: prompt,
                        },
                    ],
                }),
            });

            if (!response.ok) {
                console.error('Translation API error:', response.status);
                return {};
            }

            const data = await response.json();
            const content = data.content?.[0]?.text || '';

            const translations: Record<string, string> = {};
            const lines = content.split('\n');

            for (const line of lines) {
                const match = line.match(/"(.+?)"\s*=>\s*"(.+?)"/);
                if (match) {
                    translations[match[1].toLowerCase()] = match[2];
                }
            }

            return translations;
        } catch (error) {
            console.error('Translation failed:', error);
            return {};
        }
    }

    async clearCache() {
        this.cache = {};
        await this.saveCache();
    }

    getCacheCount(): number {
        return Object.keys(this.cache).length;
    }
}