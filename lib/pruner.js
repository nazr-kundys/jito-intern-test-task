const isObject = (v) => !!v && typeof v === 'object' && !Array.isArray(v);

/**
 * Recursively prunes empty `attributes` and `children` from a node tree in-place.
 * Plain strings (text nodes) pass through unchanged.
 */
export function pruneNode(node) {
  if (typeof node === 'string') return node;
  if (!isObject(node)) return node;

  if (isObject(node.attributes) && Object.keys(node.attributes).length === 0) {
    delete node.attributes;
  }

  if (Array.isArray(node.children)) {
    node.children = node.children.map(pruneNode);
    if (node.children.length === 0) delete node.children;
  }

  return node;
}
