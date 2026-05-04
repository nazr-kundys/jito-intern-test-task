import { CHARS, ENTITY } from './constants.js';

/**
 * Named HTML entities and their Unicode replacements.
 * Extend this map to support more named entities without touching any
 * other module (Open/Closed Principle).
 */
const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
  trade: '™',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
};

/**
 * Replaces a single `&…;` entity reference with its Unicode character.
 * Returns the original token unchanged when the entity is unrecognised.
 *
 * @param {string} entity — the full token, e.g. "&amp;" or "&#65;" or "&#x41;"
 * @param {string} body   — the part between '&' and ';', e.g. "amp", "#65", "#x41"
 * @returns {string}
 */
function replaceEntity(entity, body) {
  const lowerBody = body.toLowerCase();

  if (lowerBody.startsWith(ENTITY.HEX_PREFIX)) {
    const cp = parseInt(body.slice(ENTITY.HEX_BODY_OFFSET), ENTITY.HEX_RADIX);
    return isNaN(cp) ? entity : String.fromCodePoint(cp);
  }

  if (lowerBody.startsWith(ENTITY.DECIMAL_PREFIX)) {
    const cp = parseInt(body.slice(ENTITY.DECIMAL_BODY_OFFSET), ENTITY.DECIMAL_RADIX);
    return isNaN(cp) ? entity : String.fromCodePoint(cp);
  }

  return NAMED_ENTITIES[lowerBody] ?? entity;
}

/**
 * Decodes all HTML entity references (`&name;`, `&#decimal;`, `&#xhex;`)
 * found in `str`. Unrecognised entities are left untouched.
 *
 * @param {string} str
 * @returns {string}
 */
export function decodeEntities(str) {
  if (!str || !str.includes(CHARS.AMPERSAND)) return str;

  const pattern = new RegExp(`&([^;\\s]{1,${ENTITY.MAX_NAME_LENGTH}});`, 'g');
  return str.replace(pattern, replaceEntity);
}
