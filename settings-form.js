// Settings section shown inside the gacha popup: two tabs (lines / look) built from small,
// touch-friendly controls (chips, segmented buttons, steppers) instead of form widgets.
import { getSettings, saveSettings } from './settings.js';
import { saveBackgroundImage, clearBackgroundImage, getBackgroundImage } from './appearance.js';
import { FONTS, findFont, useFont } from './fonts.js';
import { createInlineSelect } from './inline-select.js';

const MIN_LENGTH_RANGE = [1, 30];

const FONT_OPTIONS = [
    { value: 'style', label: '스타일 기본', group: '기본' },
    { value: 'serif', label: '명조 (기기 내장)', group: '기본' },
    { value: 'sans', label: '고딕 (기기 내장)', group: '기본' },
    { value: 'ui', label: '실리 채팅 글꼴', group: '기본' },
    ...FONTS.map(font => ({
        value: font.value,
        label: font.label,
        group: font.group,
        // Each row shows in its own font, loaded when the row scrolls into view
        loadFont: () => `${useFont(font)}, sans-serif`,
    })),
];

function row(label, ...controls) {
    const element = document.createElement('div');
    element.className = 'stdg_row';
    element.innerHTML = `<span class="stdg_row_label">${label}</span><div class="stdg_row_control"></div>`;
    element.querySelector('.stdg_row_control').append(...controls);
    return element;
}

/** Independent on/off chips, one per boolean setting. */
function chips(items, onChange) {
    const settings = getSettings();
    const wrap = document.createElement('div');
    wrap.className = 'stdg_chips';
    for (const [key, label] of items) {
        const chip = document.createElement('div');
        chip.className = 'stdg_chip';
        chip.textContent = label;
        chip.classList.toggle('stdg_on', Boolean(settings[key]));
        chip.addEventListener('click', () => {
            settings[key] = !settings[key];
            chip.classList.toggle('stdg_on', settings[key]);
            onChange();
        });
        wrap.append(chip);
    }
    return wrap;
}

/** One-of-several choice shown as joined buttons. */
function segmented(key, options, onChange) {
    const settings = getSettings();
    const wrap = document.createElement('div');
    wrap.className = 'stdg_segmented';
    const sync = () => {
        for (const button of wrap.children) {
            button.classList.toggle('stdg_on', button.dataset.index === String(options.findIndex(([value]) => value === settings[key])));
        }
    };
    options.forEach(([value, label], index) => {
        const button = document.createElement('div');
        button.className = 'stdg_segment';
        button.dataset.index = String(index);
        button.textContent = label;
        button.addEventListener('click', () => {
            settings[key] = value;
            sync();
            onChange();
        });
        wrap.append(button);
    });
    sync();
    return wrap;
}

function stepper(key, [min, max], suffix, onChange) {
    const settings = getSettings();
    const wrap = document.createElement('div');
    wrap.className = 'stdg_stepper';
    wrap.innerHTML = '<div class="stdg_step fa-solid fa-minus"></div><span></span><div class="stdg_step fa-solid fa-plus"></div>';
    const value = wrap.querySelector('span');
    const sync = () => { value.textContent = `${settings[key]}${suffix}`; };
    const [minus, plus] = wrap.querySelectorAll('.stdg_step');
    minus.addEventListener('click', () => { settings[key] = Math.max(min, settings[key] - 1); sync(); onChange(); });
    plus.addEventListener('click', () => { settings[key] = Math.min(max, settings[key] + 1); sync(); onChange(); });
    sync();
    return wrap;
}

function slider(key, min, max, step, onChange) {
    const settings = getSettings();
    const wrap = document.createElement('div');
    wrap.className = 'stdg_slider';
    wrap.innerHTML = `<input type="range" min="${min}" max="${max}" step="${step}"><span></span>`;
    const input = wrap.querySelector('input');
    const value = wrap.querySelector('span');
    input.value = String(settings[key]);
    const sync = () => { value.textContent = `${settings[key]}%`; };
    input.addEventListener('input', () => { settings[key] = Number(input.value); sync(); onChange(); });
    sync();
    return wrap;
}

function colorSwatch(key, label, onChange) {
    const settings = getSettings();
    const wrap = document.createElement('label');
    wrap.className = 'stdg_swatch';
    wrap.innerHTML = `<input type="color"><span>${label}</span>`;
    const input = wrap.querySelector('input');
    input.value = settings[key];
    input.addEventListener('input', () => { settings[key] = input.value; onChange(); });
    return wrap;
}

function buildLinesPage(onChange) {
    const page = document.createElement('div');
    page.append(
        row('대사 기호', chips([['quoteDouble', '" " 큰따옴표'], ['quoteCorner', '「 」 낫표']], onChange)),
        row('함께 뽑기', chips([['includeHidden', '숨긴 메시지'], ['includeUser', '내 대사']], onChange)),
        row('최소 글자', stepper('minLength', MIN_LENGTH_RANGE, '자', onChange)),
        row('처음 보일 글', segmented('useTranslation', [[true, '번역문'], [false, '원문']], onChange)),
        row('뽑기 연출', segmented('effects', [[true, '켜기'], [false, '끄기']], onChange)),
    );
    return page;
}

function buildLookPage(onChange) {
    const settings = getSettings();
    const page = document.createElement('div');

    // Values saved by older versions (gf:/web:) map onto the bundled fonts
    settings.fontChoice = findFont(settings.fontChoice)?.value ?? settings.fontChoice;
    const fontSelect = createInlineSelect({
        options: FONT_OPTIONS,
        value: String(settings.fontChoice),
        onChange: (value) => { settings.fontChoice = value; onChange(); },
    });

    const swatches = document.createElement('div');
    swatches.className = 'stdg_swatches';
    swatches.append(colorSwatch('bgColor', '배경', onChange), colorSwatch('textColor', '글자', onChange));
    const syncSwatches = () => { swatches.hidden = !settings.customColors; };
    const colorChoice = segmented('customColors', [[false, '스타일 색'], [true, '직접 고르기']], () => { syncSwatches(); onChange(); });
    syncSwatches();

    const imageControls = document.createElement('div');
    imageControls.className = 'stdg_image_controls';
    imageControls.innerHTML = `
        <div class="stdg_thumb"></div>
        <label class="stdg_chip"><i class="fa-solid fa-image"></i> 사진 고르기<input type="file" accept="image/*" hidden></label>
        <div class="stdg_chip stdg_image_clear"><i class="fa-solid fa-xmark"></i> 지우기</div>`;
    const thumb = imageControls.querySelector('.stdg_thumb');
    const clearButton = imageControls.querySelector('.stdg_image_clear');
    const dimRow = row('사진 흐리게', slider('bgDim', 0, 90, 5, onChange));
    const syncImage = () => {
        const image = getBackgroundImage();
        thumb.style.backgroundImage = image ? `url("${image}")` : '';
        thumb.hidden = !image;
        clearButton.hidden = !image;
        dimRow.hidden = !image;
    };
    imageControls.querySelector('input').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        try {
            await saveBackgroundImage(file);
            syncImage();
            onChange();
        } catch (error) {
            console.error('[st_dialogue_gacha] Could not load image', error);
            toastr.error('이미지를 불러오지 못했어요.', '대사 가챠');
        }
    });
    clearButton.addEventListener('click', async () => {
        await clearBackgroundImage();
        syncImage();
        onChange();
    });
    syncImage();

    page.append(
        row('스타일', segmented('style', [['novel', '웹소설 발췌'], ['card', '어두운 카드']], onChange)),
        row('글꼴', fontSelect),
        row('글씨 크기', slider('fontScale', 60, 160, 5, onChange)),
        row('글씨 정렬', segmented('textAlign', [['left', '왼쪽'], ['center', '가운데'], ['right', '오른쪽']], onChange)),
        row('색', colorChoice, swatches),
        row('배경 사진', imageControls),
        dimRow,
    );
    return page;
}

/**
 * @param {() => void} onAppearanceChange Called after anything that changes the card's look.
 */
export function buildSettingsForm(onAppearanceChange) {
    const onChange = () => {
        saveSettings();
        onAppearanceChange();
    };

    const form = document.createElement('details');
    form.className = 'stdg_settings';
    form.innerHTML = `
        <summary><i class="fa-solid fa-sliders"></i> 설정</summary>
        <div class="stdg_tabs"><div class="stdg_tab" data-tab="0">대사</div><div class="stdg_tab" data-tab="1">꾸미기</div></div>
        <div class="stdg_pages"></div>`;
    const pages = [buildLinesPage(onChange), buildLookPage(onChange)];
    form.querySelector('.stdg_pages').append(...pages);

    const tabs = form.querySelectorAll('.stdg_tab');
    const showTab = (index) => {
        tabs.forEach((tab, i) => tab.classList.toggle('stdg_tab_active', i === index));
        pages.forEach((page, i) => { page.hidden = i !== index; });
    };
    tabs.forEach((tab, index) => tab.addEventListener('click', () => showTab(index)));
    showTab(0);
    return form;
}
