import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-2.0-flash";
const OPENROUTER_DEFAULT_MODEL = "openai/gpt-4o-mini";

interface TranslateRequest {
  text: string;
  sourceLang: string;
  targetLang: string;
  mode?: "translate" | "reply";
  context?: string;
  provider?: "gemini" | "openrouter";
  model?: string;
}

interface ActiveKey {
  provider: string;
  key_value: string;
  model: string | null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

// Retrieve the active API key + provider from the database.
// If a specific provider is requested, try that first, then fall back to any active key.
async function getActiveKey(preferredProvider?: string): Promise<ActiveKey | null> {
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

  // Try env var fallback for Gemini
  const envGeminiKey = Deno.env.get("GEMINI_API_KEY");
  if (envGeminiKey && (!preferredProvider || preferredProvider === "gemini")) {
    return { provider: "gemini", key_value: envGeminiKey, model: null };
  }

  if (!SUPABASE_URL || !SERVICE_KEY) return null;

  try {
    const { createClient } = await import("npm:@supabase/supabase-js@2.45.4");
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // If a preferred provider is specified, try it first
    if (preferredProvider) {
      const { data, error } = await adminClient
        .from("api_keys")
        .select("provider, key_value, model")
        .eq("provider", preferredProvider)
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return { provider: data.provider, key_value: data.key_value, model: data.model ?? null };
      }
    }

    // Fall back to any active key
    const { data, error } = await adminClient
      .from("api_keys")
      .select("provider, key_value, model")
      .eq("is_active", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data) return null;
    return { provider: data.provider, key_value: data.key_value, model: data.model ?? null };
  } catch {
    return null;
  }
}

async function callGemini(prompt: string, apiKey: string): Promise<string> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

  const body = {
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.3, maxOutputTokens: 512 },
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Gemini API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const candidate = data?.candidates?.[0];
  const parts = candidate?.content?.parts;
  if (!parts || !Array.isArray(parts) || parts.length === 0) {
    throw new Error("Gemini returned no content");
  }
  return parts.map((p: { text?: string }) => p.text ?? "").join("").trim();
}

async function callOpenRouter(prompt: string, apiKey: string, model: string): Promise<string> {
  const url = "https://openrouter.ai/api/v1/chat/completions";

  const body = {
    model,
    messages: [{ role: "user", content: prompt }],
    temperature: 0.3,
    max_tokens: 512,
  };

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": Deno.env.get("SUPABASE_URL") ?? "https://linguabridge.app",
      "X-Title": "LinguaBridge",
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`OpenRouter API error (${resp.status}): ${errText}`);
  }

  const data = await resp.json();
  const content = data?.choices?.[0]?.message?.content;
  if (!content || typeof content !== "string") {
    throw new Error("OpenRouter returned no content");
  }
  return content.trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = (await req.json()) as TranslateRequest;
    const { text, sourceLang, targetLang, mode = "translate", context, provider, model } = body;

    if (!text || !text.trim()) {
      return errorResponse("Missing 'text' field");
    }
    if (!sourceLang || !targetLang) {
      return errorResponse("Missing sourceLang or targetLang");
    }

    const activeKey = await getActiveKey(provider);
    if (!activeKey) {
      return errorResponse("No API key configured. Add a Gemini or OpenRouter API key in Settings.", 500);
    }

    let prompt: string;

    if (mode === "reply") {
      const contextBlock = context
        ? `\nPrevious translation context:\n${context}\n`
        : "";
      prompt = `You are a friendly conversation partner. Respond naturally and briefly (1-2 sentences) in ${targetLang} to this message: "${text}"${contextBlock}Reply ONLY with the response in ${targetLang}, nothing else.`;
    } else {
      if (sourceLang === targetLang) {
        return jsonResponse({ translatedText: text, source: "ai" });
      }
      const contextBlock = context
        ? `\nFor consistency, here are previous translations:\n${context}\n`
        : "";
      prompt = `Translate the following text from ${sourceLang} to ${targetLang}.${contextBlock}Return ONLY the translated text, no explanations or quotes.\n\nText: "${text}"`;
    }

    let result: string;
    if (activeKey.provider === "openrouter") {
      const openRouterModel = model ?? activeKey.model ?? OPENROUTER_DEFAULT_MODEL;
      result = await callOpenRouter(prompt, activeKey.key_value, openRouterModel);
    } else {
      result = await callGemini(prompt, activeKey.key_value);
    }

    return jsonResponse({ translatedText: result, source: "ai", provider: activeKey.provider });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
