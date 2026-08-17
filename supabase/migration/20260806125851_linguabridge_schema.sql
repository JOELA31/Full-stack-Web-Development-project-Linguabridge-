/*
# LinguaBridge — Translation Chat Schema

1. New Tables
- `conversations`: A chat session with source and target language settings.
  - id (uuid pk), title (text), source_lang (text, e.g. "en"), target_lang (text, e.g. "es"),
    created_at, updated_at
- `messages`: Individual messages within a conversation.
  - id (uuid pk), conversation_id (fk → conversations), role (text: 'user' | 'assistant'),
    original_text (text), translated_text (text), source_lang, target_lang, created_at
- `translation_memory`: RAG store — cached translations reused for similar future inputs.
  - id (uuid pk), source_text (text), source_lang, target_text, target_lang, match_count (int, default 0),
    created_at, updated_at
2. Security
- Single-tenant app (no sign-in). RLS enabled on all tables.
- Policies allow anon + authenticated full CRUD (data is intentionally shared).
3. Notes
- translation_memory.match_count tracks how many times a cached translation has been reused,
  supporting the RAG "retrieve-and-reuse" pattern.
*/

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL DEFAULT 'New Conversation',
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_conversations" ON conversations;
CREATE POLICY "anon_select_conversations" ON conversations FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_conversations" ON conversations;
CREATE POLICY "anon_insert_conversations" ON conversations FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_conversations" ON conversations;
CREATE POLICY "anon_update_conversations" ON conversations FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_conversations" ON conversations;
CREATE POLICY "anon_delete_conversations" ON conversations FOR DELETE
  TO anon, authenticated USING (true);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'assistant')),
  original_text text NOT NULL,
  translated_text text NOT NULL,
  source_lang text NOT NULL DEFAULT 'en',
  target_lang text NOT NULL DEFAULT 'es',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_messages" ON messages;
CREATE POLICY "anon_select_messages" ON messages FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_messages" ON messages;
CREATE POLICY "anon_insert_messages" ON messages FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_messages" ON messages;
CREATE POLICY "anon_update_messages" ON messages FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_messages" ON messages;
CREATE POLICY "anon_delete_messages" ON messages FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id, created_at);

CREATE TABLE IF NOT EXISTS translation_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_text text NOT NULL,
  source_lang text NOT NULL,
  target_text text NOT NULL,
  target_lang text NOT NULL,
  match_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE translation_memory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_tm" ON translation_memory;
CREATE POLICY "anon_select_tm" ON translation_memory FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_tm" ON translation_memory;
CREATE POLICY "anon_insert_tm" ON translation_memory FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_tm" ON translation_memory;
CREATE POLICY "anon_update_tm" ON translation_memory FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_tm" ON translation_memory;
CREATE POLICY "anon_delete_tm" ON translation_memory FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_tm_langpair ON translation_memory(source_lang, target_lang);
