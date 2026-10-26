export const MODULE = 'st_dialogue_gacha';

const defaultSettings = Object.freeze({
    quoteDouble: true,
    quoteCorner: true,
    includeHidden: false,
    includeUser: false,
    minLength: 2,
    useTranslation: true,
    style: 'novel',
    fontChoice: 'style',
    fontScale: 100,
    textAlign: 'left',
    customColors: false,
    bgColor: '#f6f1e7',
    textColor: '#2b2620',
    bgDim: 40,
    effects: true,
});

export function getSettings() {
    const { extensionSettings } = SillyTavern.getContext();
    extensionSettings[MODULE] ??= {};
    const settings = extensionSettings[MODULE];
    for (const [key, value] of Object.entries(defaultSettings)) {
        if (!Object.hasOwn(settings, key)) {
            settings[key] = value;
        }
    }
    return settings;
}

export function saveSettings() {
    SillyTavern.getContext().saveSettingsDebounced();
}

export function getDefault(key) {
    return defaultSettings[key];
}
