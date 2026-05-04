import { NODE_TYPES, DEFAULT_DOCTYPE } from './constants.js';

/**
 * Creates a JSON-serializable element node — the only place in the codebase
 * that knows the node's shape.
 *
 * @param {string} type        — tag name, NODE_TYPES.DOCTYPE, or NODE_TYPES.COMMENT
 * @param {object} attributes  — key/value pairs; bare attributes use `true`
 * @param {Array}  [children]  — child nodes or text strings
 * @returns {{ type: string, attributes: object, children: Array }}
 */
export function makeElement(type, attributes, children = []) {
  return { type, attributes, children };
}

/**
 * Creates an element node that intentionally has no `children` property.
 * Used for void elements (br, img, input …) and self-closing tags, whose
 * children array would always be empty and is therefore omitted.
 *
 * @param {string} type
 * @param {object} attributes
 * @returns {{ type: string, attributes: object }}
 */
export function makeVoidElement(type, attributes) {
  return { type, attributes };
}

/**
 * Creates a doctype node from the raw DOCTYPE string value.
 * Extracts the identifier (e.g. "html") from strings like "DOCTYPE html".
 *
 * The node keeps an internal `type` field so the normaliser can identify and
 * route it correctly during tree-building. That field is stripped from the
 * final output by `normalizeDocument` just before returning, so the
 * serialised form is simply:  { value: "html" }
 *
 * @param {string} rawValue
 * @returns {{ type: "!doctype", value: string }}
 */
export function makeDoctypeNode(rawValue) {
  const match = /doctype\s+(\S+)/i.exec(rawValue);
  const identifier = match ? match[1].toLowerCase() : DEFAULT_DOCTYPE;
  return { type: NODE_TYPES.DOCTYPE, attribute: identifier };
}

/**
 * Creates a `!comment` node whose content is stored as a text child.
 *
 * @param {string} content
 * @returns {{ type: "!comment", attributes: {}, children: [string] }}
 */
export function makeCommentNode(content) {
  return makeElement(NODE_TYPES.COMMENT, {}, [content]);
}
