/**
 * Safely coerces any value to a string so the rest of the pipeline
 * always receives a plain `string`.
 *
 * Conversion rules
 *
 * ─────────────────
 *
 *  null / undefined  →  ""
 *  string            →  as-is
 *  object            →  JSON.stringify (falls back to String() on error)
 *  everything else   →  String()
 *
 * This function never throws.
 *
 * @param {*} input
 * @returns {string}
 */
export function coerceToString(input) {
  if (!input) {
    return '';
  }

  if (typeof input === 'string') {
    return input;
  }

  if (typeof input === 'object') {
    try {
      return JSON.stringify(input);
    } catch {
      return String(input);
    }
  }

  return String(input);
}
