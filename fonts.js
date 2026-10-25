// Fonts for the card. Most ship with the extension (fonts/*.woff2): open-license (SIL OFL) fonts,
// subset to Korean (KS X 1001's 2,350 syllables + jamo), Japanese (kana + JIS level-1 kanji),
// Latin and punctuation, so they work offline. A few fonts whose licenses don't allow
// redistribution load from a CDN instead (marked 인터넷 in the list).
//
// Korean-only fonts get a Japanese fallback in a matching style, so mixed Korean / Japanese /
// English text always renders in a fitting font. Fonts load lazily, the first time they're used.

const FONT_DIR = new URL('./fonts/', import.meta.url);
const NOONNU = 'https://cdn.jsdelivr.net/gh/projectnoonnu';
const FAMILY_PREFIX = 'stdg-';
const VALUE_PREFIX = 'font:';
// Values saved by earlier versions: `gf:<Google family>` / `web:<CDN family>`
const LEGACY_PREFIXES = ['gf:', 'web:'];

// Japanese fallbacks (bundled, Japanese-only)
const JA_SANS = 'noto-sans-kr';
const JA_SERIF = 'noto-serif-kr';
const JA_HAND = 'yomogi';
const JA_BRUSH = 'yuji-syuku';
const JA_PIXEL = 'dotgothic16';
const JA_ROUND = 'm-plus-rounded-1c';
const JA_BOLD = 'dela-gothic-one';

// [id, label, group, original family (for older saved values), Japanese fallback or null if built in, CDN url]
const FONT_TABLE = [
    ['pretendard', '프리텐다드', '인기', 'Pretendard', JA_SANS],
    ['pretendard-jp', '프리텐다드 JP (한·일·영)', '인기', 'Pretendard JP', null],
    ['suit', '수트 (SUIT)', '인기', 'SUIT', JA_SANS],
    ['wanted-sans', '원티드 산스', '인기', 'Wanted Sans', JA_SANS],
    ['spoqa-han-sans-neo', '스포카 한 산스 Neo', '인기', 'Spoqa Han Sans Neo', JA_SANS],
    ['nanum-square-neo', '나눔스퀘어 네오', '인기', 'NanumSquareNeo', JA_SANS],
    ['paperlogy', '페이퍼로지', '인기', 'Paperlogy', JA_SANS],
    ['freesentation', '프리젠테이션', '인기', 'Freesentation', JA_SANS],

    ['maru-buri', '마루 부리', '명조 (책 느낌)', 'MaruBuri', JA_SERIF],
    ['noto-serif-kr', '본명조 (한·일·영)', '명조 (책 느낌)', 'Noto Serif KR', null],
    ['nanum-myeongjo', '나눔명조', '명조 (책 느낌)', 'Nanum Myeongjo', JA_SERIF],
    ['gowun-batang', '고운바탕', '명조 (책 느낌)', 'Gowun Batang', JA_SERIF],
    ['hahmlet', '함렛', '명조 (책 느낌)', 'Hahmlet', JA_SERIF],
    ['song-myung', '송명', '명조 (책 느낌)', 'Song Myung', JA_SERIF],
    ['ridibatang', '리디바탕 (인터넷)', '명조 (책 느낌)', 'RIDIBatang', JA_SERIF, `${NOONNU}/noonfonts_twelve@1.0/RIDIBatang.woff`],

    ['noto-sans-kr', '본고딕 (한·일·영)', '고딕', 'Noto Sans KR', null],
    ['nanum-gothic', '나눔고딕', '고딕', 'Nanum Gothic', JA_SANS],
    ['gowun-dodum', '고운돋움', '고딕', 'Gowun Dodum', JA_SANS],
    ['ibm-plex-sans-kr', 'IBM Plex Sans', '고딕', 'IBM Plex Sans KR', JA_SANS],
    ['gothic-a1', '고딕 A1', '고딕', 'Gothic A1', JA_SANS],
    ['gmarket-sans', 'G마켓 산스 (인터넷)', '고딕', 'GmarketSansMedium', JA_SANS, `${NOONNU}/noonfonts_2001@1.1/GmarketSansMedium.woff`],

    ['nanum-pen-script', '나눔손글씨 펜', '손글씨', 'Nanum Pen Script', JA_HAND],
    ['nanum-brush-script', '나눔손글씨 붓', '손글씨', 'Nanum Brush Script', JA_BRUSH],
    ['hi-melody', '하이멜로디', '손글씨', 'Hi Melody', JA_HAND],
    ['gaegu', '개구', '손글씨', 'Gaegu', JA_HAND],
    ['gamja-flower', '감자꽃', '손글씨', 'Gamja Flower', JA_HAND],
    ['poor-story', '푸어스토리', '손글씨', 'Poor Story', JA_HAND],
    ['cute-font', '귀여운 글꼴', '손글씨', 'Cute Font', JA_HAND],
    ['single-day', '싱글데이', '손글씨', 'Single Day', JA_HAND],
    ['yeon-sung', '연성', '손글씨', 'Yeon Sung', JA_HAND],
    ['kirang-haerang', '기랑해랑', '손글씨', 'Kirang Haerang', JA_HAND],
    ['kyobo-hand', '교보손글씨 2019 (인터넷)', '손글씨', 'KyoboHand', JA_HAND, `${NOONNU}/noonfonts_20-04@1.0/KyoboHand.woff`],

    ['galmuri11', '갈무리11 (한·일·영)', '픽셀·레트로', 'Galmuri11', null],
    ['galmuri14', '갈무리14 (한·일·영)', '픽셀·레트로', 'Galmuri14', null],
    ['neodgm', '네오둥근모', '픽셀·레트로', 'NeoDunggeunmo', JA_PIXEL],

    ['jua', '주아', '개성', 'Jua', JA_ROUND],
    ['dongle', '동글', '개성', 'Dongle', JA_ROUND],
    ['orbit', '오르빗', '개성', 'Orbit', JA_ROUND],
    ['stylish', '스타일리시', '개성', 'Stylish', JA_ROUND],
    ['diphylleia', '디필레이아', '개성', 'Diphylleia', JA_SERIF],
    ['do-hyeon', '도현', '개성', 'Do Hyeon', JA_BOLD],
    ['black-han-sans', '검은고딕', '개성', 'Black Han Sans', JA_BOLD],
    ['gugi', '구기', '개성', 'Gugi', JA_BOLD],
    ['dokdo', '독도', '개성', 'Dokdo', JA_BRUSH],
    ['east-sea-dokdo', '동해 독도', '개성', 'East Sea Dokdo', JA_BRUSH],
];

/** @type {{ value: string, id: string, label: string, group: string, family: string, ja: string|null, url: string }[]} */
export const FONTS = Object.freeze(FONT_TABLE.map(([id, label, group, family, ja, cdn]) => ({
    value: `${VALUE_PREFIX}${id}`,
    id,
    label,
    group,
    family,
    ja,
    url: cdn ?? new URL(`${id}.woff2`, FONT_DIR).href,
})));

const registered = new Set();

/** Adds an @font-face for a bundled (or CDN) font file under the extension's own family name. */
function register(id, url) {
    if (registered.has(id)) {
        return;
    }
    registered.add(id);
    const format = url.endsWith('.woff2') ? 'woff2' : 'woff';
    const style = document.createElement('style');
    style.textContent = `@font-face { font-family: "${FAMILY_PREFIX}${id}"; src: url("${url}") format("${format}"); font-display: swap; }`;
    document.head.append(style);
}

export function findFont(value) {
    const text = String(value ?? '');
    const legacy = LEGACY_PREFIXES.find(prefix => text.startsWith(prefix));
    if (legacy) {
        const family = text.slice(legacy.length);
        return FONTS.find(font => font.family === family) ?? null;
    }
    return FONTS.find(font => font.value === text) ?? null;
}

/** Makes the font (and its Japanese fallback) available; returns the CSS font-family list. */
export function useFont(font) {
    register(font.id, font.url);
    const families = [`"${FAMILY_PREFIX}${font.id}"`];
    if (font.ja) {
        register(font.ja, new URL(`${font.ja}.woff2`, FONT_DIR).href);
        families.push(`"${FAMILY_PREFIX}${font.ja}"`);
    }
    return families.join(', ');
}
