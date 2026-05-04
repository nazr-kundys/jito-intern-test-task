import { TOKEN_KINDS } from './constants.js';
import { makeElement, makeDoctypeNode, makeCommentNode } from './nodes.js';

// ─── Token handlers ───────────────────────────────────────────────────────────
//
// The stack's bottom is a plain accumulator `{ children: [] }` that collects
// top-level nodes before normalization. It is never serialized.

const tokenHandlers = {
  [TOKEN_KINDS.DOCTYPE](stack, tok) {
    currentNode(stack).children.push(makeDoctypeNode(tok.value));
  },

  [TOKEN_KINDS.COMMENT](stack, tok) {
    currentNode(stack).children.push(makeCommentNode(tok.value));
  },

  // Whitespace-only tokens are inter-element formatting artifacts with no content.
  // Non-whitespace text is kept as-is (not trimmed) to preserve meaningful spaces.
  [TOKEN_KINDS.TEXT](stack, tok) {
    if (tok.value.trim()) currentNode(stack).children.push(tok.value);
  },

  [TOKEN_KINDS.OPEN](stack, tok) {
    const el = makeElement(tok.tag, tok.attrs);
    currentNode(stack).children.push(el);
    if (!tok.selfClosing) stack.push(el);
  },

  // Orphan close tag (no matching open) is invalid HTML — recorded as "" so callers can detect it.
  [TOKEN_KINDS.CLOSE](stack, tok) {
    const matchIdx = findMatchingOpenIndex(stack, tok.tag);
    if (matchIdx === -1) {
      currentNode(stack).children.push('');
      return;
    }
    stack.length = matchIdx;
  },
};

// ─── Stack helpers ────────────────────────────────────────────────────────────

function currentNode(stack) {
  return stack[stack.length - 1];
}

function findMatchingOpenIndex(stack, tag) {
  for (let i = stack.length - 1; i > 0; i--) {
    if (stack[i].type === tag) return i;
  }
  return -1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/** Converts a token array into a flat list of top-level nodes for `normalizeDocument`. */
export function buildTree(tokens) {
  const accumulator = { children: [] };
  const stack = [accumulator];

  for (const tok of tokens) {
    const handler = tokenHandlers[tok.kind];
    if (handler) handler(stack, tok);
  }

  return accumulator.children;
}
