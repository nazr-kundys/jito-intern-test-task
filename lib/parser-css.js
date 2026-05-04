// ─── CSS parser ───────────────────────────────────────────────────────────────
//
// Parses a subset of CSS into structured rule objects and provides a tree
// walker that replaces raw <style> text content with those objects.
//
// Supported:
//   • Any selector string (element, class, id, combinator, pseudo, attribute)
//   • Standard `property: value;` declarations
//   • Multiple rules in one block
//
// Out of scope (skipped without throwing):
//   • @-rules (@media, @keyframes, @import …)
//   • Nested CSS
//   • CSS comments

const OPEN_BRACE = '{';
const CLOSE_BRACE = '}';
const COLON = ':';
const SEMICOLON = ';';

// ─── Declaration parser ───────────────────────────────────────────────────────

/**
 * Parses the content between `{` and `}` into property → value pairs.
 *
 * @param {string} block
 * @returns {object}
 */
function parseDeclarations(block) {
  const attributes = {};

  for (const declaration of block.split(SEMICOLON)) {
    const colonIdx = declaration.indexOf(COLON);

    if (colonIdx === -1) {
      continue;
    }

    const property = declaration.slice(0, colonIdx).trim();
    const value = declaration.slice(colonIdx + 1).trim();

    if (property && value) {
      attributes[property] = value;
    }
  }

  return attributes;
}

// ─── Public: CSS string parser ────────────────────────────────────────────────

/**
 * Parses a raw CSS string into an array of rule objects.
 *
 *   [{ selector: "body", attributes: { display: "flex", … } }, …]
 *
 * @param {string} css
 * @returns {Array<{ selector: string, attributes: object }>}
 */
export function parseCss(css) {
  const rules = [];
  let i = 0;

  while (i < css.length) {
    const openIdx = css.indexOf(OPEN_BRACE, i);

    if (openIdx === -1) {
      break;
    }

    const closeIdx = css.indexOf(CLOSE_BRACE, openIdx + 1);

    if (closeIdx === -1) {
      break;
    }

    const selector = css.slice(i, openIdx).trim();

    i = closeIdx + 1;

    if (!selector || selector.startsWith('@')) {
      continue;
    }

    const attributes = parseDeclarations(css.slice(openIdx + 1, closeIdx));
    if (Object.keys(attributes).length > 0) {
      rules.push({ selector, attributes });
    }
  }

  return rules;
}

// ─── Public: tree transformer ─────────────────────────────────────────────────

/**
 * Recursively walks a node tree and replaces the raw string content of every
 * `<style>` node with the structured CSS rule array from `parseCss`.
 *
 * Called after the tree is built so the tokenizer can safely capture raw CSS
 * text (avoiding false tag matches on `>` in selectors like `div > p`).
 *
 * @param {object|string} node
 */
export function transformStyleNodes(node) {
  if (typeof node === 'string' || !node?.children) return;

  if (node.type === 'style') {
    const rawCss = node.children.find((c) => typeof c === 'string') ?? '';

    node.children = parseCss(rawCss);

    return;
  }

  for (const child of node.children) {
    transformStyleNodes(child);
  }
}
