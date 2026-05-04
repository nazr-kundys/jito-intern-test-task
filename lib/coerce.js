export function coerceToString(input) {
  if (input == null) return '';
  if (typeof input === 'string') return input;
  return String(input);
}
