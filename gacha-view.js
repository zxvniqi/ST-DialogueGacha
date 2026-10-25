// Gacha popup: draw button -> charge -> flip reveal, plus settings and image export.
import { getSettings } from './settings.js';
import { resolveTheme, applyThemeToElement, loadBackgroundImage } from './appearance.js';
import { renderCardImage, downloadBlob } from './card-image.js';
import { buildSettingsForm } from './settings-form.js';

const CHARGE_MS = 1300;
const MIN_FIT = 0.4;
const FIT_STEP = 0.05;
const BURST_PARTICLES = 16;
const CAPTIONS = Object.freeze(['두근두근...', '과연 무슨 대사가...?', '두근두근...!', '나와라...!']);

function pickRandom(items, avoid) {
    if (items.length === 1) {
        return items[0];
    }
    let item;
    do {
        item = items[Math.floor(Math.random() * items.length)];
    } while (item.text === avoid?.text && item.messageId === avoid?.messageId);
    return item;
}

function buildStage() {
    const stage = document.createElement('div');
    stage.className = 'stdg_stage';
    stage.innerHTML = `
        <div class="stdg_card">
            <div class="stdg_face stdg_back"><span>?</span></div>
            <div class="stdg_face stdg_front">
                <blockquote class="stdg_quote"></blockquote>
                <div class="stdg_source"></div>
            </div>
        </div>
        <div class="stdg_burst"></div>
        <div class="stdg_caption">아래 버튼을 눌러 뽑아보세요</div>
        <div class="stdg_buttons">
            <div class="menu_button stdg_draw_button"><i class="fa-solid fa-dice"></i> 뽑기!</div>
            <div class="menu_button stdg_version_button" hidden><i class="fa-solid fa-language"></i> <span></span></div>
        </div>`;
    return stage;
}

function spawnBurst(container) {
    const fragment = document.createDocumentFragment();
    for (let i = 0; i < BURST_PARTICLES; i++) {
        const particle = document.createElement('span');
        particle.style.setProperty('--angle', `${(360 / BURST_PARTICLES) * i + Math.random() * 20}deg`);
        particle.style.setProperty('--dist', `${90 + Math.random() * 90}px`);
        fragment.append(particle);
    }
    container.replaceChildren(fragment);
}

/**
 * @param {object} sources
 * @param {() => object[]} sources.getCandidates Collects lines with the current settings (may show a toast and return []).
 * @param {(line: object) => object|null} sources.getOtherVersion The line in its other version (translation <-> original).
 */
export async function openGacha({ getCandidates, getOtherVersion }) {
    const { Popup, POPUP_TYPE } = SillyTavern.getContext();
    const settings = getSettings();
    await loadBackgroundImage();

    const root = document.createElement('div');
    root.className = 'stdg_root';
    const stage = buildStage();
    const card = stage.querySelector('.stdg_card');
    const caption = stage.querySelector('.stdg_caption');
    const burst = stage.querySelector('.stdg_burst');

    const quote = stage.querySelector('.stdg_quote');

    /** Shrinks long lines until they fit the card (the saved image copies this layout). */
    const fitQuote = () => {
        let fit = 1;
        stage.style.setProperty('--stdg-fit', '1');
        while (quote.scrollHeight > quote.clientHeight && fit > MIN_FIT) {
            fit -= FIT_STEP;
            stage.style.setProperty('--stdg-fit', String(fit));
        }
    };

    const applyAppearance = () => {
        stage.dataset.style = settings.style;
        stage.classList.toggle('stdg_no_effects', !settings.effects);
        applyThemeToElement(stage, resolveTheme(settings));
        fitQuote();
        // Fonts load lazily; refit once the new one arrives
        document.fonts?.ready.then(fitQuote);
    };
    applyAppearance();
    root.append(stage, buildSettingsForm(applyAppearance));

    let current = null;
    let revealTimer = 0;
    const versionButton = stage.querySelector('.stdg_version_button');

    const showLine = (line) => {
        current = line;
        quote.textContent = `${line.open}${line.text}${line.close}`;
        stage.querySelector('.stdg_source').textContent = `${line.name}, #${line.messageId}`;
        versionButton.hidden = !line.translatable;
        versionButton.querySelector('span').textContent = line.translated ? '원문 보기' : '번역문 보기';
        fitQuote();
    };

    const reveal = () => {
        clearTimeout(revealTimer);
        if (!stage.classList.contains('stdg_charging')) {
            return;
        }
        stage.classList.remove('stdg_charging');
        stage.classList.add('stdg_revealed');
        caption.textContent = '';
        if (settings.effects) {
            spawnBurst(burst);
        }
    };

    const draw = () => {
        const lines = getCandidates();
        if (lines.length === 0) {
            return;
        }
        showLine(pickRandom(lines, current));
        burst.replaceChildren();

        // Snap back to the card back without animating, so the new line isn't spoiled mid-flip
        stage.classList.add('stdg_instant');
        stage.classList.remove('stdg_revealed', 'stdg_charging');
        void stage.offsetWidth; // apply the reset and restart CSS animations
        stage.classList.remove('stdg_instant');
        stage.classList.add('stdg_charging');
        caption.textContent = CAPTIONS[Math.floor(Math.random() * CAPTIONS.length)];
        revealTimer = setTimeout(reveal, settings.effects ? CHARGE_MS : 0);
    };

    const saveImage = async () => {
        if (!current) {
            toastr.info('먼저 뽑아주세요.', '대사 가챠');
            return;
        }
        try {
            const blob = await renderCardImage(stage.querySelector('.stdg_front'), resolveTheme(settings));
            downloadBlob(blob, `dialogue_${current.name}_${current.messageId}.png`);
        } catch (error) {
            console.error('[st_dialogue_gacha] Image export failed', error);
            toastr.error('이미지를 저장하지 못했습니다.', '대사 가챠');
        }
    };

    stage.querySelector('.stdg_draw_button').addEventListener('click', draw);
    versionButton.addEventListener('click', () => {
        const other = current && getOtherVersion(current);
        if (other) {
            showLine(other);
        } else {
            toastr.info('이 대사의 다른 버전을 찾지 못했어요.', '대사 가챠');
        }
    });
    // Tap the card while it charges to skip the wait
    card.addEventListener('click', reveal);

    const popup = new Popup(root, POPUP_TYPE.TEXT, '', {
        okButton: '닫기',
        allowVerticalScrolling: true,
        customButtons: [{ text: '이미지 저장', icon: 'fa-download', action: saveImage }],
    });
    await popup.show();
    clearTimeout(revealTimer);
}
