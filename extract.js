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
 * Folded <details> keep their content: some cards fold the whole story, and translators may
 * drop the fold, so only its <summary> title is left out.
 */
function stripMarkup(text) {
    return text
        .replace(/```[\s\S]*?```/g, ' ')
        .replace(/<(style|script|summary|table|pre)\b[\s\S]*?<\/\1>/gi, ' ')
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
 * All quoted lines of one message in reading order. `start` is where the line sits in its
 * version's text, so the same line can be found again in the other version (translation / original).
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
                start: match.index,
                translatable,
                translated,
            });
        }
    }
    return lines.sort((a, b) => a.start - b.start);
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
 * The same line in the message's other version (original <-> translation), matched by its place
 * among the message's quotes. Every quote style counts on both sides, since a translation often
 * changes the quote marks (e.g. 「」 in a Japanese original, "" in the Korean translation).
 * When the versions have a different number of quotes, the proportional place is used.
 * @returns {object|null}
 */
export function getCounterpart(chat, line) {
    const message = chat[line.messageId];
    if (!message?.extra?.display_text) {
        return null;
    }
    const patterns = buildPatterns(Object.keys(QUOTE_STYLES));
    const own = linesOfMessage(message, line.messageId, patterns, line.translated);
    const others = linesOfMessage(message, line.messageId, patterns, !line.translated);
    const index = Math.max(0, own.findIndex(other => other.start === line.start));
    const scaled = own.length > 1 ? Math.round(index * (others.length - 1) / (own.length - 1)) : 0;
    return others[Math.min(scaled, others.length - 1)] ?? null;
}
