// Renders a drawn line to a PNG with plain canvas (no external libraries).

const WIDTH = 1080;
const HEIGHT = 1350;
const PADDING = 120;
const SERIF = '"Noto Serif KR", "Nanum Myeongjo", "Batang", "Times New Roman", serif';
const SANS = '"Noto Sans KR", "Malgun Gothic", "Apple SD Gothic Neo", sans-serif';

const THEMES = Object.freeze({
    novel: { background: '#f6f1e7', text: '#2b2620', sub: '#7a6f61', rule: '#cbbfa9', font: SERIF },
    card: { background: '#14151c', text: '#f3f1ec', sub: '#b9b4aa', rule: null, font: SANS },
});

/** Wraps text to a width, preferring spaces but breaking anywhere for CJK runs. */
function wrapText(ctx, text, maxWidth) {
    const lines = [];
    let line = '';
    for (const char of text) {
        const next = line + char;
        if (ctx.measureText(next).width <= maxWidth || !line) {
            line = next;
            continue;
        }
        const lastSpace = line.lastIndexOf(' ');
        if (char !== ' ' && lastSpace > 0) {
            lines.push(line.slice(0, lastSpace));
            line = line.slice(lastSpace + 1) + char;
        } else {
            lines.push(line);
            line = char === ' ' ? '' : char;
        }
    }
    if (line) {
        lines.push(line);
    }
    return lines;
}

/** Picks the largest font size (within bounds) whose wrapped text fits the box. */
function fitText(ctx, text, family, maxWidth, maxHeight) {
    for (let size = 64; size >= 28; size -= 4) {
        ctx.font = `${size}px ${family}`;
        const lines = wrapText(ctx, text, maxWidth);
        const lineHeight = size * 1.6;
        if (lines.length * lineHeight <= maxHeight) {
            return { size, lines, lineHeight };
        }
    }
    const size = 28;
    ctx.font = `${size}px ${family}`;
    return { size, lines: wrapText(ctx, text, maxWidth), lineHeight: size * 1.6 };
}

function drawCardFrame(ctx, rarity) {
    const gradient = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
    gradient.addColorStop(0, '#1d1f2b');
    gradient.addColorStop(1, '#0d0e14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    ctx.strokeStyle = rarity.color;
    ctx.lineWidth = 10;
    ctx.strokeRect(40, 40, WIDTH - 80, HEIGHT - 80);
    ctx.globalAlpha = 0.35;
    ctx.lineWidth = 2;
    ctx.strokeRect(62, 62, WIDTH - 124, HEIGHT - 124);
    ctx.globalAlpha = 1;

    ctx.fillStyle = rarity.color;
    ctx.font = `bold 44px ${SANS}`;
    ctx.textAlign = 'center';
    ctx.fillText(`${rarity.id}  ${'★'.repeat(rarity.stars)}`, WIDTH / 2, 150);
}

/**
 * @param {{ text: string, open: string, close: string, name: string, messageId: number }} line
 * @param {{ id: string, stars: number, color: string }} rarity
 * @param {'novel'|'card'} style
 * @returns {Promise<Blob>}
 */
export async function renderCardImage(line, rarity, style) {
    await document.fonts?.ready;
    const theme = THEMES[style] ?? THEMES.novel;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    if (style === 'card') {
        drawCardFrame(ctx, rarity);
    } else {
        ctx.fillStyle = theme.background;
        ctx.fillRect(0, 0, WIDTH, HEIGHT);
    }

    const quote = `${line.open}${line.text}${line.close}`;
    const boxTop = 260;
    const boxHeight = HEIGHT - boxTop - 360;
    const { lines, lineHeight } = fitText(ctx, quote, theme.font, WIDTH - PADDING * 2, boxHeight);

    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const blockTop = boxTop + (boxHeight - lines.length * lineHeight) / 2;
    lines.forEach((text, index) => ctx.fillText(text, WIDTH / 2, blockTop + lineHeight * (index + 0.5)));

    const footerY = HEIGHT - 230;
    if (theme.rule) {
        ctx.strokeStyle = theme.rule;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(WIDTH / 2 - 60, footerY - 50);
        ctx.lineTo(WIDTH / 2 + 60, footerY - 50);
        ctx.stroke();
    }
    ctx.fillStyle = theme.sub;
    ctx.font = `36px ${theme.font}`;
    ctx.fillText(`${line.name}, #${line.messageId}`, WIDTH / 2, footerY);

    return new Promise((resolve, reject) => {
        canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Canvas export failed')), 'image/png');
    });
}

export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
}
