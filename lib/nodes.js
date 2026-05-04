import { NODE_TYPES, DEFAULT_DOCTYPE } from './constants.js';

export function makeElement(type, attributes, children = []) {
  return { type, attributes, children };
}

/**
 * The `attribute` key (absent on all other nodes) serves as the doctype identity predicate,
 * so no `type` sentinel is needed and nothing must be deleted before output.
 */
export function makeDoctypeNode(rawValue) {
  const match = /doctype\s+(\S+)/i.exec(rawValue);
  const identifier = match ? match[1].toLowerCase() : DEFAULT_DOCTYPE;
  return { attribute: identifier };
}

export function makeCommentNode(content) {
  return makeElement(NODE_TYPES.COMMENT, {}, [content]);
}
