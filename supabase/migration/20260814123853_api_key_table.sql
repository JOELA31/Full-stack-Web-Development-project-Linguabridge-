/*
# API keys table for server-side AI integration

## Purpose
Stores AI provider API keys (Gemini or OpenRouter) entered by the user through
the app UI. Keys are NEVER readable by the frontend — only server-side edge
functions using the service role key can read them.

## New Tables
- `api_keys` — id, provider, key_value, is_active, created_at, updated_at

## Security
- RLS enabled, anon+authenticated can manage rows (single-tenant, no auth)
- SELECT on key_value column REVOKED from client roles
- SECURITY DEFINER function get_api_key callable only by service_role
*/

CREATE TABLE IF NOT EXISTS api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL DEFAULT 'gemini',
  key_value text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_api_keys" ON api_keys;
CREATE POLICY "anon_select_api_keys" ON api_keys FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_api_keys" ON api_keys;
CREATE POLICY "anon_insert_api_keys" ON api_keys FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_api_keys" ON api_keys;
CREATE POLICY "anon_update_api_keys" ON api_keys FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_api_keys" ON api_keys;
CREATE POLICY "anon_delete_api_keys" ON api_keys FOR DELETE
  TO anon, authenticated USING (true);

REVOKE SELECT (key_value) ON api_keys FROM anon, authenticated;

CREATE OR REPLACE FUNCTION get_api_key(p_provider text DEFAULT 'gemini')
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_key text;
BEGIN
  SELECT key_value INTO v_key
  FROM api_keys
  WHERE provider = p_provider AND is_active = true
  ORDER BY updated_at DESC
  LIMIT 1;
  RETURN v_key;
END;
$$;

REVOKE EXECUTE ON FUNCTION get_api_key(text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION get_api_key(text) TO service_role;