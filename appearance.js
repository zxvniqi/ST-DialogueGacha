// Card look: preset styles, custom colors, fonts, and an optional background image.
// The image lives in localforage (IndexedDB) so large data never bloats settings.json.
import { findFont, useFont } from './fonts.js';

const IMAGE_KEY = 'st_dialogue_gacha_bg_image';
const MAX_IMAGE_SIDE = 1600;

export const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "Batang", "Times New Roman", serif';
export const SANS = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

export const PRESETS = Object.freeze({
    novel: { background: '#f6f1e7', text: '#2b2620', font: SERIF },
    card: { background: '#1a1c26', text: '#f3f1ec', font: SANS },
});

let cachedImage = null;

/** The chosen font as a CSS font-family list (also used for the canvas image). */
function resolveFont(settings, presetFont) {
    const choice = String(settings.fontChoice ?? '');
    const webFont = findFont(choice);
    if (webFont) {
        return `${useFont(webFont)}, ${presetFont}`;
    }
    switch (choice) {
        case 'serif':
            return SERIF;
        case 'sans':
            return SANS;
        case 'ui': {
            // SillyTavern's own chat font (set by the UI theme)
            const uiFont = getComputedStyle(document.documentElement).getPropertyValue('--mainFontFamily').trim();
            return uiFont || SANS;
        }
        default:
            return presetFont;
    }
}

/**
 * @returns {{ background: string, text: string, font: string, scale: number, align: string, image: string|null, dim: number }}
 */
export function resolveTheme(settings) {
    const preset = PRESETS[settings.style] ?? PRESETS.novel;
    return {
        background: settings.customColors ? settings.bgColor : preset.background,
        text: settings.customColors ? settings.textColor : preset.text,
        font: resolveFont(settings, preset.font),
        scale: (Number(settings.fontScale) || 100) / 100,
        align: ['left', 'center', 'right'].includes(settings.textAlign) ? settings.textAlign : 'left',
        image: cachedImage,
        dim: cachedImage ? settings.bgDim / 100 : 0,
    };
}

/** The stored background image (data URL), or null. */
export function getBackgroundImage() {
    return cachedImage;
}

export async function loadBackgroundImage() {
    cachedImage = await SillyTavern.libs.localforage.getItem(IMAGE_KEY) ?? null;
    return cachedImage;
}

export async function clearBackgroundImage() {
    cachedImage = null;
    await SillyTavern.libs.localforage.removeItem(IMAGE_KEY);
}

/** Downscales the picked file to keep storage small, then stores it as a data URL. */
export async function saveBackgroundImage(file) {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    cachedImage = canvas.toDataURL('image/jpeg', 0.88);
    await SillyTavern.libs.localforage.setItem(IMAGE_KEY, cachedImage);
    return cachedImage;
}

/** Applies the theme to the on-screen card through CSS variables. */
export function applyThemeToElement(element, theme) {
    element.style.setProperty('--stdg-bg', theme.background);
    element.style.setProperty('--stdg-text', theme.text);
    element.style.setProperty('--stdg-font', theme.font);
    element.style.setProperty('--stdg-scale', String(theme.scale));
    element.style.setProperty('--stdg-align', theme.align);
    element.style.setProperty('--stdg-image', theme.image ? `url("${theme.image}")` : 'none');
    element.style.setProperty('--stdg-dim', String(theme.dim));
}
