import { App, debounce } from 'obsidian';
import ObsidianTranslator from './main';

export class TranslationObserver {
    plugin: ObsidianTranslator;
    observer: MutationObserver | null = null;
    private debouncedTranslate: (node: Node) => void;

    constructor(plugin: ObsidianTranslator) {
        this.plugin = plugin;
        this.debouncedTranslate = debounce(
            this.processNode.bind(this),
            500,
            true
        );
    }

    start() {
        const settingsContainer = document.querySelector('.tab-content');
        if (!settingsContainer) {
            setTimeout(() => this.start(), 1000);
            return;
        }

        this.observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    if (node instanceof Element) {
                        this.scanElement(node);
                    } else if (node instanceof Text) {
                        this.debouncedTranslate(node);
                    }
                }
            }
        });

        this.observer.observe(settingsContainer, {
            childList: true,
            subtree: true,
        });

        this.scanPage();
    }

    stop() {
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
    }

    private scanPage() {
        const settingsContainer = document.querySelector('.tab-content');
        if (settingsContainer) {
            this.scanElement(settingsContainer);
        }
    }

    private scanElement(element: Element) {
        if (element.classList.contains('translated')) {
            return;
        }

        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    if (this.shouldSkip(node.parentElement)) {
                        return NodeFilter.FILTER_REJECT;
                    }
                    return NodeFilter.FILTER_ACCEPT;
                },
            }
        );

        const nodes: Text[] = [];
        let node: Text | null;
        while ((node = walker.nextNode() as Text)) {
            nodes.push(node);
        }

        for (const textNode of nodes) {
            this.processNode(textNode);
        }
    }

    private shouldSkip(element: Element | null): boolean {
        if (!element) return true;

        const tagName = element.tagName.toLowerCase();
        if (['script', 'style', 'textarea', 'input', 'code', 'pre'].includes(tagName)) {
            return true;
        }

        if (element.classList.contains('translated')) {
            return true;
        }

        if (element.closest('.translated')) {
            return true;
        }

        return false;
    }

    private async processNode(textNode: Text) {
        const text = textNode.textContent?.trim() || '';
        if (!this.isTranslatable(text)) {
            return;
        }

        const translated = await this.plugin.translator.translate([text]);
        const lower = text.toLowerCase();

        if (translated[lower]) {
            this.replaceText(textNode, translated[lower]);
        }
    }

    private isTranslatable(text: string): boolean {
        if (!text || text.length < 2 || text.length > 500) {
            return false;
        }

        if (/^[\d\s\.,!?;:_\-\(\)\[\]{}|\\\/@#$%^&*+=<>]+$/.test(text)) {
            return false;
        }

        const chineseRegex = /[\u4e00-\u9fff]/;
        if (chineseRegex.test(text)) {
            return false;
        }

        const englishLetterCount = (text.match(/[a-zA-Z]/g) || []).length;
        if (englishLetterCount < text.length * 0.3) {
            return false;
        }

        return true;
    }

    private replaceText(textNode: Text, translation: string) {
        const parent = textNode.parentElement;
        if (!parent) return;

        const span = document.createElement('span');
        span.classList.add('translated');
        span.setAttribute('data-original', textNode.textContent || '');

        if (this.plugin.translator.settings.showOriginalOnHover) {
            span.setAttribute('data-tooltip', 'hover');
        }

        span.textContent = translation;
        textNode.parentNode?.replaceChild(span, textNode);
    }
}