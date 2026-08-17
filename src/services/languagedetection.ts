// Lightweight trigram-based language detection.
// Works on short phrases typical of chat without external API calls.

const SAMPLES: Record<string, string[]> = {
  en: ['the', 'and', 'is', 'are', 'you', 'hello', 'thank', 'what', 'how', 'this', 'that', 'with', 'have', 'for', 'not'],
  es: ['el', 'la', 'los', 'las', 'que', 'hola', 'gracias', 'esto', 'como', 'esta', 'bien', 'si', 'no', 'con', 'por'],
  fr: ['le', 'la', 'les', 'que', 'bonjour', 'merci', 'ce', 'comment', 'est', 'sont', 'avec', 'pour', 'oui', 'non', 'vous'],
  de: ['der', 'die', 'das', 'und', 'ist', 'sind', 'hallo', 'danke', 'das', 'mit', 'nicht', 'ja', 'nein', 'was', 'wie'],
  it: ['il', 'la', 'le', 'che', 'ciao', 'grazie', 'questo', 'come', 'sono', 'con', 'per', 'si', 'no', 'cosa', 'bene'],
  pt: ['o', 'a', 'os', 'as', 'que', 'ola', 'obrigado', 'isto', 'como', 'esta', 'sim', 'nao', 'com', 'por', 'bem'],
  nl: ['de', 'het', 'een', 'en', 'is', 'hallo', 'dank', 'dit', 'hoe', 'met', 'niet', 'ja', 'nee', 'wat', 'zijn'],
  ru: ['что', 'это', 'как', 'да', 'нет', 'спасибо', 'привет', 'с', 'не', 'вы', 'быть'],
  ja: ['こんにちは', 'ありがとう', 'はい', 'いいえ', 'これ', 'それ', 'する', 'です', 'ます'],
  ko: ['안녕', '감사', '네', '아니', '이것', '저것', '하는', '있다'],
  zh: ['你好', '谢谢', '是', '不', '这', '那', '什么', '怎么', '的', '了'],
  ar: ['مرحبا', 'شكرا', 'نعم', 'لا', 'هذا', 'ذلك', 'كيف', 'ما'],
  hi: ['नमस्ते', 'धन्यवाद', 'हां', 'नहीं', 'यह', 'वह', 'कैसे', 'क्या'],
  bn: ['নমস্কার', 'ধন্যবাদ', 'হ্যাঁ', 'না', 'এই', 'সেই', 'কিভাবে', 'কি'],
  te: ['నమస్తే', 'ధన్యవాదాలు', 'అవును', 'లేదు', 'ఇది', 'అది', 'ఎలా', 'ఏమిటి'],
  ta: ['வணக்கம்', 'நன்றி', 'ஆம்', 'இல்லை', 'இது', 'அது', 'எப்படி', 'என்ன'],
  mr: ['नमस्कार', 'धन्यवाद', 'होय', 'नाही', 'हे', 'ते', 'कसे', 'काय'],
  gu: ['નમસ્તે', 'આભાર', 'હા', 'ના', 'આ', 'તે', 'કેવી', 'શું'],
  kn: ['ನಮಸ್ಕಾರ', 'ಧನ್ಯವಾದ', 'ಹೌದು', 'ಇಲ್ಲ', 'ಇದು', 'ಅದು', 'ಹೇಗೆ', 'ಏನು'],
  ml: ['നമസ്കാരം', 'നന്ദി', 'അതെ', 'ഇല്ല', 'ഇത്', 'അത്', 'എങ്ങനെ', 'എന്ത്'],
  pa: ['ਸਤ ਸ੍ਰੀ ਅਕਾਲ', 'ਧੰਨਵਾਦ', 'ਹਾਂ', 'ਨਹੀਂ', 'ਇਹ', 'ਉਹ', 'ਕਿਵੇਂ', 'ਕੀ'],
  ur: ['سلام', 'شکریہ', 'ہاں', 'نہیں', 'یہ', 'وہ', 'کیسے', 'کیا'],
  tr: ['merhaba', 'tesekkür', 'evet', 'hayir', 'bu', 'su', 'nasıl', 'ne', 'ile', 'için'],
  pl: ['cześć', 'dziękuję', 'tak', 'nie', 'to', 'jak', 'co', 'jest', 'z', 'dla'],
  sv: ['hej', 'tack', 'ja', 'nej', 'det', 'hur', 'vad', 'är', 'med', 'inte'],
};

export function detectLanguage(text: string): { code: string; confidence: number } {
  if (!text || !text.trim()) return { code: 'en', confidence: 0 };

  const lower = text.toLowerCase();
  const scores: Record<string, number> = {};

  for (const [code, words] of Object.entries(SAMPLES)) {
    let score = 0;
    for (const word of words) {
      if (lower.includes(word.toLowerCase())) {
        score += 1;
      }
    }
    // Bonus for CJK / non-latin scripts
    if (code === 'ja' && /[\u3040-\u30ff]/.test(text)) score += 3;
    if (code === 'ko' && /[\uac00-\ud7af]/.test(text)) score += 3;
    if (code === 'zh' && /[\u4e00-\u9fff]/.test(text)) score += 3;
    if (code === 'ar' && /[\u0600-\u06ff]/.test(text)) score += 3;
    if (code === 'hi' && /[\u0900-\u097f]/.test(text)) score += 3;
    if (code === 'bn' && /[\u0980-\u09ff]/.test(text)) score += 3;
    if (code === 'te' && /[\u0c00-\u0c7f]/.test(text)) score += 3;
    if (code === 'ta' && /[\u0b80-\u0bff]/.test(text)) score += 3;
    if (code === 'mr' && /[\u0900-\u097f]/.test(text)) score += 3;
    if (code === 'gu' && /[\u0a80-\u0aff]/.test(text)) score += 3;
    if (code === 'kn' && /[\u0c80-\u0cff]/.test(text)) score += 3;
    if (code === 'ml' && /[\u0d00-\u0d7f]/.test(text)) score += 3;
    if (code === 'pa' && /[\u0a00-\u0a7f]/.test(text)) score += 3;
    if (code === 'ur' && /[\u0600-\u06ff]/.test(text)) score += 3;
    if (code === 'ru' && /[\u0400-\u04ff]/.test(text)) score += 3;
    scores[code] = score;
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  if (sorted.length === 0 || sorted[0][1] === 0) return { code: 'en', confidence: 0.3 };

  const top = sorted[0];
  const total = sorted.reduce((sum, [, s]) => sum + s, 0);
  const confidence = total > 0 ? top[1] / total : 0.3;

  return { code: top[0], confidence: Math.min(0.95, 0.4 + confidence) };
}
