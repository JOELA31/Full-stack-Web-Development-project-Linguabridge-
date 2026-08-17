import { useState, useEffect, useCallback } from 'react';
import { X, Key, Check, AlertCircle, Loader2, Trash2, ExternalLink } from 'lucide-react';
import { checkApiKey, saveApiKey, deleteApiKey, KeyStatus, Provider } from '@/services/apikeyservice';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyChanged: () => void;
}

const OPENROUTER_MODELS = [
  { id: 'openai/gpt-4o-mini', label: 'GPT-4o Mini (fast, affordable)' },
  { id: 'openai/gpt-4o', label: 'GPT-4o (high quality)' },
  { id: 'google/gemini-flash-1.5', label: 'Gemini Flash 1.5 (fast)' },
  { id: 'meta-llama/llama-3.1-8b-instruct', label: 'Llama 3.1 8B (free)' },
  { id: 'mistralai/mistral-7b-instruct', label: 'Mistral 7B (free)' },
  { id: 'qwen/qwen-2.5-7b-instruct', label: 'Qwen 2.5 7B (free)' },
];

export default function SettingsModal({ isOpen, onClose, onKeyChanged }: SettingsModalProps) {
  const [status, setStatus] = useState<KeyStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>('gemini');
  const [inputKey, setInputKey] = useState('');
  const [openRouterModel, setOpenRouterModel] = useState(OPENROUTER_MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const s = await checkApiKey();
      setStatus(s);
    } catch {
      setStatus(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      setSuccess(null);
      setInputKey('');
      fetchStatus();
    }
  }, [isOpen, fetchStatus]);

  const handleSave = useCallback(async () => {
    if (!inputKey.trim()) {
      setError('Please enter an API key');
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const model = selectedProvider === 'openrouter' ? openRouterModel : undefined;
      await saveApiKey(inputKey.trim(), selectedProvider, model);
      setSuccess(`${selectedProvider === 'gemini' ? 'Gemini' : 'OpenRouter'} API key saved. AI translation is now active.`);
      setInputKey('');
      await fetchStatus();
      onKeyChanged();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Could not save the key';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [inputKey, selectedProvider, openRouterModel, fetchStatus, onKeyChanged]);

  const handleDelete = useCallback(
    async (provider: Provider) => {
      setLoading(true);
      setError(null);
      setSuccess(null);
      try {
        await deleteApiKey(provider);
        setSuccess(`${provider === 'gemini' ? 'Gemini' : 'OpenRouter'} API key removed.`);
        await fetchStatus();
        onKeyChanged();
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Could not remove the key';
        setError(msg);
      } finally {
        setLoading(false);
      }
    },
    [fetchStatus, onKeyChanged]
  );

  if (!isOpen) return null;

  const geminiActive = status?.providers?.gemini?.hasKey ?? false;
  const openRouterActive = status?.providers?.openrouter?.hasKey ?? false;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#3D3A36]/30 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-md rounded-2xl border border-[#E8E4EF] bg-white shadow-2xl shadow-[#9B86C9]/15 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8E4EF] sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#F0EDF7] flex items-center justify-center">
              <Key className="w-4 h-4 text-[#7C6BAA]" />
            </div>
            <h2 className="text-sm font-semibold text-[#3D3A36]">AI Provider Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-[#F0EDF7] text-[#9C9690] hover:text-[#5C5750] flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* Provider status overview */}
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 rounded-lg bg-[#F8F5F2] px-3 py-2.5 border border-[#E8E4EF]">
              <div className={`w-2 h-2 rounded-full ${geminiActive ? 'bg-emerald-500 animate-pulse' : 'bg-[#D5D0E0]'}`} />
              <span className="text-xs text-[#5C5750] flex-1">Google Gemini</span>
              {geminiActive ? (
                <span className="text-[11px] text-emerald-600">Active</span>
              ) : (
                <span className="text-[11px] text-[#B5B0AA]">Not configured</span>
              )}
              {geminiActive && (
                <button
                  onClick={() => handleDelete('gemini')}
                  disabled={loading}
                  className="text-[#B5B0AA] hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2.5 rounded-lg bg-[#F8F5F2] px-3 py-2.5 border border-[#E8E4EF]">
              <div className={`w-2 h-2 rounded-full ${openRouterActive ? 'bg-emerald-500 animate-pulse' : 'bg-[#D5D0E0]'}`} />
              <span className="text-xs text-[#5C5750] flex-1">OpenRouter</span>
              {openRouterActive ? (
                <span className="text-[11px] text-emerald-600">Active</span>
              ) : (
                <span className="text-[11px] text-[#B5B0AA]">Not configured</span>
              )}
              {openRouterActive && (
                <button
                  onClick={() => handleDelete('openrouter')}
                  disabled={loading}
                  className="text-[#B5B0AA] hover:text-red-500 disabled:opacity-50 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          <p className="text-xs text-[#7A756D] leading-relaxed">
            Choose an AI provider and enter your API key. The key is stored securely on the server
            and never exposed to the browser. You can configure one or both providers.
          </p>

          {/* Provider selector */}
          <div>
            <label className="text-[11px] font-medium text-[#9C9690] mb-1.5 block">Provider</label>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setSelectedProvider('gemini')}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                  selectedProvider === 'gemini'
                    ? 'bg-[#B8A9D9]/20 text-[#7C6BAA] border-[#9B86C9]/30'
                    : 'bg-[#F8F5F2] text-[#7A756D] border-[#E8E4EF] hover:bg-[#F0EDF7]'
                }`}
              >
                Google Gemini
              </button>
              <button
                onClick={() => setSelectedProvider('openrouter')}
                className={`rounded-lg px-3 py-2 text-xs font-medium transition-all border ${
                  selectedProvider === 'openrouter'
                    ? 'bg-[#B8A9D9]/20 text-[#7C6BAA] border-[#9B86C9]/30'
                    : 'bg-[#F8F5F2] text-[#7A756D] border-[#E8E4EF] hover:bg-[#F0EDF7]'
                }`}
              >
                OpenRouter
              </button>
            </div>
          </div>

          {/* Provider-specific info */}
          {selectedProvider === 'gemini' ? (
            <>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#7C6BAA] hover:text-[#6B5B9A] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get a free Gemini API key from Google AI Studio
              </a>
              <div>
                <label className="text-[11px] font-medium text-[#9C9690] mb-1.5 block">Gemini API Key</label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="AIza..."
                  className="w-full rounded-lg bg-white border border-[#DDD7E8] px-3 py-2.5 text-sm text-[#3D3A36] placeholder:text-[#B5B0AA] focus:outline-none focus:border-[#9B86C9]/50 transition-colors font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
            </>
          ) : (
            <>
              <a
                href="https://openrouter.ai/keys"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-[#7C6BAA] hover:text-[#6B5B9A] transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Get an OpenRouter API key
              </a>
              <div>
                <label className="text-[11px] font-medium text-[#9C9690] mb-1.5 block">OpenRouter API Key</label>
                <input
                  type="password"
                  value={inputKey}
                  onChange={(e) => setInputKey(e.target.value)}
                  placeholder="sk-or-v1-..."
                  className="w-full rounded-lg bg-white border border-[#DDD7E8] px-3 py-2.5 text-sm text-[#3D3A36] placeholder:text-[#B5B0AA] focus:outline-none focus:border-[#9B86C9]/50 transition-colors font-mono"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div>
                <label className="text-[11px] font-medium text-[#9C9690] mb-1.5 block">Model</label>
                <select
                  value={openRouterModel}
                  onChange={(e) => setOpenRouterModel(e.target.value)}
                  className="w-full rounded-lg bg-white border border-[#DDD7E8] px-3 py-2.5 text-sm text-[#3D3A36] focus:outline-none focus:border-[#9B86C9]/50 transition-colors cursor-pointer"
                >
                  {OPENROUTER_MODELS.map((m) => (
                    <option key={m.id} value={m.id} className="bg-white">
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-[#B5B0AA] mt-1.5">
                  Free models work without credits. Paid models require an OpenRouter balance.
                </p>
              </div>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-red-600">{error}</span>
            </div>
          )}

          {/* Success */}
          {success && (
            <div className="flex items-start gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2.5">
              <Check className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-emerald-700">{success}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-[#E8E4EF] sticky bottom-0 bg-white">
          <button
            onClick={onClose}
            className="px-3 py-2 text-xs text-[#7A756D] hover:text-[#3D3A36] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={loading || !inputKey.trim()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#9B86C9] hover:bg-[#8B7ABE] disabled:bg-[#D5D0E0] disabled:text-white text-white text-xs font-medium transition-colors"
          >
            {loading ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Check className="w-3.5 h-3.5" />
            )}
            Save key
          </button>
        </div>
      </div>
    </div>
  );
}
