// Free (SIL Open Font License) Korean web fonts from Google Fonts, loaded only when used.
// Picking a font adds its stylesheet once; the browser then downloads just the glyph slices
// the text needs. The list preview loads a tiny subset (only the label's characters) under a
// private family name, so opening the list stays light and doesn't interfere with the real font.

const CSS_API = 'https://fonts.googleapis.com/css2';
const PREVIEW_PREFIX = 'stdg-preview-';

/** value: setting value stored as `gf:<family>` */
export const WEB_FONTS = Object.freeze([
    ['Noto Serif KR', '본명조 (Noto Serif)'],
    ['Nanum Myeongjo', '나눔명조'],
    ['Gowun Batang', '고운바탕'],
    ['Hahmlet', '함렛'],
    ['Song Myung', '송명'],
    ['Noto Sans KR', '본고딕 (Noto Sans)'],
    ['Nanum Gothic', '나눔고딕'],
    ['Gowun Dodum', '고운돋움'],
    ['IBM Plex Sans KR', 'IBM Plex Sans'],
    ['Gothic A1', '고딕 A1'],
    ['Nanum Pen Script', '나눔손글씨 펜'],
    ['Nanum Brush Script', '나눔손글씨 붓'],
    ['Hi Melody', '하이멜로디'],
    ['Gaegu', '개구'],
    ['Gamja Flower', '감자꽃'],
    ['Poor Story', '푸어스토리'],
    ['Cute Font', '귀여운 글꼴'],
    ['Single Day', '싱글데이'],
    ['Dokdo', '독도'],
    ['East Sea Dokdo', '동해 독도'],
    ['Yeon Sung', '연성'],
    ['Kirang Haerang', '기랑해랑'],
    ['Jua', '주아'],
    ['Do Hyeon', '도현'],
    ['Black Han Sans', '검은고딕'],
    ['Dongle', '동글'],
    ['Stylish', '스타일리시'],
    ['Gugi', '구기'],
    ['Orbit', '오르빗'],
    ['Diphylleia', '디필레이아'],
].map(([family, label]) => ({ family, label })));

const loadedFamilies = new Set();
let previewsLoaded = false;

/** Adds the font's stylesheet once; returns the CSS family name to use. */
export function useWebFont(family) {
    if (!loadedFamilies.has(family)) {
        loadedFamilies.add(family);
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = `${CSS_API}?family=${encodeURIComponent(family)}&display=swap`;
        document.head.append(link);
    }
    return `"${family}"`;
}

export function previewFamily(family) {
    return `"${PREVIEW_PREFIX}${family.replace(/\s+/g, '-')}"`;
}

/** Loads a label-only subset of every font for the list preview (once per page). */
export async function loadPreviewFonts() {
    if (previewsLoaded) {
        return;
    }
    previewsLoaded = true;
    const sheets = await Promise.all(WEB_FONTS.map(async ({ family, label }) => {
        try {
            const url = `${CSS_API}?family=${encodeURIComponent(family)}&text=${encodeURIComponent(label)}`;
            const css = await (await fetch(url)).text();
            return css.replaceAll(`font-family: '${family}'`, `font-family: ${previewFamily(family)}`);
        } catch {
            return ''; // offline: the item just shows in the default font
        }
    }));
    const style = document.createElement('style');
    style.textContent = sheets.join('\n');
    document.head.append(style);
}
