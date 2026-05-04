// ─── CSS rule parser ──────────────────────────────────────────────────────────
//
// Parses a subset of CSS into an array of rule objects:
//
//   [
//     { selector: "body",   attributes: { display: "flex", … } },
//     { selector: "a:hover", attributes: { color: "red" } },
//   ]
//
// Supported:
//   • Any selector string (element, class, id, attribute, pseudo, combinators)
//   • Standard property: value; declarations
//   • Multiple rules
//   • Arbitrary whitespace / indentation
//
// Not supported (out of scope):
//   • @-rules  (@media, @keyframes, @import …)
//   • Nested CSS (CSS Nesting spec)
//   • CSS comments inside the stylesheet
//
// The parser never throws — unrecognisable blocks are silently skipped.

// ─── Constants ────────────────────────────────────────────────────────────────

const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const COLON = ':';
const SEMICOLON = ';';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Parses a CSS declaration block string (the content between `{` and `}`)
 * into a plain object of property → value pairs.
 *
 * @param {string} block — e.g. "display: flex; flex-direction: column;"
 * @returns {object}     — e.g. { display: "flex", "flex-direction": "column" }
 */
function parseDeclarations(block) {
  const attributes = {};

  for (const declaration of block.split(SEMICOLON)) {
    const colonIdx = declaration.indexOf(COLON);
    if (colonIdx === -1) continue;

    const property = declaration.slice(0, colonIdx).trim();
    const value = declaration.slice(colonIdx + 1).trim();

    if (property && value) {
      attributes[property] = value;
    }
  }

  return attributes;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Parses a raw CSS string into an array of structured rule objects.
 *
 * Each rule object has the shape:
 *   { selector: string, attributes: { [property]: value } }
 *
 * Rules where the selector or declaration block is empty are omitted.
 * Unrecognisable content (e.g. @-rules) is skipped without throwing.
 *
 * @param {string} css
 * @returns {Array<{ selector: string, attributes: object }>}
 */
export function parseCss(css) {
  const rules = [];
  let i = 0;

  while (i < css.length) {
    const openIdx = css.indexOf(OPEN_BRACE, i);
    if (openIdx === -1) break;

    const closeIdx = css.indexOf(CLOSE_BRACE, openIdx + 1);
    if (closeIdx === -1) break;

    const selector = css.slice(i, openIdx).trim();
    const declaration = css.slice(openIdx + 1, closeIdx);

    i = closeIdx + 1;

    // Skip @-rules and empty selectors
    if (!selector || selector.startsWith('@')) continue;

    const attributes = parseDeclarations(declaration);
    if (Object.keys(attributes).length === 0) continue;

    rules.push({ selector, attributes });
  }

  return rules;
}
