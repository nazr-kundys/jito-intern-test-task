import { VOID_ELEMENTS, RAW_TEXT_ELEMENTS, TOKEN_KINDS, CHARS, DELIMITERS } from './constants.js';
import { decodeEntities } from './entities.js';
import { escapeRegExp, isValidTagName } from './utils.js';

// ─── Token factories ──────────────────────────────────────────────────────────

const token = {
  text: (value) => ({ kind: TOKEN_KINDS.TEXT, value }),
  comment: (value) => ({ kind: TOKEN_KINDS.COMMENT, value }),
  doctype: (value) => ({ kind: TOKEN_KINDS.DOCTYPE, value }),
  close: (tag) => ({ kind: TOKEN_KINDS.CLOSE, tag }),
  open: (tag, attrs, selfClosing) => ({ kind: TOKEN_KINDS.OPEN, tag, attrs, selfClosing }),
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const sliceTo = (html, start, end) => (end === -1 ? html.slice(start) : html.slice(start, end));

// ─── Tag boundary scanner ─────────────────────────────────────────────────────

/**
 * Returns the index of the `>` that closes the current tag, skipping quoted
 * attribute values so a `>` inside e.g. `href="a>b"` is not the tag end.
 */
function findTagEnd(html, start) {
  let i = start;
  const len = html.length;

  while (i < len) {
    const ch = html[i];
    if (ch === CHARS.TAG_CLOSE) return i;

    if (ch === CHARS.DOUBLE_QUOTE || ch === CHARS.SINGLE_QUOTE) {
      i++;
      while (i < len && html[i] !== ch) i++;
    }

    i++;
  }

  return -1;
}

// ─── Attribute parser ─────────────────────────────────────────────────────────

const ATTR_PATTERN = /(?<name>[^\s"'>/=]+)\s*(?:=\s*(?:"(?<double>[^"]*)"|'(?<single>[^']*)'|(?<unquoted>[^\s"'`=<>]*)))?/g;

/**
 * Parses a raw attribute string into a plain object.
 *   name="v" | name='v' | name=v  →  string (entity-decoded)
 *   name                          →  true (boolean attribute)
 */
function parseAttributes(str) {
  const attrs = {};
  ATTR_PATTERN.lastIndex = 0;
  let match;

  while ((match = ATTR_PATTERN.exec(str)) !== null) {
    const { name, double, single, unquoted } = match.groups;
    const raw = double ?? single ?? unquoted;
    attrs[name.toLowerCase()] = raw !== undefined ? decodeEntities(raw) : true;
  }

  return attrs;
}

// ─── Tag content parser ───────────────────────────────────────────────────────

/** Splits `tagName attr="val" …` into tag name and attributes. Returns null for invalid tags. */
function parseTagContent(content) {
  const trimmed = content.trim();
  if (!trimmed) return null;

  const spaceIdx = trimmed.search(/[\s/]/);
  const tagName = (spaceIdx === -1 ? trimmed : trimmed.slice(0, spaceIdx)).toLowerCase();

  if (!isValidTagName(tagName)) return null;

  const attrStr = spaceIdx === -1 ? '' : trimmed.slice(spaceIdx + 1);
  return { tag: tagName, attrs: parseAttributes(attrStr) };
}

// ─── Raw-text consumer ────────────────────────────────────────────────────────

/**
 * Consumes the body of a raw-text element (`<script>`, `<style>`, etc.)
 * verbatim up to the matching close tag, without re-parsing as HTML.
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

  const rawText = html.slice(start);
  if (rawText) tokens.push(token.text(rawText));
  return { tokens, newIndex: html.length };
}

// ─── Main tokenizer ───────────────────────────────────────────────────────────

/**
 * Converts an HTML string into a flat, ordered token array.
 * Kinds emitted: text | comment | doctype | open | close
 * Unterminated constructs become text tokens; scanning never throws.
 */
export function tokenize(html) {
  const tokens = [];
  const len = html.length;
  let i = 0;

  while (i < len) {
    // ── Text run ───────────────────────────────────────────────────────────
    if (html[i] !== CHARS.TAG_OPEN) {
      const start = i;
      while (i < len && html[i] !== CHARS.TAG_OPEN) i++;
      const text = decodeEntities(html.slice(start, i));
      if (text) tokens.push(token.text(text));
      continue;
    }

    // ── Comment: <!-- … --> ───────────────────────────────────────────────
    if (html.startsWith(DELIMITERS.COMMENT.OPEN, i)) {
      const cs = i + DELIMITERS.COMMENT.OPEN.length;
      const end = html.indexOf(DELIMITERS.COMMENT.CLOSE, cs);
      tokens.push(token.comment(sliceTo(html, cs, end)));
      i = end === -1 ? len : end + DELIMITERS.COMMENT.CLOSE.length;
      continue;
    }

    // ── CDATA: <![CDATA[ … ]]> ────────────────────────────────────────────
    if (html.startsWith(DELIMITERS.CDATA.OPEN, i)) {
      const cs = i + DELIMITERS.CDATA.OPEN.length;
      const end = html.indexOf(DELIMITERS.CDATA.CLOSE, cs);
      tokens.push(token.text(sliceTo(html, cs, end)));
      i = end === -1 ? len : end + DELIMITERS.CDATA.CLOSE.length;
      continue;
    }

    // ── Declaration / DOCTYPE: <! … > ─────────────────────────────────────
    if (html[i + 1] === CHARS.BANG) {
      const cs = i + 2;
      const end = html.indexOf(CHARS.TAG_CLOSE, i);
      tokens.push(token.doctype(sliceTo(html, cs, end)));
      i = end === -1 ? len : end + 1;
      continue;
    }

    // ── Closing tag: </tag> ───────────────────────────────────────────────
    if (html[i + 1] === CHARS.SLASH) {
      const cs = i + 2;
      const end = html.indexOf(CHARS.TAG_CLOSE, cs);
      if (end === -1) {
        tokens.push(token.text(html.slice(i)));
        i = len;
      } else {
        const tag = html.slice(cs, end).trim().toLowerCase();
        if (tag) tokens.push(token.close(tag));
        i = end + 1;
      }
      continue;
    }

    // ── Opening / self-closing tag ────────────────────────────────────────
    const cs = i + 1;
    const end = findTagEnd(html, cs);

    if (end === -1) {
      tokens.push(token.text(html.slice(i)));
      i = len;
      continue;
    }

    const raw = html.slice(cs, end);
    const selfClosing = raw.endsWith(CHARS.SLASH);
    const parsed = parseTagContent(selfClosing ? raw.slice(0, -1) : raw);

    if (!parsed) {
      tokens.push(token.text(html.slice(i, end + 1)));
      i = end + 1;
      continue;
    }

    const { tag, attrs } = parsed;
    tokens.push(token.open(tag, attrs, selfClosing || VOID_ELEMENTS.has(tag)));
    i = end + 1;

    // ── Raw-text body (script / style / textarea / title) ─────────────────
    if (RAW_TEXT_ELEMENTS.has(tag) && !selfClosing) {
      const { tokens: rawTokens, newIndex } = consumeRawText(html, i, tag);
      tokens.push(...rawTokens);
      i = newIndex;
    }
  }

  return tokens;
}
