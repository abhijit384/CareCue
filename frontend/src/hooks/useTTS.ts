import { useState, useCallback, useEffect, useRef } from 'react';

const LANG_MAP: Record<string, string> = {
  hi: 'hi-IN',
  bn: 'bn-IN',
  ta: 'ta-IN',
  te: 'te-IN',
  mr: 'mr-IN',
  gu: 'gu-IN',
  kn: 'kn-IN',
  ml: 'ml-IN',
  pa: 'pa-IN',
  ur: 'ur-PK',
  or: 'or-IN',
  as: 'as-IN',
  ne: 'ne-NP',
  es: 'es-ES',
  fr: 'fr-FR',
  de: 'de-DE',
  it: 'it-IT',
  pt: 'pt-BR',
  ar: 'ar-SA',
  zh: 'zh-CN',
  ja: 'ja-JP',
  ko: 'ko-KR',
  ru: 'ru-RU',
  en: 'en-US',
};

function splitIntoSentences(text: string): string[] {
  let clean = text.replace(/[*#_`~]/g, '');
  clean = clean.replace(/(\d+)\/(\d+)/g, '$1 $2');
  clean = clean.replace(/[\/\\]+/g, ' ');
  clean = clean.replace(/\s+/g, ' ').trim();
  if (!clean) return [];
  // Split on sentence boundaries including Hindi/Bengali purna viram (| or ।) and newlines
  const segments = clean.split(/(?<=[.!?;\n|।])\s+/);
  const chunks: string[] = [];

  for (const seg of segments) {
    const trimmed = seg.trim();
    if (!trimmed) continue;
    if (trimmed.length <= 140) {
      chunks.push(trimmed);
    } else {
      // Sub-divide long sentences by commas or word boundaries
      const words = trimmed.split(' ');
      let current = '';
      for (const word of words) {
        if ((current + ' ' + word).trim().length > 120) {
          if (current.trim()) chunks.push(current.trim());
          current = word;
        } else {
          current = current ? current + ' ' + word : word;
        }
      }
      if (current.trim()) chunks.push(current.trim());
    }
  }
  return chunks.length > 0 ? chunks : [clean];
}

export function useTTS(defaultLang: string = 'en') {
  const [isPlaying, setIsPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const isCancelledRef = useRef(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const keepAliveTimerRef = useRef<any>(null);

  const stop = useCallback(() => {
    isCancelledRef.current = true;
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = '';
      currentAudioRef.current = null;
    }
    if (keepAliveTimerRef.current) {
      clearInterval(keepAliveTimerRef.current);
      keepAliveTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setIsPlaying(false);
  }, []);

  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  // Fallback to browser Web Speech API if backend audio fails
  const playWebSpeechFallback = useCallback((chunks: string[], langCode: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return;
    }

    const langTag = LANG_MAP[langCode] || langCode;
    let availableVoices: SpeechSynthesisVoice[] = [];
    try {
      availableVoices = window.speechSynthesis.getVoices() || [];
    } catch {
      availableVoices = [];
    }

    const normLangTag = langTag.toLowerCase().replace('_', '-');
    const matchingVoice = availableVoices.find(v => {
      const vLang = (v.lang || '').toLowerCase().replace('_', '-');
      return vLang === normLangTag || vLang.startsWith(langCode.toLowerCase());
    });

    let currentIndex = 0;
    const playNext = () => {
      if (isCancelledRef.current || currentIndex >= chunks.length) {
        setIsPlaying(false);
        return;
      }

      const chunkText = chunks[currentIndex];
      currentIndex++;

      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.lang = langTag;
      utterance.rate = 0.92;
      utterance.pitch = 1.0;
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onend = () => {
        if (!isCancelledRef.current) {
          playNext();
        }
      };

      utterance.onerror = (e) => {
        if (e.error !== 'canceled' && e.error !== 'interrupted') {
          console.warn('[CareCue TTS] Speech synthesis warning:', e.error);
        }
        if (!isCancelledRef.current) {
          playNext();
        }
      };

      try {
        window.speechSynthesis.speak(utterance);
      } catch {
        if (!isCancelledRef.current) playNext();
      }
    };

    playNext();
  }, []);

  // Multi-tier fallback for TTS playback across all languages
  const playChunkWithAudioFallback = useCallback((chunks: string[], langCode: string) => {
    if (isCancelledRef.current || chunks.length === 0) {
      setIsPlaying(false);
      return;
    }

    const cleanLang = langCode.split('-')[0].split('_')[0].toLowerCase();
    const rawApiBase = import.meta.env.VITE_API_URL || '/api';
    const apiBase = rawApiBase.endsWith('/') ? rawApiBase.slice(0, -1) : rawApiBase;

    let currentIndex = 0;

    const playStep = (index: number, tryGoogleDirect = false) => {
      if (isCancelledRef.current || index >= chunks.length) {
        setIsPlaying(false);
        return;
      }

      const chunkText = chunks[index];
      const audioUrl = tryGoogleDirect
        ? `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(cleanLang)}&q=${encodeURIComponent(chunkText)}`
        : `${apiBase}/tts?lang=${encodeURIComponent(cleanLang)}&text=${encodeURIComponent(chunkText)}`;

      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        if (!isCancelledRef.current) {
          playStep(index + 1, false);
        }
      };

      audio.onerror = (e) => {
        console.warn(`[CareCue TTS] Audio stream warning on chunk ${index} (direct=${tryGoogleDirect}):`, e);
        if (isCancelledRef.current) return;
        if (!tryGoogleDirect) {
          // Fallback to direct Google Translate TTS stream
          playStep(index, true);
        } else {
          // Fallback to browser Web Speech API
          playWebSpeechFallback(chunks.slice(index), cleanLang);
        }
      };

      audio.play().catch(err => {
        console.warn(`[CareCue TTS] Audio play error (direct=${tryGoogleDirect}):`, err);
        if (isCancelledRef.current) return;
        if (!tryGoogleDirect) {
          playStep(index, true);
        } else {
          playWebSpeechFallback(chunks.slice(index), cleanLang);
        }
      });
    };

    playStep(0, false);
  }, [playWebSpeechFallback]);

  const speak = useCallback((text: string, langCode?: string) => {
    if (!text || !text.trim()) return;

    // Stop existing playback
    stop();
    isCancelledRef.current = false;
    setErrorMessage(null);

    const activeLang = (langCode || defaultLang || 'en').toLowerCase().trim();
    const cleanLang = activeLang.split('-')[0].split('_')[0];
    const chunks = splitIntoSentences(text);

    if (chunks.length === 0) return;

    setIsPlaying(true);
    playChunkWithAudioFallback(chunks, cleanLang);
  }, [defaultLang, stop, playChunkWithAudioFallback]);

  return {
    speak,
    play: speak,
    stop,
    isPlaying,
    supported,
    errorMessage,
  };
}
