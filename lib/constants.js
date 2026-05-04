// ─── HTML element classification ──────────────────────────────────────────────

/**
 * HTML void elements — must never have children.
 * (HTML spec §12.1.2)
 */
export const VOID_ELEMENTS = new Set([
  'area',
  'base',
  'br',
  'col',
  'embed',
  'hr',
  'img',
  'input',
  'link',
  'meta',
  'param',
  'source',
  'track',
  'wbr',
]);

/**
 * Raw-text elements — their content is consumed as a single text block
 * until the matching closing tag, without re-parsing inner markup.
 */
export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea', 'title']);

// ─── HTML document structure ──────────────────────────────────────────────────

/**
 * The three structural tags that must always exist in a normalised document,
 * forming the spine: html > { head, body }.
 */
export const STRUCTURAL_TAGS = Object.freeze({
  HTML: 'html',
  HEAD: 'head',
  BODY: 'body',
});

/**
 * Elements that belong inside <head> when hoisting during normalisation.
 * Any element whose tag is not in this set is treated as body content.
 */
export const HEAD_ELEMENTS = new Set(['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']);

// ─── Node type identifiers ────────────────────────────────────────────────────

export const NODE_TYPES = Object.freeze({
  DOCTYPE: '!doctype',
  COMMENT: '!comment',
});

/** Default doctype identifier used when none can be parsed from the source. */
export const DEFAULT_DOCTYPE = 'html';

// ─── Token kind identifiers ───────────────────────────────────────────────────

export const TOKEN_KINDS = Object.freeze({
  TEXT: 'text',
  COMMENT: 'comment',
  DOCTYPE: 'doctype',
  OPEN: 'open',
  CLOSE: 'close',
});

// ─── HTML syntax characters ───────────────────────────────────────────────────

export const CHARS = Object.freeze({
  TAG_OPEN: '<',
  TAG_CLOSE: '>',
  SLASH: '/',
  BANG: '!',
  DOUBLE_QUOTE: '"',
  SINGLE_QUOTE: "'",
  AMPERSAND: '&',
});

// ─── HTML markup delimiters ───────────────────────────────────────────────────

/**
 * Each delimiter entry carries the opening sequence, the closing sequence,
 * and the byte-lengths needed to skip past them during scanning.
 */
export const DELIMITERS = Object.freeze({
  COMMENT: Object.freeze({
    OPEN: '<!--',
    CLOSE: '-->',
    OPEN_LEN: 4, // "<!--".length
    CLOSE_LEN: 3, // "-->".length
  }),

  CDATA: Object.freeze({
    OPEN: '<![CDATA[',
    CLOSE: ']]>',
    OPEN_LEN: 9, // "<![CDATA[".length
    CLOSE_LEN: 3, // "]]>".length
  }),

  DECLARATION: Object.freeze({
    OPEN_LEN: 2, // "<!".length — chars to skip to reach the content
  }),

  CLOSE_TAG: Object.freeze({
    OPEN_LEN: 2, // "</".length
  }),

  OPEN_TAG: Object.freeze({
    OPEN_LEN: 1, // "<".length
  }),

  CLOSE_CHAR: Object.freeze({
    LEN: 1, // ">".length
  }),
});

// ─── Entity parsing constants ─────────────────────────────────────────────────

export const ENTITY = Object.freeze({
  /** Maximum character length of a named entity body (between `&` and `;`). */
  MAX_NAME_LENGTH: 10,

  HEX_PREFIX: '#x',
  DECIMAL_PREFIX: '#',
  HEX_RADIX: 16,
  DECIMAL_RADIX: 10,
  HEX_BODY_OFFSET: 2, // "#x".length
  DECIMAL_BODY_OFFSET: 1, // "#".length
});

// ─── Self-closing tag ─────────────────────────────────────────────────────────

/**
 * The trailing slash in `<tag />` occupies exactly one character.
 * Using a named constant avoids the unexplained `-1` in `raw.slice(0, -1)`.
 */
export const SELF_CLOSE_SLASH_LEN = 1;
