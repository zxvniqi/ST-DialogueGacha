// Dialogue Gacha: draws a random quoted line from the current chat.
import { collectLines } from './extract.js';
import { openGacha } from './gacha-view.js';

const MODULE = 'st_dialogue_gacha';

const defaultSettings = Object.freeze({
    quoteDouble: true,
    quoteCorner: true,
    includeHidden: false,
    includeUser: false,
    minLength: 2,
    style: 'novel',
    effects: true,
});

function getSettings() {
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

async function runGacha() {
    const { chat, getCurrentChatId } = SillyTavern.getContext();
    if (!getCurrentChatId()) {
        toastr.info('채팅을 먼저 열어주세요.', '대사 가챠');
        return;
    }
    const settings = getSettings();
    const styles = [settings.quoteDouble && 'double', settings.quoteCorner && 'corner'].filter(Boolean);
    if (styles.length === 0) {
        toastr.info('대사 기호를 하나 이상 골라주세요.', '대사 가챠');
        return;
    }
    const lines = collectLines(chat, {
        styles,
        includeHidden: settings.includeHidden,
        includeUser: settings.includeUser,
        minLength: settings.minLength,
    });
    if (lines.length === 0) {
        toastr.info('뽑을 수 있는 대사가 없어요.', '대사 가챠');
        return;
    }
    await openGacha(lines, { style: settings.style, effects: settings.effects });
}

function addMenuButton() {
    const menu = document.getElementById('extensionsMenu');
    if (!menu) {
        return;
    }
    const item = document.createElement('div');
    item.id = `${MODULE}_menu`;
    item.className = 'list-group-item flex-container flexGap5 interactable';
    item.tabIndex = 0;
    item.innerHTML = '<div class="fa-solid fa-dice extensionsMenuExtensionButton"></div><span>대사 가챠</span>';
    item.addEventListener('click', runGacha);
    menu.append(item);
}

function registerSlashCommand() {
    const { SlashCommandParser, SlashCommand } = SillyTavern.getContext();
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'dgacha',
        callback: async () => {
            await runGacha();
            return '';
        },
        helpString: '<div>Draws a random quoted line from the current chat (Dialogue Gacha).</div>',
    }));
}

function createSettingsUI() {
    const container = document.getElementById('extensions_settings2');
    if (!container) {
        return;
    }
    const checkbox = (key, label) => `
        <label class="checkbox_label"><input type="checkbox" data-setting="${key}"><span>${label}</span></label>`;

    container.insertAdjacentHTML('beforeend', `
        <div id="${MODULE}_settings" class="extension_settings">
            <div class="inline-drawer">
                <div class="inline-drawer-toggle inline-drawer-header">
                    <b>대사 가챠</b>
                    <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
                </div>
                <div class="inline-drawer-content">
                    <b>대사 기호</b>
                    ${checkbox('quoteDouble', '"큰따옴표"')}
                    ${checkbox('quoteCorner', '「낫표」')}
                    <b>범위</b>
                    ${checkbox('includeHidden', '숨긴(눈 감은) 메시지 포함')}
                    ${checkbox('includeUser', '내(유저) 대사 포함')}
                    <label class="stdg_row">
                        <span>최소 글자 수</span>
                        <input class="text_pole" type="number" min="1" max="100" data-setting="minLength">
                    </label>
                    <b>표시</b>
                    <label class="stdg_row">
                        <span>스타일</span>
                        <select class="text_pole" data-setting="style">
                            <option value="novel">웹소설 발췌</option>
                            <option value="card">가챠 카드</option>
                        </select>
                    </label>
                    ${checkbox('effects', '뽑기 연출')}
                    <div class="menu_button stdg_run"><i class="fa-solid fa-dice"></i> 지금 뽑기</div>
                </div>
            </div>
        </div>`);

    const settings = getSettings();
    const panel = document.getElementById(`${MODULE}_settings`);
    for (const input of panel.querySelectorAll('[data-setting]')) {
        const value = settings[input.dataset.setting];
        input.type === 'checkbox' ? (input.checked = value) : (input.value = value);
    }
    panel.addEventListener('change', (event) => {
        const input = event.target;
        const key = input.dataset?.setting;
        if (!key) {
            return;
        }
        if (input.type === 'checkbox') {
            settings[key] = input.checked;
        } else if (input.type === 'number') {
            settings[key] = Math.max(1, Number(input.value) || defaultSettings[key]);
            input.value = settings[key];
        } else {
            settings[key] = input.value;
        }
        SillyTavern.getContext().saveSettingsDebounced();
    });
    panel.querySelector('.stdg_run').addEventListener('click', runGacha);
}

(function init() {
    addMenuButton();
    registerSlashCommand();
    createSettingsUI();
})();
