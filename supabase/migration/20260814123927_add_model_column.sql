/*
# Add model column to api_keys table

## Purpose
Stores the OpenRouter model name (e.g. "openai/gpt-4o-mini") alongside the
API key so the translation edge function knows which model to call. For Gemini
keys this column is null — the model is hardcoded server-side.

## Changes
- Added `model` column (text, nullable) to `api_keys`.
*/

ALTER TABLE api_keys ADD COLUMN IF NOT EXISTS model text;