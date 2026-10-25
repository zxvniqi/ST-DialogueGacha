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
 * The translate extension keeps the original in `mes` and the translation shown on screen
 * in `extra.display_text`.
 */
function getMessageText(message, useTranslation) {
    return (useTranslation && message.extra?.display_text) || message.mes;
}

/** Drops markdown emphasis (**bold**, *italic*, ~~strike~~, __under__) so the card shows plain text. */
function cleanLine(text) {
    return text
        .replace(/(\*{1,3}|~~|__)(.+?)\1/g, '$2')
        .replace(/\*+/g, '')
        .replace(/ {2,}/g, ' ')
        .trim();
}

/**
 * All quoted lines of one message, in a stable order. `index` is the position in that order,
 * so the same line can be found again in the other version (translation / original).
 */
function linesOfMessage(message, messageId, patterns, useTranslation) {
    const translatable = Boolean(message.extra?.display_text);
    const translated = useTranslation && translatable;
    const text = stripMarkup(getMessageText(message, useTranslation));
    const lines = [];
    for (const { open, close, regex } of patterns) {
        for (const match of text.matchAll(regex)) {
            lines.push({
                text: cleanLine(match[1]),
                open,
                close,
                name: message.name ?? '',
                messageId,
                index: lines.length,
                translatable,
                translated,
            });
        }
    }
    return lines;
}

/**
 * @param {object[]} chat ST chat array
 * @param {{ styles: string[], includeHidden: boolean, includeUser: boolean, minLength: number, useTranslation: boolean }} options
 */
export function collectLines(chat, { styles, includeHidden, includeUser, minLength, useTranslation }) {
    const patterns = buildPatterns(styles);
    const lines = [];
    if (patterns.length === 0) {
        return lines;
    }

    chat.forEach((message, messageId) => {
        if (!message?.mes || (message.is_system && !includeHidden) || (message.is_user && !includeUser)) {
            return;
        }
        for (const line of linesOfMessage(message, messageId, patterns, useTranslation)) {
            if (line.text.length >= minLength) {
                lines.push(line);
            }
        }
    });
    return lines;
}

/**
 * The same line in the message's other version (original <-> translation), matched by position.
 * Falls back to the nearest position when the versions have a different number of quotes.
 * @returns {object|null}
 */
export function getCounterpart(chat, line, styles) {
    const message = chat[line.messageId];
    if (!message?.extra?.display_text) {
        return null;
    }
    const others = linesOfMessage(message, line.messageId, buildPatterns(styles), !line.translated);
    return others[Math.min(line.index, others.length - 1)] ?? null;
}
