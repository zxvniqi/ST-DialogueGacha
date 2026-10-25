// Renders the drawn card to a PNG with plain canvas (no external libraries).
// The layout is measured from the card on screen (line breaks, positions, font sizes), so the
// image matches what the user sees exactly, just at a higher resolution.

const SIZE = 1080; // square image

/** Splits an element's text into the lines the browser laid it out in. */
function measureLines(element, origin) {
    const lines = [];
    const range = document.createRange();
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        for (let i = 0; i < node.textContent.length; i++) {
            range.setStart(node, i);
            range.setEnd(node, i + 1);
            const rect = range.getClientRects()[0];
            if (!rect || rect.width === 0) {
                continue; // collapsed whitespace
            }
            const char = node.textContent[i];
            const last = lines[lines.length - 1];
            if (last && Math.abs(rect.top - last.top) < rect.height / 2) {
                last.text += char;
                last.right = rect.right;
            } else if (char.trim()) {
                // A line starts at its first visible character (spaces at a wrap don't count)
                lines.push({ text: char, top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right });
            }
        }
    }
    return lines.map(line => ({
        text: line.text.trim(),
        x: line.left - origin.left,
        y: (line.top + line.bottom) / 2 - origin.top,
    }));
}

function fontOf(element, scale) {
    const style = getComputedStyle(element);
    return `${style.fontStyle} ${style.fontWeight} ${parseFloat(style.fontSize) * scale}px ${style.fontFamily}`;
}

/**
 * Measures the card face on an untransformed copy (the real one may be mid-flip or shaking).
 * @param {HTMLElement} front The card's front face
 */
async function measureCard(front) {
    const width = front.offsetWidth;
    const height = front.offsetHeight;
    const copy = front.cloneNode(true);
    Object.assign(copy.style, {
        position: 'fixed', left: '-10000px', top: '0', width: `${width}px`, height: `${height}px`,
        transform: 'none', backfaceVisibility: 'visible',
    });
    // Inside the stage, so the theme's CSS variables still apply
    front.closest('.stdg_stage').append(copy);
    try {
        const quote = copy.querySelector('.stdg_quote');
        const source = copy.querySelector('.stdg_source');
        await document.fonts?.load?.(getComputedStyle(quote).font, quote.textContent).catch(() => {});
        const origin = copy.getBoundingClientRect();
        const scale = SIZE / width;
        const ruleStyle = getComputedStyle(source, '::before');
        return {
            scale,
            quote: { font: fontOf(quote, scale), lines: measureLines(quote, origin) },
            source: { font: fontOf(source, scale), lines: measureLines(source, origin), opacity: Number(getComputedStyle(source).opacity) },
            rule: {
                y: source.getBoundingClientRect().top - origin.top,
                width: parseFloat(ruleStyle.width) || 0,
                opacity: Number(ruleStyle.opacity) || 1,
            },
        };
    } finally {
        copy.remove();
    }
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
    const scale = Math.max(SIZE / image.width, SIZE / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    ctx.drawImage(image, (SIZE - width) / 2, (SIZE - height) / 2, width, height);
}

async function drawBackground(ctx, theme) {
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, SIZE, SIZE);
    if (!theme.image) {
        return;
    }
    drawCover(ctx, await loadImage(theme.image));
    // Wash the image with the background color so the text stays readable
    ctx.globalAlpha = theme.dim;
    ctx.fillStyle = theme.background;
    ctx.fillRect(0, 0, SIZE, SIZE);
    ctx.globalAlpha = 1;
}

function drawLines(ctx, { font, lines }, scale) {
    ctx.font = font;
    for (const line of lines) {
        ctx.fillText(line.text, line.x * scale, line.y * scale);
    }
}

/**
 * @param {HTMLElement} front The on-screen card front showing the drawn line
 * @param {{ background: string, text: string, image: string|null, dim: number }} theme
 * @returns {Promise<Blob>}
 */
export async function renderCardImage(front, theme) {
    const layout = await measureCard(front);
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d');

    await drawBackground(ctx, theme);
    ctx.fillStyle = theme.text;
    ctx.strokeStyle = theme.text;
    // Lines are drawn from their measured left edge, so any on-screen alignment carries over
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';

    drawLines(ctx, layout.quote, layout.scale);

    ctx.globalAlpha = layout.source.opacity;
    drawLines(ctx, layout.source, layout.scale);
    if (layout.rule.width > 0) {
        const halfWidth = (layout.rule.width * layout.scale) / 2;
        const y = layout.rule.y * layout.scale;
        ctx.globalAlpha = layout.source.opacity * layout.rule.opacity;
        ctx.lineWidth = Math.max(1, layout.scale);
        ctx.beginPath();
        ctx.moveTo(SIZE / 2 - halfWidth, y);
        ctx.lineTo(SIZE / 2 + halfWidth, y);
        ctx.stroke();
    }
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
