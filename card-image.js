// Renders a drawn line to a PNG with plain canvas (no external libraries).

// Square image; the footer (rule + source) sits near the bottom, the quote fills the space above.
const WIDTH = 1080;
const HEIGHT = 1080;
const PADDING = 130;
const BOX_TOP = 130;
const FOOTER_Y = HEIGHT - 150;
const RULE_GAP = 50;

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
    let size = 54;
    let lines;
    for (; size >= 26; size -= 4) {
        ctx.font = `${size}px ${family}`;
        lines = wrapText(ctx, text, maxWidth);
        if (lines.length * size * 1.6 <= maxHeight) {
            break;
        }
    }
    size = Math.max(size, 26);
    return { lines, lineHeight: size * 1.6 };
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = reject;
        image.src = src;
    });
}

/** Draws the image scaled to cover the canvas, like CSS background-size: cover. */
function drawCover(ctx, image) {
    const scale = Math.max(WIDTH / image.width, HEIGHT / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (WIDTH - width) / 2, (HEIGHT - height) / 2, width, height);
}

async function drawBackground(ctx, theme) {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    if (!theme.image) {
        return;
    }
    drawCover(ctx, await loadImage(theme.image));
    // Wash the image with the background color so the text stays readable
    ctx.globalAlpha = theme.dim;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);
    ctx.globalAlpha = 1;
}

/**
 * @param {{ text: string, open: string, close: string, name: string, messageId: number }} line
 * @param {{ background: string, text: string, font: string, image: string|null, dim: number }} theme
 * @returns {Promise<Blob>}
 */
export async function renderCardImage(line, theme) {
    await document.fonts?.ready;
    const canvas = document.createElement('canvas');
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, theme);

    const quote = `${line.open}${line.text}${line.close}`;
    const boxTop = BOX_TOP;
    const boxHeight = FOOTER_Y - RULE_GAP * 2 - boxTop;
    const { lines, lineHeight } = fitText(ctx, quote, theme.font, WIDTH - PADDING * 2, boxHeight);

    ctx.fillStyle = theme.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const blockTop = boxTop + (boxHeight - lines.length * lineHeight) / 2;
    lines.forEach((text, index) => ctx.fillText(text, WIDTH / 2, blockTop + lineHeight * (index + 0.5)));

    const footerY = FOOTER_Y;
    ctx.globalAlpha = 0.45;
    ctx.strokeStyle = theme.text;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(WIDTH / 2 - 60, footerY - RULE_GAP);
    ctx.lineTo(WIDTH / 2 + 60, footerY - RULE_GAP);
    ctx.stroke();
    ctx.globalAlpha = 0.75;
    ctx.font = `32px ${theme.font}`;
    ctx.fillText(`${line.name}, #${line.messageId}`, WIDTH / 2, footerY);
    ctx.globalAlpha = 1;

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
