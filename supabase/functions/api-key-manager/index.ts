import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VALID_PROVIDERS = ["gemini", "openrouter"];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(message: string, status = 400): Response {
  return jsonResponse({ error: message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return errorResponse("Server not configured", 500);
    }

    const { createClient } = await import("npm:@supabase/supabase-js@2.45.4");
    const adminClient = createClient(SUPABASE_URL, SERVICE_KEY);

    // GET — check which providers have active keys (returns booleans, never key values)
    if (req.method === "GET") {
      const { data, error } = await adminClient
        .from("api_keys")
        .select("id, provider, is_active, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false });

      if (error) throw error;

      const providers: Record<string, { hasKey: boolean; updatedAt: string | null }> = {
        gemini: { hasKey: false, updatedAt: null },
        openrouter: { hasKey: false, updatedAt: null },
      };

      for (const row of data ?? []) {
        if (VALID_PROVIDERS.includes(row.provider) && providers[row.provider] && !providers[row.provider].hasKey) {
          providers[row.provider] = { hasKey: true, updatedAt: row.updated_at };
        }
      }

      return jsonResponse({ providers });
    }

    // POST — save a new key for a specific provider
    if (req.method === "POST") {
      const body = await req.json();
      const { apiKey, provider, model } = body;

      if (!apiKey || !apiKey.trim()) {
        return errorResponse("Missing apiKey field");
      }
      const p = VALID_PROVIDERS.includes(provider) ? provider : "gemini";

      // Deactivate existing keys for this provider
      await adminClient
        .from("api_keys")
        .update({ is_active: false })
        .eq("provider", p);

      // Insert the new key
      const insertData: Record<string, unknown> = {
        provider: p,
        key_value: apiKey.trim(),
        is_active: true,
      };

      // Store the OpenRouter model alongside the key if provided
      if (p === "openrouter" && model) {
        insertData.model = model.trim();
      }

      const { error: insertError } = await adminClient
        .from("api_keys")
        .insert(insertData);

      if (insertError) throw insertError;

      return jsonResponse({ success: true, message: `${p} API key saved` });
    }

    // DELETE — remove keys for a specific provider (or all if no provider specified)
    if (req.method === "DELETE") {
      const url = new URL(req.url);
      const provider = url.searchParams.get("provider");

      let query = adminClient.from("api_keys").delete();
      if (provider && VALID_PROVIDERS.includes(provider)) {
        query = query.eq("provider", provider);
      }

      const { error: delError } = await query;

      if (delError) throw delError;

      return jsonResponse({ success: true, message: "API key(s) removed" });
    }

    return errorResponse("Method not allowed", 405);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(message, 500);
  }
});
