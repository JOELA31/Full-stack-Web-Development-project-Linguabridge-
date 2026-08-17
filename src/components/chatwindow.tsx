import { useEffect, useRef } from 'react';
import { Volume2, User, Bot } from 'lucide-react';
import { Message } from '@/lib/supabase';
import { getLanguageName } from '@/lib/supabase';

interface ChatWindowProps {
  messages: Message[];
  isLoading: boolean;
  onSpeak: (text: string, lang: string) => void;
  speakingId: string | null;
}

export default function ChatWindow({ messages, isLoading, onSpeak, speakingId }: ChatWindowProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (messages.length === 0 && !isLoading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-[#9B86C9] to-[#B8A9D9] flex items-center justify-center mb-5 shadow-lg shadow-[#9B86C9]/15">
          <Bot className="w-10 h-10 text-white" strokeWidth={1.5} />
        </div>
        <h3 className="text-lg font-semibold text-[#3D3A36] mb-2">Start translating</h3>
        <p className="text-sm text-[#7A756D] max-w-xs">
          Type or speak a message below. It will be translated automatically and the AI will reply in your target language.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5 scroll-smooth">
      {messages.map((msg) => {
        const isUser = msg.role === 'user';
        return (
          <div
            key={msg.id}
            className={`flex gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'} animate-[fadeIn_0.3s_ease-out]`}
          >
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center ${
                isUser
                  ? 'bg-[#B8A9D9]/25 text-[#7C6BAA]'
                  : 'bg-[#F0EDF7] text-[#9B86C9]'
              }`}
            >
              {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>

            <div className={`flex flex-col gap-1.5 max-w-[78%] ${isUser ? 'items-end' : 'items-start'}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  isUser
                    ? 'bg-[#B8A9D9]/15 border border-[#B8A9D9]/25 rounded-tr-md'
                    : 'bg-white border border-[#E8E4EF] rounded-tl-md shadow-sm'
                }`}
              >
                <p className="text-sm text-[#3D3A36] leading-relaxed">{msg.original_text}</p>
                <div className="mt-2 pt-2 border-t border-[#E8E4EF]">
                  <p className="text-sm text-[#7A756D] leading-relaxed italic">
                    {msg.translated_text}
                  </p>
                </div>
              </div>

              <div className={`flex items-center gap-2 text-[11px] text-[#9C9690] ${isUser ? 'flex-row-reverse' : ''}`}>
                <span className="font-medium">
                  {getLanguageName(msg.source_lang)} → {getLanguageName(msg.target_lang)}
                </span>
                <button
                  onClick={() => onSpeak(msg.translated_text, msg.target_lang)}
                  className={`hover:text-[#7C6BAA] transition-colors ${
                    speakingId === msg.id ? 'text-[#7C6BAA] animate-pulse' : ''
                  }`}
                  title="Play translation"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {isLoading && (
        <div className="flex gap-3 animate-[fadeIn_0.3s_ease-out]">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-[#F0EDF7] text-[#9B86C9] flex items-center justify-center">
            <Bot className="w-5 h-5" />
          </div>
          <div className="rounded-2xl px-4 py-3 bg-white border border-[#E8E4EF] rounded-tl-md shadow-sm">
            <div className="flex gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#9B86C9]/50 animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#9B86C9]/50 animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-2 h-2 rounded-full bg-[#9B86C9]/50 animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
          </div>
        </div>
      )}

      <div ref={endRef} />
    </div>
  );
}
