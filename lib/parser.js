import { TOKEN_KINDS } from './constants.js';
import { makeElement, makeVoidElement, makeDoctypeNode, makeCommentNode } from './nodes.js';

// ─── Token handlers ───────────────────────────────────────────────────────────
//
// Each handler receives the mutable open-element stack and the current token.
// The stack's bottom element is a plain accumulator `{ children: [] }` that
// is never serialised — it simply collects the top-level nodes produced by
// the token stream before normalisation.

const tokenHandlers = {
  [TOKEN_KINDS.DOCTYPE](stack, tok) {
    currentNode(stack).children.push(makeDoctypeNode(tok.value));
  },

  [TOKEN_KINDS.COMMENT](stack, tok) {
    currentNode(stack).children.push(makeCommentNode(tok.value));
  },

  /**
   * Text tokens that are purely whitespace (indentation / line-breaks between
   * tags) are dropped — they are formatting artefacts whose presence depends
   * on whether the source HTML is pretty-printed or minified.
   *
   * Text with actual content is stored as-is (not trimmed) so that meaningful
   * leading/trailing spaces are preserved (e.g. "Hello " before a <b> tag).
   */
  [TOKEN_KINDS.TEXT](stack, tok) {
    if (tok.value.trim()) currentNode(stack).children.push(tok.value);
  },

  [TOKEN_KINDS.OPEN](stack, tok) {
    const el = tok.selfClosing ? makeVoidElement(tok.tag, tok.attrs) : makeElement(tok.tag, tok.attrs);

    currentNode(stack).children.push(el);

    if (!tok.selfClosing) stack.push(el);
  },

  /**
   * A close token with no matching open tag is invalid HTML.
   * It is recorded as "" in the current node's children — visible in the
   * output so the caller knows something was skipped.
   */
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

/**
 * Walks the stack from top to bottom (skipping index 0 — the accumulator)
 * and returns the index of the first element whose type matches `tag`.
 * Returns -1 for orphan close tags.
 */
function findMatchingOpenIndex(stack, tag) {
  for (let i = stack.length - 1; i > 0; i--) {
    if (stack[i].type === tag) return i;
  }
  return -1;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Converts a flat token array into a list of top-level nodes.
 *
 * Returns a plain array — there is no `#document` wrapper. The result is
 * passed directly to `normalizeDocument` which produces the final
 * `[doctypeNode, htmlNode]` output.
 *
 * @param {Array<object>} tokens
 * @returns {Array} top-level nodes collected from the token stream
 */
export function buildTree(tokens) {
  // A plain object acts as the invisible stack bottom — it is never
  // serialised; its only job is to hold top-level children.
  const accumulator = { children: [] };
  const stack = [accumulator];

  for (const tok of tokens) {
    const handler = tokenHandlers[tok.kind];
    if (handler) handler(stack, tok);
    // Unknown token kinds are ignored — forward-compatible by default
  }

  return accumulator.children;
}
