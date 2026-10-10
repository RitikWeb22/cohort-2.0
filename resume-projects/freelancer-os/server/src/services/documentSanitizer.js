/**
 * Rejects boolean-looking strings ('true', 'false', 'null', 'undefined') in free-text fields
 * to prevent database migration or loose typing leaks from appearing on client-facing documents.
 */
export function sanitizeFreeText(val) {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  const lower = str.toLowerCase();
  if (lower === 'true' || lower === 'false' || lower === 'null' || lower === 'undefined') {
    return '';
  }
  return str;
}
