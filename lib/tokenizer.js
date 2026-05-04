import { VOID_ELEMENTS, RAW_TEXT_ELEMENTS, TOKEN_KINDS, CHARS, DELIMITERS, SELF_CLOSE_SLASH_LEN } from './constants.js';

import { decodeEntities } from './entities.js';
import { escapeRegExp, isValidTagName } from './utils.js';

// ─── Token factory helpers ────────────────────────────────────────────────────

const token = {
  text: (value) => ({ kind: TOKEN_KINDS.TEXT, value }),
  comment: (value) => ({ kind: TOKEN_KINDS.COMMENT, value }),
  doctype: (value) => ({ kind: TOKEN_KINDS.DOCTYPE, value }),
  close: (tag) => ({ kind: TOKEN_KINDS.CLOSE, tag }),
  open: (tag, attrs, selfClosing) => ({ kind: TOKEN_KINDS.OPEN, tag, attrs, selfClosing }),
};

// ─── Tag boundary scanner ─────────────────────────────────────────────────────

/**
 * Finds the index of the `>` that closes a tag, skipping quoted attribute
 * values so an inner `>` (e.g. `href="a>b"`) is not mistaken for the end.
 *
 * @param {string} html
 * @param {number} start — position of the first character after `<`
 * @returns {number} index of `>`, or -1 if not found
 */
function findTagEnd(html, start) {
  let i = start;
  const len = html.length;

  while (i < len) {
    const ch = html[i];

    if (ch === CHARS.TAG_CLOSE) return i;

    if (ch === CHARS.DOUBLE_QUOTE || ch === CHARS.SINGLE_QUOTE) {
      const quote = ch;
      i++;
      while (i < len && html[i] !== quote) {
        i++;
      }
    }

    i++;
  }

  return -1;
}

// ─── Attribute parser ─────────────────────────────────────────────────────────

/**
 * Parses a raw attribute string into a plain object.
 *
 * Handles all four attribute forms:
 *   name="value"  →  string (entities decoded)
 *   name='value'  →  string (entities decoded)
 *   name=unquoted →  string (entities decoded)
 *   name          →  true   (bare / boolean attribute)
 *
 * @param {string} str
 * @returns {object}
 */
function parseAttributes(str) {
  const attrs = {};
  const pattern = /([^\s"'>/=]+)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]*)))?/g;

  // Capture groups:
  //   1 — attribute name
  //   2 — double-quoted value
  //   3 — single-quoted value
  //   4 — unquoted value
  //   (none matched) — bare attribute → true
  const ATTR_NAME = 1;
  const DOUBLE_VAL = 2;
  const SINGLE_VAL = 3;
  const UNQUOTED = 4;

  let match;
  while ((match = pattern.exec(str)) !== null) {
    const name = match[ATTR_NAME].toLowerCase();
    const value =
      match[DOUBLE_VAL] !== undefined ? decodeEntities(match[DOUBLE_VAL])
      : match[SINGLE_VAL] !== undefined ? decodeEntities(match[SINGLE_VAL])
      : match[UNQUOTED] !== undefined ? decodeEntities(match[UNQUOTED])
      : true;

    attrs[name] = value;
  }

  return attrs;
}

// ─── Tag content parser ───────────────────────────────────────────────────────

/**
 * Splits the interior of a tag (`tagName attr1 attr2="val"`) into a tag name
 * and attributes object.
 *
 * Returns `{ tag: "", attrs: {} }` when no valid tag name can be extracted,
 * signalling the caller to emit the raw text unchanged.
 *
 * @param {string} content — text between `<` and `>`, excluding both
 * @returns {{ tag: string, attrs: object }}
 */
function parseTagContent(content) {
  const trimmed = content.trim();
  if (!trimmed) return { tag: '', attrs: {} };

  const spaceIdx = trimmed.search(/[\s/]/);
  const tagName = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();

  if (!isValidTagName(tagName)) return { tag: '', attrs: {} };

  const attrStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + DELIMITERS.OPEN_TAG.OPEN_LEN);

  return { tag: tagName, attrs: parseAttributes(attrStr) };
}

// ─── Raw-text handler ─────────────────────────────────────────────────────────

/**
 * Consumes the raw body of a `<script>`, `<style>`, `<textarea>`, or
 * `<title>` element — everything up to (but not including) the matching
 * closing tag, without re-parsing inner markup.
 *
 * The raw text is stored as a single text token so that CSS selectors,
 * JS operators, and other `<`/`>` characters inside these elements are
 * never mistaken for HTML tags.
 *
 * @param {string} html
 * @param {number} start — position immediately after the `>` of the open tag
 * @param {string} tag   — lower-cased tag name
 * @returns {{ tokens: Array, newIndex: number }}
 */
function consumeRawText(html, start, tag) {
  const closePattern = new RegExp(`<\\s*/\\s*${escapeRegExp(tag)}\\s*>`, 'i');
  const match = closePattern.exec(html.slice(start));
  const tokens = [];

  if (match) {
    const rawText = html.slice(start, start + match.index);
    if (rawText) tokens.push(token.text(rawText));
    tokens.push(token.close(tag));
    return { tokens, newIndex: start + match.index + match[0].length };
  }

  // No closing tag found — slurp the rest of the document
  const rawText = html.slice(start);
  if (rawText) tokens.push(token.text(rawText));
  return { tokens, newIndex: html.length };
}

// ─── Main tokeniser ───────────────────────────────────────────────────────────

/**
 * Converts a raw HTML string into a flat, ordered array of tokens.
 *
 * Token kinds: text | comment | doctype | open | close
 *
 * The tokeniser never throws — unterminated constructs are emitted as text
 * tokens and scanning continues to the end of the string.
 *
 * @param {string} html
 * @returns {Array<object>}
 */
export function tokenize(html) {
  const tokens = [];
  let i = 0;
  const len = html.length;

  while (i < len) {
    // ── Text run (everything before the next `<`) ──────────────────────────
    if (html[i] !== CHARS.TAG_OPEN) {
      const start = i;
      while (i < len && html[i] !== CHARS.TAG_OPEN) i++;
      const text = decodeEntities(html.slice(start, i));
      if (text) tokens.push(token.text(text));
      continue;
    }

    // ── HTML comment: <!-- … --> ───────────────────────────────────────────
    if (html.startsWith(DELIMITERS.COMMENT.OPEN, i)) {
      const contentStart = i + DELIMITERS.COMMENT.OPEN_LEN;
      const end = html.indexOf(DELIMITERS.COMMENT.CLOSE, contentStart);
      tokens.push(token.comment(end === -1 ? html.slice(contentStart) : html.slice(contentStart, end)));
      i = end === -1 ? len : end + DELIMITERS.COMMENT.CLOSE_LEN;
      continue;
    }

    // ── CDATA section: <![CDATA[ … ]]> ────────────────────────────────────
    if (html.startsWith(DELIMITERS.CDATA.OPEN, i)) {
      const contentStart = i + DELIMITERS.CDATA.OPEN_LEN;
      const end = html.indexOf(DELIMITERS.CDATA.CLOSE, contentStart);
      tokens.push(token.text(end === -1 ? html.slice(contentStart) : html.slice(contentStart, end)));
      i = end === -1 ? len : end + DELIMITERS.CDATA.CLOSE_LEN;
      continue;
    }

    // ── Declaration / DOCTYPE: <! … > ─────────────────────────────────────
    if (html[i + DELIMITERS.OPEN_TAG.OPEN_LEN] === CHARS.BANG) {
      const contentStart = i + DELIMITERS.DECLARATION.OPEN_LEN;
      const end = html.indexOf(CHARS.TAG_CLOSE, i);
      tokens.push(token.doctype(end === -1 ? html.slice(contentStart) : html.slice(contentStart, end)));
      i = end === -1 ? len : end + DELIMITERS.CLOSE_CHAR.LEN;
      continue;
    }

    // ── Closing tag: </tag> ────────────────────────────────────────────────
    if (html[i + DELIMITERS.OPEN_TAG.OPEN_LEN] === CHARS.SLASH) {
      const contentStart = i + DELIMITERS.CLOSE_TAG.OPEN_LEN;
      const end = html.indexOf(CHARS.TAG_CLOSE, contentStart);
      if (end === -1) {
        tokens.push(token.text(html.slice(i)));
        i = len;
      } else {
        const tag = html.slice(contentStart, end).trim().toLowerCase();
        if (tag) tokens.push(token.close(tag));
        i = end + DELIMITERS.CLOSE_CHAR.LEN;
      }
      continue;
    }

    // ── Opening / self-closing tag: <tag … > or <tag … /> ─────────────────
    const tagContentStart = i + DELIMITERS.OPEN_TAG.OPEN_LEN;
    const end = findTagEnd(html, tagContentStart);

    if (end === -1) {
      tokens.push(token.text(html.slice(i)));
      i = len;
      continue;
    }

    const raw = html.slice(tagContentStart, end);
    const selfClosing = raw.endsWith(CHARS.SLASH);
    const tagContent = selfClosing ? raw.slice(0, -SELF_CLOSE_SLASH_LEN) : raw;
    const { tag, attrs } = parseTagContent(tagContent);

    if (!tag) {
      // Unrecognisable tag — preserve as raw text
      tokens.push(token.text(html.slice(i, end + DELIMITERS.CLOSE_CHAR.LEN)));
      i = end + DELIMITERS.CLOSE_CHAR.LEN;
      continue;
    }

    tokens.push(token.open(tag, attrs, selfClosing || VOID_ELEMENTS.has(tag)));
    i = end + DELIMITERS.CLOSE_CHAR.LEN;

    // ── Raw-text body (script / style / textarea / title) ─────────────────
    if (RAW_TEXT_ELEMENTS.has(tag) && !selfClosing) {
      const { tokens: rawTokens, newIndex } = consumeRawText(html, i, tag);
      tokens.push(...rawTokens);
      i = newIndex;
    }
  }

  return tokens;
}
