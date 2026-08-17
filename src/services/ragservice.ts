// RAG service — retrieves relevant past translations from Supabase
// to provide context-aware responses and improve consistency.

import { supabase, TranslationMemoryEntry } from '@/lib/supabase';

export interface RagContext {
  entries: TranslationMemoryEntry[];
  hasContext: boolean;
}

export async function retrieveRelevantTranslations(
  query: string,
  sourceLang: string,
  targetLang: string,
  limit = 3
): Promise<RagContext> {
  const words = query.trim().toLowerCase().split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return { entries: [], hasContext: false };

  // Use OR ilike to find memory entries sharing keywords
  const orFilters = words.map((w) => `source_text.ilike.%${w}%`).join(',');

  const { data, error } = await supabase
    .from('translation_memory')
    .select('*')
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .or(orFilters)
    .order('match_count', { ascending: false })
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (error || !data || data.length === 0) {
    return { entries: [], hasContext: false };
  }

  return { entries: data as TranslationMemoryEntry[], hasContext: true };
}

export function buildContextPrefix(entries: TranslationMemoryEntry[]): string {
  if (entries.length === 0) return '';
  const lines = entries.map(
    (e) => `${e.source_text} → ${e.target_text}`
  );
  return `[Context from previous translations]\n${lines.join('\n')}\n`;
}
