// Collects quoted dialogue lines from the current chat.

const MAX_LINE_LENGTH = 300;

/** Quote styles the user can toggle; each style may cover several bracket pairs. */
export const QUOTE_STYLES = Object.freeze({
    double: [['"', '"'], ['“', '”']],
    corner: [['「', '」'], ['『', '』']],
});

function escapeRegex(text) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function buildPatterns(enabledStyles) {
    const pairs = enabledStyles.flatMap(style => QUOTE_STYLES[style] ?? []);
    return pairs.map(([open, close]) => ({
        open,
        close,
        regex: new RegExp(`${escapeRegex(open)}([^${escapeRegex(close)}\\n]{1,${MAX_LINE_LENGTH}})${escapeRegex(close)}`, 'g'),
    }));
}

/**
 * Drops code blocks and block containers typically used for status panels, then strips
 * remaining tags (inline tags like <font>/<span> often wrap real dialogue, so keep their text).
 */
function stripMarkup(text) {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<(style|script|details|table|pre)\b[\s\S]*?<\/\1>/gi, ' ')
        .replace(/<[^>]+>/g, ' ');
}

/**
 * @param {object[]} chat ST chat array
 * @param {{ styles: string[], includeHidden: boolean, includeUser: boolean, minLength: number }} options
 * @returns {{ text: string, open: string, close: string, name: string, messageId: number }[]}
 */
export function collectLines(chat, { styles, includeHidden, includeUser, minLength }) {
    const patterns = buildPatterns(styles);
    const lines = [];
    if (patterns.length === 0) {
        return lines;
    }

    chat.forEach((message, messageId) => {
        if (!message?.mes || (message.is_system && !includeHidden) || (message.is_user && !includeUser)) {
            return;
        }
        const text = stripMarkup(message.mes);
        for (const { open, close, regex } of patterns) {
            for (const match of text.matchAll(regex)) {
                const line = match[1].trim();
                if (line.length >= minLength) {
                    lines.push({ text: line, open, close, name: message.name ?? '', messageId });
                }
            }
        }
    });
    return lines;
}
