import { useState, useRef, useCallback, useEffect } from 'react';

// Minimal typing for the Web Speech API (not in standard lib.dom.d.ts)
interface SpeechRecognitionEventLike {
  resultIndex: number;
  results: {
    length: number;
    [index: number]: {
      0: { transcript: string };
      isFinal: boolean;
    };
  };
}

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

type SpeechRecognitionConstructor = new () => SpeechRecognitionLike;

function getRecognitionConstructor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  return (w.SpeechRecognition || w.webkitSpeechRecognition) as SpeechRecognitionConstructor | null;
}

interface UseVoiceReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  startListening: (lang?: string) => void;
  stopListening: () => void;
  resetTranscript: () => void;
  speak: (text: string, lang?: string) => void;
  isSpeaking: boolean;
  stopSpeaking: () => void;
  isSupported: boolean;
}

export function useVoice(): UseVoiceReturn {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const isSupported = getRecognitionConstructor() !== null;

  const startListening = useCallback((lang = 'en-US') => {
    const ctor = getRecognitionConstructor();
    if (!ctor) return;

    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }

    const recognition = new ctor();
    recognition.lang = lang;
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (e: SpeechRecognitionEventLike) => {
      let interim = '';
      let final = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      if (final) {
        setTranscript((prev) => (prev ? prev + ' ' : '') + final.trim());
        setInterimTranscript('');
      } else {
        setInterimTranscript(interim);
      }
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
    };

    recognitionRef.current = recognition;
    setTranscript('');
    setInterimTranscript('');
    setIsListening(true);
    recognition.start();
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  const speak = useCallback((text: string, lang = 'en-US') => {
    if (!text.trim() || typeof window === 'undefined') return;
    const synth = window.speechSynthesis;
    if (!synth) return;

    synth.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    synth.speak(utterance);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
    speak,
    isSpeaking,
    stopSpeaking,
    isSupported,
  };
}

// Map ISO lang codes to BCP-47 for Web Speech API
export function toSpeechLangCode(code: string): string {
  const map: Record<string, string> = {
    en: 'en-US', es: 'es-ES', fr: 'fr-FR', de: 'de-DE', it: 'it-IT',
    pt: 'pt-PT', nl: 'nl-NL', ru: 'ru-RU', ja: 'ja-JP', ko: 'ko-KR',
    zh: 'zh-CN', ar: 'ar-SA', hi: 'hi-IN', tr: 'tr-TR', pl: 'pl-PL', sv: 'sv-SE',
    bn: 'bn-IN', te: 'te-IN', ta: 'ta-IN', mr: 'mr-IN', gu: 'gu-IN',
    kn: 'kn-IN', ml: 'ml-IN', pa: 'pa-IN', ur: 'ur-PK',
  };
  return map[code] ?? `${code}-${code.toUpperCase()}`;
}
