export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Returns true for valid XML/HTML tag names, including custom elements and namespaced names. */
export function isValidTagName(name) {
  return /^[a-z][a-z0-9-:.]*$/i.test(name);
}
