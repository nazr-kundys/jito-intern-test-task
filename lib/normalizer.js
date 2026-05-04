import { NODE_TYPES, STRUCTURAL_TAGS, HEAD_ELEMENTS, DEFAULT_DOCTYPE } from './constants.js';

import { makeElement, makeDoctypeNode } from './nodes.js';
import { parseCss } from './parser.css.js';

// ─── Predicates ───────────────────────────────────────────────────────────────

const isElement = (node) => typeof node === 'object' && node !== null && 'type' in node;
const isDoctype = (node) => isElement(node) && node.type === NODE_TYPES.DOCTYPE;
const isHtmlTag = (node) => isElement(node) && node.type === STRUCTURAL_TAGS.HTML;
const isHeadTag = (node) => isElement(node) && node.type === STRUCTURAL_TAGS.HEAD;
const isBodyTag = (node) => isElement(node) && node.type === STRUCTURAL_TAGS.BODY;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Finds an existing child matching `predicate`, or creates and appends one.
 *
 * @param {Array}    children
 * @param {Function} predicate
 * @param {string}   tag
 * @returns {object}
 */
function findOrCreate(children, predicate, tag) {
  const existing = children.find(predicate);
  if (existing) return existing;
  const created = makeElement(tag, {});
  children.push(created);
  return created;
}

/**
 * Determines the correct destination element for a node:
 * head-level elements → headEl, everything else → bodyEl.
 *
 * @param {*}      node
 * @param {object} headEl
 * @param {object} bodyEl
 * @returns {object}
 */
function destinationFor(node, headEl, bodyEl) {
  return isElement(node) && HEAD_ELEMENTS.has(node.type) ? headEl : bodyEl;
}

// ─── Style node transformer ───────────────────────────────────────────────────

/**
 * Recursively walks the node tree and replaces the raw text content of every
 * `<style>` node with a structured array of CSS rule objects.
 *
 * Called after the tree is built so the tokenizer can still capture raw CSS
 * text safely (avoiding false tag matches on `>` in CSS selectors), while the
 * final output reflects the parsed rule structure.
 *
 * @param {object|string} node
 */
function transformStyleNodes(node) {
  if (typeof node === 'string' || !node?.children) return;

  if (node.type === 'style') {
    const rawCss = node.children.find((c) => typeof c === 'string') ?? '';
    node.children = parseCss(rawCss);
    return; // CSS rule children are plain objects, no need to recurse into them
  }

  for (const child of node.children) {
    transformStyleNodes(child);
  }
}

// ─── Normalisation ────────────────────────────────────────────────────────────

/**
 * Ensures the document has the canonical spine and returns it as a wrapper
 * object with named keys:
 *
 *   {
 *     doctype: { type: "!doctype", attributes: { type: "html" } },
 *     html:    { type: "html", children: [
 *       { type: "head", children: [ …head nodes… ] },
 *       { type: "body", children: [ …body nodes… ] },
 *     ]},
 *   }
 *
 * The spine (doctype, html, head, body) is always present — synthesised from
 * defaults when absent from the source. Nodes are never discarded, only moved
 * to the correct location.
 *
 * @param {Array} nodes — raw top-level nodes from buildTree
 * @returns {{ doctype: object, html: object }}
 */
export function normalizeDocument(nodes) {
  // ── 1. Find or synthesise the doctype and html element ────────────────────
  const doctype = nodes.find(isDoctype) ?? makeDoctypeNode(`DOCTYPE ${DEFAULT_DOCTYPE}`);
  const htmlEl = nodes.find(isHtmlTag) ?? makeElement(STRUCTURAL_TAGS.HTML, {});

  // ── 2. Ensure html always contains exactly one head and one body ──────────
  const htmlChildren = htmlEl.children ?? [];

  const headEl = findOrCreate(htmlChildren, isHeadTag, STRUCTURAL_TAGS.HEAD);
  const bodyEl = findOrCreate(htmlChildren, isBodyTag, STRUCTURAL_TAGS.BODY);

  // ── 3. Hoist loose top-level nodes (those not already inside html) ────────
  //       This covers cases where html/head/body tags were implicit/missing.
  for (const node of nodes) {
    if (isDoctype(node) || isHtmlTag(node)) continue;

    // Strings (including orphan "" markers) always go to body
    if (typeof node === 'string') {
      bodyEl.children.push(node);
      continue;
    }

    const dest = destinationFor(node, headEl, bodyEl);
    if (!dest.children.includes(node)) dest.children.push(node);
  }

  // ── 4. Hoist nodes sitting directly inside <html> (outside head/body) ─────
  //       This happens when <head> was implicit in the source HTML.
  const htmlDirect = htmlEl.children.filter((n) => !isHeadTag(n) && !isBodyTag(n) && isElement(n));
  for (const node of htmlDirect) {
    destinationFor(node, headEl, bodyEl).children.push(node);
    htmlEl.children = htmlEl.children.filter((n) => n !== node);
  }

  // ── 5. Enforce head-before-body order inside html ─────────────────────────
  const otherHtmlChildren = htmlEl.children.filter((n) => !isHeadTag(n) && !isBodyTag(n));
  htmlEl.children = [...otherHtmlChildren, headEl, bodyEl];

  // ── 6. Parse CSS inside all <style> nodes ─────────────────────────────────
  transformStyleNodes(htmlEl);

  // ── 7. Strip the redundant `type` field from the two top-level nodes ───────
  //       The wrapper keys `doctype` and `html` already communicate what each
  //       node is — repeating `type: "!doctype"` and `type: "html"` inside
  //       them is redundant. `type` is kept on every other node in the tree
  //       because those nodes are positionally anonymous (inside children[]).
  delete doctype.type;
  delete htmlEl.type;

  return { doctype, html: htmlEl };
}
