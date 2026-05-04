// ─── Tree pruner ──────────────────────────────────────────────────────────────
//
// Walks the node tree and removes `attributes` when it is an empty object
// and `children` when it is an empty array.
//
// This keeps the JSON output lean: nodes that carry no attributes or no
// children simply omit those keys rather than showing `{}` or `[]`.
//
// The doctype node is intentionally left untouched because its `attributes`
// object always carries the `type` identifier (never empty).

// ─── Helpers ──────────────────────────────────────────────────────────────────

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isEmpty = (v) => (Array.isArray(v) ? v.length === 0 : Object.keys(v).length === 0);

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Recursively prunes empty `attributes` and `children` from every node in
 * the tree. Operates in-place and also returns the mutated node.
 *
 * Plain strings (text nodes) are returned unchanged.
 *
 * @param {object|string} node
 * @returns {object|string}
 */
export function pruneNode(node) {
  if (typeof node === 'string') return node;
  if (!isPlainObject(node)) return node;

  if ('attributes' in node && isPlainObject(node.attributes) && isEmpty(node.attributes)) {
    delete node.attributes;
  }

  if ('children' in node && Array.isArray(node.children)) {
    // Recurse first so children are pruned before we check emptiness
    node.children = node.children.map(pruneNode);

    if (isEmpty(node.children)) {
      delete node.children;
    }
  }

  return node;
}

/**
 * Applies `pruneNode` to every node in a top-level document object.
 *
 * @param {{ doctype: object, html: object }} document
 * @returns {{ doctype: object, html: object }}
 */
export function pruneDocument(document) {
  pruneNode(document.doctype);
  pruneNode(document.html);
  return document;
}
