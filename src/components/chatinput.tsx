import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Square } from 'lucide-react';

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled: boolean;
  isListening: boolean;
  interimTranscript: string;
  voiceTranscript: string;
  onStartListening: () => void;
  onStopListening: () => void;
  onResetTranscript: () => void;
  voiceSupported: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSend,
  disabled,
  isListening,
  interimTranscript,
  voiceTranscript,
  onStartListening,
  onStopListening,
  onResetTranscript,
  voiceSupported,
  placeholder = 'Type a message to translate…',
}: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (voiceTranscript) {
      setText(voiceTranscript);
    }
  }, [voiceTranscript]);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [text]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText('');
    onResetTranscript();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const displayText = isListening && interimTranscript ? text + ' ' + interimTranscript : text;

  return (
    <div className="border-t border-[#E8E4EF] bg-[#F5F2EE]/80 backdrop-blur-sm px-4 py-3">
      <div className="flex items-end gap-2">
        {voiceSupported && (
          <button
            onClick={isListening ? onStopListening : onStartListening}
            className={`flex-shrink-0 w-11 h-11 rounded-xl flex items-center justify-center transition-all ${
              isListening
                ? 'bg-red-500/15 text-red-500 border border-red-500/25'
                : 'bg-[#F0EDF7] text-[#7A756D] hover:text-[#7C6BAA] hover:bg-[#B8A9D9]/15 border border-[#E8E4EF]'
            }`}
            title={isListening ? 'Stop recording' : 'Start voice input'}
          >
            {isListening ? <Square className="w-4 h-4" /> : <Mic className="w-5 h-5" />}
          </button>
        )}

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={displayText}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            rows={1}
            placeholder={isListening ? 'Listening…' : placeholder}
            className="w-full resize-none rounded-xl bg-white border border-[#DDD7E8] px-4 py-3 text-sm text-[#3D3A36] placeholder:text-[#B5B0AA] focus:outline-none focus:border-[#9B86C9]/50 focus:bg-white transition-all disabled:opacity-50"
          />
          {isListening && (
            <div className="absolute -top-2 left-3 flex items-center gap-1 bg-[#F5F2EE] px-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
              <span className="text-[10px] text-red-500 font-medium">REC</span>
            </div>
          )}
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex-shrink-0 w-11 h-11 rounded-xl bg-gradient-to-br from-[#9B86C9] to-[#B8A9D9] text-white flex items-center justify-center transition-all hover:shadow-lg hover:shadow-[#9B86C9]/25 disabled:opacity-30 disabled:hover:shadow-none"
          title="Send message"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
