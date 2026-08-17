// Translation service — checks translation memory first, then calls
// the ai-translate edge function (Gemini API, key kept server-side).

import { supabase } from '@/lib/supabase';
import { buildContextPrefix, retrieveRelevantTranslations } from '@/services/ragService';

interface TranslationResult {
  translatedText: string;
  source: 'memory' | 'ai' | 'fallback';
}

const EDGE_FUNCTION_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-translate`;

async function callEdgeFunction(
  text: string,
  sourceLang: string,
  targetLang: string,
  mode: 'translate' | 'reply' = 'translate',
  context?: string
): Promise<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ text, sourceLang, targetLang, mode, context }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Translation failed (${response.status})`);
  }

  const data = await response.json();
  if (!data || typeof data.translatedText !== 'string') {
    throw new Error('Invalid response from translation server');
  }
  return data.translatedText;
}

export async function translateText(
  text: string,
  sourceLang: string,
  targetLang: string
): Promise<TranslationResult> {
  if (!text.trim()) return { translatedText: '', source: 'fallback' };
  if (sourceLang === targetLang) return { translatedText: text, source: 'fallback' };

  // 1. Check translation memory via Supabase
  const { data: memoryMatch } = await supabase
    .from('translation_memory')
    .select('id, target_text, match_count')
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .ilike('source_text', text.trim())
    .maybeSingle();

  if (memoryMatch) {
    // Bump match count
    await supabase
      .from('translation_memory')
      .update({ match_count: (memoryMatch.match_count ?? 0) + 1 })
      .eq('id', memoryMatch.id);

    return { translatedText: memoryMatch.target_text, source: 'memory' };
  }

  // 2. Retrieve RAG context for consistency
  const ragContext = await retrieveRelevantTranslations(text, sourceLang, targetLang);
  const contextStr = buildContextPrefix(ragContext.entries);

  // 3. Call the AI edge function
  try {
    const translated = await callEdgeFunction(text, sourceLang, targetLang, 'translate', contextStr || undefined);
    return { translatedText: translated, source: 'ai' };
  } catch {
    // If the server function fails, return a clearly-marked fallback
    return {
      translatedText: `[${targetLang.toUpperCase()}] ${text}`,
      source: 'fallback',
    };
  }
}

export async function generateAIReply(
  userText: string,
  targetLang: string,
  context?: string
): Promise<string> {
  return callEdgeFunction(userText, targetLang, targetLang, 'reply', context);
}

export async function saveToMemory(
  sourceText: string,
  sourceLang: string,
  targetText: string,
  targetLang: string
): Promise<void> {
  if (!sourceText.trim() || !targetText.trim()) return;

  const { data: existing } = await supabase
    .from('translation_memory')
    .select('id')
    .eq('source_lang', sourceLang)
    .eq('target_lang', targetLang)
    .ilike('source_text', sourceText.trim())
    .maybeSingle();

  if (existing) {
    await supabase
      .from('translation_memory')
      .update({ target_text: targetText, updated_at: new Date().toISOString() })
      .eq('id', existing.id);
  } else {
    await supabase.from('translation_memory').insert({
      source_text: sourceText.trim(),
      source_lang: sourceLang,
      target_text: targetText.trim(),
      target_lang: targetLang,
    });
  }
}
