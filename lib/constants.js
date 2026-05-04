// ─── HTML element classification ──────────────────────────────────────────────

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

export const RAW_TEXT_ELEMENTS = new Set(['script', 'style', 'textarea']);

// ─── Document structure ───────────────────────────────────────────────────────

export const STRUCTURAL_TAGS = Object.freeze({
  HTML: 'html',
  HEAD: 'head',
  BODY: 'body',
});

/** Elements that belong inside <head>; everything else is body content. */
export const HEAD_ELEMENTS = new Set(['base', 'link', 'meta', 'noscript', 'script', 'style', 'template', 'title']);

// ─── Node type identifiers ────────────────────────────────────────────────────

export const NODE_TYPES = Object.freeze({
  COMMENT: '!comment',
});

export const DEFAULT_DOCTYPE = 'html';

// ─── Token kinds ──────────────────────────────────────────────────────────────

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

export const DELIMITERS = Object.freeze({
  COMMENT: Object.freeze({ OPEN: '<!--', CLOSE: '-->' }),
  CDATA: Object.freeze({ OPEN: '<![CDATA[', CLOSE: ']]>' }),
});

// ─── Entity parsing ───────────────────────────────────────────────────────────

export const ENTITY = Object.freeze({
  MAX_NAME_LENGTH: 10,
  HEX_PREFIX: '#x',
  DECIMAL_PREFIX: '#',
  HEX_RADIX: 16,
  DECIMAL_RADIX: 10,
  HEX_BODY_OFFSET: 2,
  DECIMAL_BODY_OFFSET: 1,
});
