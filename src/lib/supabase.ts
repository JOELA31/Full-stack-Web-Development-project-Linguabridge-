import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars — check .env');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false },
});

export interface Conversation {
  id: string;
  title: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  original_text: string;
  translated_text: string;
  source_lang: string;
  target_lang: string;
  created_at: string;
}

export interface TranslationMemoryEntry {
  id: string;
  source_text: string;
  source_lang: string;
  target_text: string;
  target_lang: string;
  match_count: number;
  created_at: string;
  updated_at: string;
}

export interface LanguageOption {
  code: string;
  name: string;
  flag: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', flag: 'GB' },
  { code: 'es', name: 'Spanish', flag: 'ES' },
  { code: 'fr', name: 'French', flag: 'FR' },
  { code: 'de', name: 'German', flag: 'DE' },
  { code: 'it', name: 'Italian', flag: 'IT' },
  { code: 'pt', name: 'Portuguese', flag: 'PT' },
  { code: 'nl', name: 'Dutch', flag: 'NL' },
  { code: 'ru', name: 'Russian', flag: 'RU' },
  { code: 'ja', name: 'Japanese', flag: 'JP' },
  { code: 'ko', name: 'Korean', flag: 'KR' },
  { code: 'zh', name: 'Chinese', flag: 'CN' },
  { code: 'ar', name: 'Arabic', flag: 'SA' },
  { code: 'hi', name: 'Hindi', flag: 'IN' },
  { code: 'bn', name: 'Bengali', flag: 'IN' },
  { code: 'te', name: 'Telugu', flag: 'IN' },
  { code: 'ta', name: 'Tamil', flag: 'IN' },
  { code: 'mr', name: 'Marathi', flag: 'IN' },
  { code: 'gu', name: 'Gujarati', flag: 'IN' },
  { code: 'kn', name: 'Kannada', flag: 'IN' },
  { code: 'ml', name: 'Malayalam', flag: 'IN' },
  { code: 'pa', name: 'Punjabi', flag: 'IN' },
  { code: 'ur', name: 'Urdu', flag: 'IN' },
  { code: 'tr', name: 'Turkish', flag: 'TR' },
  { code: 'pl', name: 'Polish', flag: 'PL' },
  { code: 'sv', name: 'Swedish', flag: 'SE' },
];

export function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name ?? code;
}
