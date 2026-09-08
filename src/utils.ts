/**
 * Calculates default sheet tab name:
 * The sheet tab name for each institution defaults to the institution name
 * (shortened to the first three words if more).
 */
export function getDefaultSheetTabName(name?: string): string {
  if (!name || typeof name !== 'string') return 'Responses';
  const clean = name.trim();
  const words = clean.split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'Responses';
  if (words.length <= 3) {
    return words.join(' ');
  }
  return `${words[0]} ${words[1]} ${words[2]}`;
}
