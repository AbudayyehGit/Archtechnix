export interface GlossaryEntry {
  term: string;
  definition: string;
}

export function parseGlossaryEntries(markdownContent: string): GlossaryEntry[] {
  const entries: GlossaryEntry[] = [];
  const lines = markdownContent.split('\n');

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();
    if (!trimmed.startsWith('*') && !trimmed.startsWith('-')) continue;
    const withoutBullet = trimmed.replace(/^[-*]\s+/, '').trim();
    const colonIdx = withoutBullet.indexOf(':');
    if (colonIdx <= 0) continue;

    const term = withoutBullet.slice(0, colonIdx).trim();
    const definition = withoutBullet.slice(colonIdx + 1).trim();
    if (term && definition) {
      entries.push({ term, definition });
    }
  }

  return entries;
}

export function filterGlossaryEntries(
  entries: GlossaryEntry[],
  query: string
): GlossaryEntry[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return entries;

  const tokens = normalized.split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const haystack = `${entry.term} ${entry.definition}`.toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
