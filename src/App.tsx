import { useState, useEffect, useCallback } from 'react';
import { Languages, Sparkles, Settings, Check, AlertCircle } from 'lucide-react';
import { supabase, Conversation, Message } from '@/lib/supabase';
import { detectLanguage } from '@/services/languagedetection';
import { translateText, saveToMemory } from '@/services/translationservice';
import { generateReply, suggestConversationTitle } from '@/services/llmservice';
import { retrieveRelevantTranslations } from '@/services/ragService';
import { useVoice, toSpeechLangCode } from '@/hooks/usevoice';
import { checkApiKey, KeyStatus } from '@/services/apikeyservice';
import ControlBar from '@/components/controlbar';
import ChatWindow from '@/components/chatwindow';
import ChatInput from '@/components/chatinput';
import SettingsModal from '@/components/SettingsModal';

function App() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sourceLang, setSourceLang] = useState('en');
  const [targetLang, setTargetLang] = useState('es');
  const [isLoading, setIsLoading] = useState(false);
  const [memoryCount, setMemoryCount] = useState(0);
  const [speakingId, setSpeakingId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [keyStatus, setKeyStatus] = useState<KeyStatus | null>(null);

  const voice = useVoice();

  // Load conversations + memory count on mount
  useEffect(() => {
    (async () => {
      const { data: convs } = await supabase
        .from('conversations')
        .select('*')
        .order('updated_at', { ascending: false });
      if (convs) setConversations(convs as Conversation[]);

      const { count } = await supabase
        .from('translation_memory')
        .select('*', { count: 'exact', head: true });
      setMemoryCount(count ?? 0);

      try {
        const ks = await checkApiKey();
        setKeyStatus(ks);
      } catch {
        setKeyStatus(null);
      }
    })();
  }, []);

  // Load messages when active conversation changes
  useEffect(() => {
    if (!activeConversationId) {
      setMessages([]);
      return;
    }
    (async () => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });
      if (msgs) setMessages(msgs as Message[]);

      // Sync language settings from conversation
      const conv = conversations.find((c) => c.id === activeConversationId);
      if (conv) {
        setSourceLang(conv.source_lang);
        setTargetLang(conv.target_lang);
      }
    })();
  }, [activeConversationId]);

  const handleNewConversation = useCallback(async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        title: 'New Conversation',
        source_lang: sourceLang,
        target_lang: targetLang,
      })
      .select()
      .single();

    if (error || !data) return;

    const newConv = data as Conversation;
    setConversations((prev) => [newConv, ...prev]);
    setActiveConversationId(newConv.id);
    setMessages([]);
  }, [sourceLang, targetLang]);

  const handleDeleteConversation = useCallback(
    async (id: string) => {
      await supabase.from('conversations').delete().eq('id', id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        setActiveConversationId(null);
        setMessages([]);
      }
    },
    [activeConversationId]
  );

  const handleSwap = useCallback(() => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  }, [sourceLang, targetLang]);

  const handleSpeak = useCallback(
    (text: string, lang: string) => {
      if (speakingId) {
        voice.stopSpeaking();
        setSpeakingId(null);
        return;
      }
      voice.speak(text, toSpeechLangCode(lang));
      setSpeakingId('active');
      setTimeout(() => setSpeakingId(null), 5000);
    },
    [speakingId, voice]
  );

  const handleSend = useCallback(
    async (text: string) => {
      if (!activeConversationId) {
        const { data, error } = await supabase
          .from('conversations')
          .insert({ title: text.slice(0, 40), source_lang: sourceLang, target_lang: targetLang })
          .select()
          .single();
        if (error || !data) return;
        const newConv = data as Conversation;
        setConversations((prev) => [newConv, ...prev]);
        setActiveConversationId(newConv.id);
      }

      const convId = activeConversationId ?? (conversations[0]?.id ?? '');
      if (!convId) return;

      setIsLoading(true);

      const detected = detectLanguage(text);
      const ragContext = await retrieveRelevantTranslations(text, sourceLang, targetLang);
      const translation = await translateText(text, sourceLang, targetLang);

      const { data: userMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'user',
          original_text: text,
          translated_text: translation.translatedText,
          source_lang: sourceLang,
          target_lang: targetLang,
        })
        .select()
        .single();

      if (userMsg) {
        setMessages((prev) => [...prev, userMsg as Message]);
      }

      if (translation.source === 'fallback' && !translation.translatedText.startsWith('[')) {
        await saveToMemory(text, sourceLang, translation.translatedText, targetLang);
        setMemoryCount((c) => c + 1);
      }

      const { reply } = await generateReply(text, targetLang);
      const replyTranslation = await translateText(reply, targetLang, sourceLang);

      const { data: aiMsg } = await supabase
        .from('messages')
        .insert({
          conversation_id: convId,
          role: 'assistant',
          original_text: reply,
          translated_text: replyTranslation.translatedText,
          source_lang: targetLang,
          target_lang: sourceLang,
        })
        .select()
        .single();

      if (aiMsg) {
        setMessages((prev) => [...prev, aiMsg as Message]);
      }

      const conv = conversations.find((c) => c.id === convId);
      if (conv && conv.title === 'New Conversation') {
        const title = await suggestConversationTitle(text, sourceLang);
        await supabase.from('conversations').update({ title, updated_at: new Date().toISOString() }).eq('id', convId);
        setConversations((prev) =>
          prev.map((c) => (c.id === convId ? { ...c, title } : c))
        );
      }

      await supabase.from('conversations').update({ updated_at: new Date().toISOString() }).eq('id', convId);

      setIsLoading(false);
    },
    [activeConversationId, conversations, sourceLang, targetLang]
  );

  const handleStartListening = useCallback(() => {
    voice.startListening(toSpeechLangCode(sourceLang));
  }, [voice, sourceLang]);

  const handleStopListening = useCallback(() => {
    voice.stopListening();
  }, [voice]);

  return (
    <div className="h-screen flex bg-[#FAF8F5] text-[#3D3A36] overflow-hidden">
      <ControlBar
        sourceLang={sourceLang}
        targetLang={targetLang}
        onSourceChange={setSourceLang}
        onTargetChange={setTargetLang}
        onSwap={handleSwap}
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={setActiveConversationId}
        onNewConversation={handleNewConversation}
        onDeleteConversation={handleDeleteConversation}
        memoryCount={memoryCount}
      />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex-shrink-0 border-b border-[#E8E4EF] bg-[#F8F5F2]/80 backdrop-blur-sm px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#9B86C9] to-[#B8A9D9] flex items-center justify-center shadow-lg shadow-[#9B86C9]/20">
              <Languages className="w-5 h-5 text-white" strokeWidth={2} />
            </div>
            <div>
              <h1 className="text-base font-semibold tracking-tight text-[#3D3A36]">LinguaBridge</h1>
              <p className="text-[11px] text-[#9C9690]">Real-time translation chat</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-[11px] text-[#9C9690]">
              <Sparkles className="w-3.5 h-3.5 text-[#9B86C9]" />
              <span>AI-powered · RAG-enhanced</span>
            </div>
            {keyStatus?.hasAnyKey ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/12 px-2 py-0.5 text-[11px] font-medium text-emerald-600">
                <Check className="w-3 h-3" />
                AI active
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/12 px-2 py-0.5 text-[11px] font-medium text-amber-600">
                <AlertCircle className="w-3 h-3" />
                No key
              </span>
            )}
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-7 h-7 rounded-lg hover:bg-[#F0EDF7] text-[#9C9690] hover:text-[#7C6BAA] flex items-center justify-center transition-colors"
              title="API key settings"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Chat area */}
        <ChatWindow messages={messages} isLoading={isLoading} onSpeak={handleSpeak} speakingId={speakingId} />

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          disabled={isLoading}
          isListening={voice.isListening}
          interimTranscript={voice.interimTranscript}
          voiceTranscript={voice.transcript}
          onStartListening={handleStartListening}
          onStopListening={handleStopListening}
          onResetTranscript={voice.resetTranscript}
          voiceSupported={voice.isSupported}
        />
      </main>

      <SettingsModal
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onKeyChanged={() => {
          checkApiKey().then(setKeyStatus).catch(() => setKeyStatus(null));
        }}
      />
    </div>
  );
}

export default App;
