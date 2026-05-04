/**
 * Escapes all special RegExp metacharacters in a string so it can be
 * safely embedded in a `new RegExp(...)` call.
 *
 * @param {string} str
 * @returns {string}
 */
export function escapeRegExp(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Returns true when a string is a valid XML / HTML tag name.
 * Allows custom elements (hyphens) and namespaced names (colons, dots).
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isValidTagName(name) {
  return /^[a-z][a-z0-9-:.]*$/i.test(name);
}
