import { STRUCTURAL_TAGS, HEAD_ELEMENTS, DEFAULT_DOCTYPE } from './constants.js';
import { makeElement, makeDoctypeNode } from './nodes.js';
import { transformStyleNodes } from './parser-css.js';

// ─── Predicates ───────────────────────────────────────────────────────────────
//
// `isDoctype` uses `'attribute' in n` as the identity check — doctype nodes
// carry an `attribute` key and nothing else does, so no `type` sentinel needed.

const isObject = (n) => n && typeof n === 'object';
const isDoctype = (n) => isObject(n) && 'attribute' in n;
const isHtmlTag = (n) => isObject(n) && n.type === STRUCTURAL_TAGS.HTML;
const isHeadTag = (n) => isObject(n) && n.type === STRUCTURAL_TAGS.HEAD;
const isBodyTag = (n) => isObject(n) && n.type === STRUCTURAL_TAGS.BODY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function findOrCreate(children, predicate, tag) {
  const found = children.find(predicate);
  if (found) return found;

  const created = makeElement(tag, {});
  children.push(created);
  return created;
}

const destinationFor = (node, headEl, bodyEl) =>
  isObject(node) && HEAD_ELEMENTS.has(node.type) ? headEl : bodyEl;

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Enforces the canonical document spine and returns:
 *   { doctype: { attribute: "html" }, html: { children: [head, body] } }
 *
 * Nodes are never discarded — only moved to the correct location.
 */
export function normalizeDocument(nodes) {
  // 1. Resolve doctype and html
  const doctype = nodes.find(isDoctype) ?? makeDoctypeNode(`DOCTYPE ${DEFAULT_DOCTYPE}`);
  const htmlEl = nodes.find(isHtmlTag) ?? makeElement(STRUCTURAL_TAGS.HTML, {});

  // 2. Guarantee head and body inside html
  const headEl = findOrCreate(htmlEl.children ?? [], isHeadTag, STRUCTURAL_TAGS.HEAD);
  const bodyEl = findOrCreate(htmlEl.children ?? [], isBodyTag, STRUCTURAL_TAGS.BODY);

  // 3. Hoist top-level nodes that landed outside html
  for (const node of nodes) {
    if (isDoctype(node) || isHtmlTag(node)) continue;

    const dest = typeof node === 'string' ? bodyEl : destinationFor(node, headEl, bodyEl);
    if (!dest.children.includes(node)) dest.children.push(node);
  }

  // 4. Hoist nodes inside <html> but outside head/body
  for (const node of [...htmlEl.children]) {
    if (isHeadTag(node) || isBodyTag(node) || !isObject(node)) continue;

    destinationFor(node, headEl, bodyEl).children.push(node);
    htmlEl.children = htmlEl.children.filter((n) => n !== node);
  }

  // 5. Enforce head-before-body order
  htmlEl.children = [...htmlEl.children.filter((n) => !isHeadTag(n) && !isBodyTag(n)), headEl, bodyEl];

  // 6. Parse CSS inside <style> nodes
  transformStyleNodes(htmlEl);

  // 7. Drop `type` from html — the wrapper key already names it
  delete htmlEl.type;

  return { doctype, html: htmlEl };
}
