// Dialogue Gacha: draws a random quoted line from the current chat.
import { MODULE, getSettings } from './settings.js';
import { collectLines } from './extract.js';
import { openGacha } from './gacha-view.js';

/** Collects lines with the current settings; explains via toast when nothing can be drawn. */
function getCandidates() {
    const { chat, getCurrentChatId } = SillyTavern.getContext();
    if (!getCurrentChatId()) {
        toastr.info('채팅을 먼저 열어주세요.', '대사 가챠');
        return [];
    }
    const settings = getSettings();
    const styles = [settings.quoteDouble && 'double', settings.quoteCorner && 'corner'].filter(Boolean);
    if (styles.length === 0) {
        toastr.info('대사 기호를 하나 이상 골라주세요.', '대사 가챠');
        return [];
    }
    const lines = collectLines(chat, {
        styles,
        includeHidden: settings.includeHidden,
        includeUser: settings.includeUser,
        minLength: settings.minLength,
        useTranslation: settings.useTranslation,
    });
    if (lines.length === 0) {
        toastr.info('뽑을 수 있는 대사가 없어요.', '대사 가챠');
    }
    return lines;
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
    item.addEventListener('click', () => openGacha(getCandidates));
    menu.append(item);
}

function registerSlashCommand() {
    const { SlashCommandParser, SlashCommand } = SillyTavern.getContext();
    SlashCommandParser.addCommandObject(SlashCommand.fromProps({
        name: 'dgacha',
        callback: async () => {
            await openGacha(getCandidates);
            return '';
        },
        helpString: '<div>Opens the Dialogue Gacha popup for the current chat.</div>',
    }));
}

(function init() {
    getSettings();
    addMenuButton();
    registerSlashCommand();
})();
