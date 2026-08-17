// Frontend service for managing AI provider API keys via the api-key-manager edge function.
// Keys are sent to the server function which stores them securely — they never
// touch the browser's persistent state and can never be read back by the client.

const KEY_MANAGER_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/api-key-manager`;

export type Provider = 'gemini' | 'openrouter';

function getHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
  };
}

export interface ProviderStatus {
  hasKey: boolean;
  updatedAt: string | null;
}

export interface KeyStatus {
  providers: Record<Provider, ProviderStatus>;
  hasAnyKey: boolean;
}

export async function checkApiKey(): Promise<KeyStatus> {
  const response = await fetch(KEY_MANAGER_URL, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Could not check API key status (${response.status})`);
  }

  const data = await response.json();
  if (!data || !data.providers) {
    throw new Error('Invalid response from key manager');
  }

  const providers = data.providers as Record<Provider, ProviderStatus>;
  return {
    providers,
    hasAnyKey: providers.gemini?.hasKey || providers.openrouter?.hasKey || false,
  };
}

export async function saveApiKey(
  apiKey: string,
  provider: Provider,
  model?: string
): Promise<void> {
  const response = await fetch(KEY_MANAGER_URL, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ apiKey, provider, model }),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Could not save API key (${response.status})`);
  }
}

export async function deleteApiKey(provider: Provider): Promise<void> {
  const url = `${KEY_MANAGER_URL}?provider=${provider}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({}));
    throw new Error(errBody.error ?? `Could not remove API key (${response.status})`);
  }
}
