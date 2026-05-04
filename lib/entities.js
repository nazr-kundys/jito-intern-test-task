import { CHARS, ENTITY } from './constants.js';

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  copy: '©',
  reg: '®',
  trade: '™',
  mdash: '—',
  ndash: '–',
  hellip: '…',
  laquo: '«',
  raquo: '»',
};

const ENTITY_PATTERN = new RegExp(`&([^;\\s]{1,${ENTITY.MAX_NAME_LENGTH}});`, 'g');

function replaceEntity(entity, body) {
  const lower = body.toLowerCase();

  if (lower.startsWith(ENTITY.HEX_PREFIX)) {
    const hex = parseInt(body.slice(ENTITY.HEX_BODY_OFFSET), ENTITY.HEX_RADIX);
    return isNaN(hex) ? entity : String.fromCodePoint(hex);
  }

  if (lower.startsWith(ENTITY.DECIMAL_PREFIX)) {
    const dec = parseInt(body.slice(ENTITY.DECIMAL_BODY_OFFSET), ENTITY.DECIMAL_RADIX);
    return isNaN(dec) ? entity : String.fromCodePoint(dec);
  }

  return NAMED_ENTITIES[lower] ?? entity;
}

/** Decodes all HTML entity references in `str`. Unrecognized entities are left untouched. */
export function decodeEntities(str) {
  if (!str || !str.includes(CHARS.AMPERSAND)) return str;
  ENTITY_PATTERN.lastIndex = 0;
  return str.replace(ENTITY_PATTERN, replaceEntity);
}
