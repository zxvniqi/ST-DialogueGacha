// Gacha popup: charge -> flip reveal -> result, with reroll and image export.
import { rollRarity } from './rarity.js';
import { renderCardImage, downloadBlob } from './card-image.js';

const CHARGE_MS = 1300;
const BURST_PARTICLES = 16;
const CAPTIONS = Object.freeze({
    N: '두근두근...',
    R: '두근두근...!',
    SR: '보랏빛이 감돈다...!',
    SSR: '✨ 무언가 반짝인다...!!',
});

function pickRandom(items, avoid) {
    if (items.length === 1) {
        return items[0];
    }
    let item;
    do {
        item = items[Math.floor(Math.random() * items.length)];
    } while (item === avoid);
    return item;
}

function buildStage(style) {
    const stage = document.createElement('div');
    stage.className = 'stdg_stage';
    stage.dataset.style = style;
    stage.innerHTML = `
        <div class="stdg_card">
            <div class="stdg_face stdg_back"><span>?</span></div>
            <div class="stdg_face stdg_front">
                <div class="stdg_rarity"></div>
                <blockquote class="stdg_quote"></blockquote>
                <div class="stdg_source"></div>
            </div>
        </div>
        <div class="stdg_burst"></div>
        <div class="stdg_caption"></div>`;
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
 * @param {object[]} lines Candidates from collectLines()
 * @param {{ style: 'novel'|'card', effects: boolean }} options
 */
export async function openGacha(lines, { style, effects }) {
    const { Popup, POPUP_TYPE } = SillyTavern.getContext();
    const stage = buildStage(style);
    const card = stage.querySelector('.stdg_card');
    const caption = stage.querySelector('.stdg_caption');
    const burst = stage.querySelector('.stdg_burst');

    let current = null;
    let revealTimer = 0;

    const reveal = () => {
        clearTimeout(revealTimer);
        if (!stage.classList.contains('stdg_charging')) {
            return;
        }
        stage.classList.remove('stdg_charging');
        stage.classList.add('stdg_revealed');
        caption.textContent = '';
        if (effects) {
            spawnBurst(burst);
        }
    };

    const draw = () => {
        const line = pickRandom(lines, current?.line);
        const rarity = rollRarity();
        current = { line, rarity };

        stage.style.setProperty('--stdg-color', rarity.color);
        stage.dataset.rarity = rarity.id;
        stage.querySelector('.stdg_rarity').textContent = `${rarity.id} ${'★'.repeat(rarity.stars)}`;
        stage.querySelector('.stdg_quote').textContent = `${line.open}${line.text}${line.close}`;
        stage.querySelector('.stdg_source').textContent = `${line.name}, #${line.messageId}`;
        burst.replaceChildren();

        // Snap back to the card back without animating, so the new line isn't spoiled mid-flip
        stage.classList.add('stdg_instant');
        stage.classList.remove('stdg_revealed', 'stdg_charging');
        void stage.offsetWidth; // apply the reset and restart CSS animations
        stage.classList.remove('stdg_instant');
        stage.classList.add('stdg_charging');
        caption.textContent = CAPTIONS[rarity.id];
        revealTimer = setTimeout(reveal, effects ? CHARGE_MS : 0);
    };

    const saveImage = async () => {
        if (!current) {
            return;
        }
        try {
            const blob = await renderCardImage(current.line, current.rarity, style);
            downloadBlob(blob, `dialogue_${current.line.name}_${current.line.messageId}.png`);
        } catch (error) {
            console.error('[st_dialogue_gacha] Image export failed', error);
            toastr.error('이미지를 저장하지 못했습니다.', '대사 가챠');
        }
    };

    // Tap the card while it charges to skip the wait
    stage.addEventListener('click', reveal);
    stage.classList.toggle('stdg_no_effects', !effects);

    const popup = new Popup(stage, POPUP_TYPE.TEXT, '', {
        okButton: '닫기',
        customButtons: [
            { text: '다시 뽑기', icon: 'fa-rotate-right', action: draw },
            { text: '이미지 저장', icon: 'fa-download', action: saveImage },
        ],
    });

    draw();
    await popup.show();
    clearTimeout(revealTimer);
}
