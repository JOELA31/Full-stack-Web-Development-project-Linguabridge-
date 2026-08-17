import { ArrowLeftRight, Plus, BookOpen, Trash2 } from 'lucide-react';
import { LANGUAGES, Conversation } from '@/lib/supabase';

interface ControlBarProps {
  sourceLang: string;
  targetLang: string;
  onSourceChange: (lang: string) => void;
  onTargetChange: (lang: string) => void;
  onSwap: () => void;
  conversations: Conversation[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  memoryCount: number;
}

export default function ControlBar({
  sourceLang,
  targetLang,
  onSourceChange,
  onTargetChange,
  onSwap,
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
  memoryCount,
}: ControlBarProps) {
  return (
    <aside className="w-72 flex-shrink-0 border-r border-[#E8E4EF] bg-[#F5F2EE] flex flex-col">
      {/* Language selectors */}
      <div className="p-4 border-b border-[#E8E4EF]">
        <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#9C9690] mb-3">
          Translation
        </h2>
        <div className="space-y-2">
          <div>
            <label className="text-[11px] text-[#9C9690] mb-1 block">From</label>
            <select
              value={sourceLang}
              onChange={(e) => onSourceChange(e.target.value)}
              className="w-full rounded-lg bg-white border border-[#DDD7E8] px-3 py-2 text-sm text-[#3D3A36] focus:outline-none focus:border-[#9B86C9]/50 transition-colors cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-white">
                  {l.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-center">
            <button
              onClick={onSwap}
              className="w-8 h-8 rounded-lg bg-[#F0EDF7] hover:bg-[#B8A9D9]/20 text-[#7A756D] hover:text-[#7C6BAA] flex items-center justify-center transition-all border border-[#E8E4EF] hover:border-[#B8A9D9]/30"
              title="Swap languages"
            >
              <ArrowLeftRight className="w-4 h-4" />
            </button>
          </div>

          <div>
            <label className="text-[11px] text-[#9C9690] mb-1 block">To</label>
            <select
              value={targetLang}
              onChange={(e) => onTargetChange(e.target.value)}
              className="w-full rounded-lg bg-white border border-[#DDD7E8] px-3 py-2 text-sm text-[#3D3A36] focus:outline-none focus:border-[#9B86C9]/50 transition-colors cursor-pointer"
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code} className="bg-white">
                  {l.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Translation memory indicator */}
      <div className="px-4 py-3 border-b border-[#E8E4EF]">
        <div className="flex items-center gap-2 text-xs text-[#7A756D]">
          <BookOpen className="w-4 h-4 text-[#9B86C9]" />
          <span>Translation memory</span>
          <span className="ml-auto rounded-full bg-[#B8A9D9]/20 text-[#7C6BAA] px-2 py-0.5 text-[11px] font-medium">
            {memoryCount}
          </span>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-4 pt-4 pb-2 flex items-center justify-between">
          <h2 className="text-[11px] font-semibold uppercase tracking-wider text-[#9C9690]">
            Chats
          </h2>
          <button
            onClick={onNewConversation}
            className="w-6 h-6 rounded-md bg-[#F0EDF7] hover:bg-[#B8A9D9]/20 text-[#7A756D] hover:text-[#7C6BAA] flex items-center justify-center transition-all"
            title="New conversation"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-3 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-[#B5B0AA] px-3 py-4 text-center">No conversations yet</p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-all ${
                  activeConversationId === conv.id
                    ? 'bg-[#B8A9D9]/20 text-[#7C6BAA] border border-[#B8A9D9]/30'
                    : 'hover:bg-[#F0EDF7] text-[#7A756D] border border-transparent'
                }`}
              >
                <span className="text-[10px] font-mono uppercase opacity-60">
                  {conv.source_lang}→{conv.target_lang}
                </span>
                <span className="text-sm truncate flex-1">{conv.title}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteConversation(conv.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 text-[#B5B0AA] hover:text-red-500 transition-all"
                  title="Delete conversation"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </aside>
  );
}
