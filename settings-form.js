// Settings section shown inside the gacha popup.
import { getSettings, saveSettings, getDefault } from './settings.js';
import { saveBackgroundImage, clearBackgroundImage, WEB_FONT_PREFIX } from './appearance.js';
import { WEB_FONTS, previewFamily, loadPreviewFonts } from './fonts.js';
import { createInlineSelect } from './inline-select.js';

const checkbox = (key, label) => `
    <label class="checkbox_label"><input type="checkbox" data-setting="${key}"><span>${label}</span></label>`;
const selectSlot = (key, label) => `
    <div class="stdg_row stdg_row_top"><span>${label}</span><div class="stdg_select_slot" data-select="${key}"></div></div>`;

const FORM_HTML = `
    <summary>설정</summary>
    <div class="stdg_form">
        <b>대사 기호</b>
        ${checkbox('quoteDouble', '"큰따옴표"')}
        ${checkbox('quoteCorner', '「낫표」')}

        <b>범위</b>
        ${checkbox('includeHidden', '숨긴(눈 감은) 메시지 포함')}
        ${checkbox('includeUser', '내(유저) 대사 포함')}
        <label class="stdg_row"><span>최소 글자 수</span>
            <input class="text_pole" type="number" min="1" max="100" data-setting="minLength"></label>
        ${selectSlot('useTranslation', '먼저 보일 버전')}

        <b>꾸미기</b>
        ${selectSlot('style', '스타일')}
        ${selectSlot('fontChoice', '글꼴')}
        <label class="stdg_row"><span>글씨 크기 <small class="stdg_scale_value"></small></span>
            <input type="range" min="60" max="160" step="5" data-setting="fontScale"></label>
        ${checkbox('customColors', '색 직접 정하기')}
        <div class="stdg_row stdg_colors">
            <label>배경 <input type="color" data-setting="bgColor"></label>
            <label>글자 <input type="color" data-setting="textColor"></label>
        </div>
        <div class="stdg_row"><span>배경 이미지</span>
            <label class="menu_button stdg_small_button">고르기<input type="file" accept="image/*" class="stdg_image_input" hidden></label>
            <div class="menu_button stdg_small_button stdg_image_clear">지우기</div>
        </div>
        <label class="stdg_row"><span>이미지 흐리게</span>
            <input type="range" min="0" max="90" step="5" data-setting="bgDim"></label>
        ${checkbox('effects', '뽑기 연출')}
    </div>`;

/** Options for the list-style selects; values are strings, `parse` turns them back into settings. */
const SELECTS = {
    useTranslation: {
        options: [
            { value: 'true', label: '번역본 (화면에 보이는 글)' },
            { value: 'false', label: '원문' },
        ],
        parse: value => value === 'true',
    },
    style: {
        options: [
            { value: 'novel', label: '웹소설 발췌' },
            { value: 'card', label: '어두운 카드' },
        ],
    },
    fontChoice: {
        options: [
            { value: 'style', label: '스타일 기본', group: '기본' },
            { value: 'serif', label: '명조 (기기 내장)', group: '기본' },
            { value: 'sans', label: '고딕 (기기 내장)', group: '기본' },
            { value: 'ui', label: '실리 채팅 글꼴', group: '기본' },
            ...WEB_FONTS.map(({ family, label }) => ({
                value: `${WEB_FONT_PREFIX}${family}`,
                label,
                group: '무료 글꼴 (인터넷 필요)',
                fontFamily: `${previewFamily(family)}, sans-serif`,
            })),
        ],
        onOpen: loadPreviewFonts,
    },
};

function readValue(input) {
    if (input.type === 'checkbox') {
        return input.checked;
    }
    if (input.type === 'number') {
        return Math.max(1, Number(input.value) || getDefault(input.dataset.setting));
    }
    if (input.type === 'range') {
        return Number(input.value);
    }
    return input.value;
}

/**
 * @param {() => void} onAppearanceChange Called after anything that changes the card's look.
 */
export function buildSettingsForm(onAppearanceChange) {
    const settings = getSettings();
    const form = document.createElement('details');
    form.className = 'stdg_settings';
    form.innerHTML = FORM_HTML;

    const colorRow = form.querySelector('.stdg_colors');
    const scaleValue = form.querySelector('.stdg_scale_value');
    const syncDependentRows = () => {
        colorRow.classList.toggle('stdg_disabled', !settings.customColors);
        scaleValue.textContent = `${settings.fontScale}%`;
    };

    for (const input of form.querySelectorAll('[data-setting]')) {
        const value = settings[input.dataset.setting];
        input.type === 'checkbox' ? (input.checked = value) : (input.value = String(value));
    }
    for (const slot of form.querySelectorAll('[data-select]')) {
        const key = slot.dataset.select;
        const { options, parse, onOpen } = SELECTS[key];
        slot.append(createInlineSelect({
            options,
            value: String(settings[key]),
            onOpen,
            onChange: (value) => {
                settings[key] = parse ? parse(value) : value;
                saveSettings();
                onAppearanceChange();
            },
        }));
    }
    syncDependentRows();

    form.addEventListener('input', (event) => {
        const input = event.target;
        const key = input.dataset?.setting;
        if (!key) {
            return;
        }
        settings[key] = readValue(input);
        if (input.type === 'number') {
            input.value = String(settings[key]);
        }
        syncDependentRows();
        saveSettings();
        onAppearanceChange();
    });

    form.querySelector('.stdg_image_input').addEventListener('change', async (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        if (!file) {
            return;
        }
        try {
            await saveBackgroundImage(file);
            onAppearanceChange();
        } catch (error) {
            console.error('[st_dialogue_gacha] Could not load image', error);
            toastr.error('이미지를 불러오지 못했어요.', '대사 가챠');
        }
    });
    form.querySelector('.stdg_image_clear').addEventListener('click', async () => {
        await clearBackgroundImage();
        onAppearanceChange();
    });

    return form;
}
