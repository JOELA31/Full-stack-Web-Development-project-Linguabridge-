// Generates conversational AI responses in the target language.
// Delegates to the ai-translate edge function (Gemini), with a
// built-in fallback if the server is unreachable.

import { generateAIReply } from '@/services/translationService';
import { buildContextPrefix, retrieveRelevantTranslations } from '@/services/ragService';

interface LLMResponse {
  reply: string;
}

// Fallback replies used only if the edge function is unavailable.
const FALLBACK_REPLIES: Record<string, string[]> = {
  en: [
    "That's interesting! Tell me more.",
    'I understand. How can I help?',
    'Great! What would you like to do next?',
  ],
};

let fallbackIndex = 0;

export async function generateReply(userText: string, targetLang: string): Promise<LLMResponse> {
  // Retrieve RAG context for a more consistent reply
  const ragContext = await retrieveRelevantTranslations(userText, targetLang, targetLang);
  const contextStr = buildContextPrefix(ragContext.entries);

  try {
    const reply = await generateAIReply(userText, targetLang, contextStr || undefined);
    return { reply };
  } catch {
    // Fallback so the chat doesn't break if the server is down
    const replies = FALLBACK_REPLIES[targetLang] ?? FALLBACK_REPLIES.en;
    const reply = replies[fallbackIndex % replies.length];
    fallbackIndex++;
    return { reply };
  }
}

export async function suggestConversationTitle(firstMessage: string, _lang: string): Promise<string> {
  const trimmed = firstMessage.trim().slice(0, 40);
  return trimmed.length < firstMessage.trim().length ? `${trimmed}…` : trimmed;
}
