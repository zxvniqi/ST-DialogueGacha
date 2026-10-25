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
        // Real tags only: emoticons like ( >///< ) must not swallow the text up to the next ">"
        .replace(/<\/?[A-Za-z][^<>]*>/g, ' ');
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

// Parts a translation keeps: Latin words, numbers, and expressive punctuation
const KEPT_TOKEN = /[A-Za-z]{2,}|\d+|[!！?？…~～♡『』【】()（）]/g;

/** How alike two quotes of different languages look (0..2): shared kept parts + similar length share. */
function similarity(a, b) {
    const tokensA = new Set(a.text.match(KEPT_TOKEN));
    const tokensB = new Set(b.text.match(KEPT_TOKEN));
    const union = new Set([...tokensA, ...tokensB]).size;
    const shared = [...tokensA].filter(token => tokensB.has(token)).length;
    return (union === 0 ? 0.3 : shared / union) + Math.min(a.share, b.share) / Math.max(a.share, b.share);
}

/**
 * Pairs the quotes of two versions with the highest total similarity, in order. Quotes only one
 * side has (e.g. a nested 『』 kept in just one version) stay unpaired instead of shifting the rest.
 * @returns {number[]} for each `from` quote, the index of its `to` quote or -1
 */
function alignQuotes(from, to) {
    const withShare = (lines) => {
        const total = lines.reduce((sum, line) => sum + line.text.length, 0) || 1;
        return lines.map(line => ({ text: line.text, share: line.text.length / total }));
    };
    const a = withShare(from);
    const b = withShare(to);
    const best = Array.from({ length: a.length + 1 }, () => new Float64Array(b.length + 1));
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            best[i][j] = Math.max(best[i - 1][j - 1] + similarity(a[i - 1], b[j - 1]), best[i - 1][j], best[i][j - 1]);
        }
    }
    const result = new Array(a.length).fill(-1);
    for (let i = a.length, j = b.length; i > 0 && j > 0;) {
        if (best[i][j] === best[i - 1][j]) {
            i--;
        } else if (best[i][j] === best[i][j - 1]) {
            j--;
        } else {
            result[--i] = --j;
        }
    }
    return result;
}

/**
 * The same line in the message's other version (original <-> translation). Every quote style
 * counts on both sides, since a translation often changes the quote marks (e.g. 「」 in a
 * Japanese original, "" in the Korean translation). An unpaired line falls back to its
 * proportional place.
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
    if (others.length === 0) {
        return null;
    }
    const index = Math.max(0, own.findIndex(other => other.start === line.start));
    const paired = alignQuotes(own, others)[index];
    const scaled = own.length > 1 ? Math.round(index * (others.length - 1) / (own.length - 1)) : 0;
    return others[paired >= 0 ? paired : Math.min(scaled, others.length - 1)];
}
