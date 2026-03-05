import { useState, useEffect, useCallback, useRef } from 'react';

interface SpeechOptions {
  rate?: number;
  pitch?: number;
  volume?: number;
  voice?: string;
}

export const useSpeechSynthesis = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const queueRef = useRef<Array<{ text: string; options: SpeechOptions }>>([]);
  const isProcessingQueueRef = useRef(false);

  const getPreferredVoice = useCallback(
    (availableVoices: SpeechSynthesisVoice[]) => {
      return (
        availableVoices.find(
          (voice) =>
            voice.name.includes('female') ||
            voice.name.includes('Female') ||
            voice.name.includes('Samantha') ||
            voice.name.includes('Google UK English Female') ||
            voice.name.includes('Microsoft Zira') ||
            voice.name.includes('Microsoft Hazel')
        ) ?? availableVoices[0]
      );
    },
    []
  );

  const flushPendingSpeak = useCallback(() => {
    if (!isSupported || !voiceEnabled) return;
    if (voices.length === 0) return;
    if (isProcessingQueueRef.current) return;
    if (queueRef.current.length === 0) return;

    const speakNext = () => {
      if (!isSupported || !voiceEnabled) {
        isProcessingQueueRef.current = false;
        return;
      }
      if (voices.length === 0) {
        isProcessingQueueRef.current = false;
        return;
      }

      const next = queueRef.current.shift();
      if (!next) {
        isProcessingQueueRef.current = false;
        setIsSpeaking(false);
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(next.text);
        utterance.rate = next.options.rate || 1.0;
        utterance.pitch = next.options.pitch || 1.0;
        utterance.volume = next.options.volume || 1.0;
        const preferredVoice = getPreferredVoice(voices);
        if (preferredVoice) utterance.voice = preferredVoice;
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => {
          setIsSpeaking(false);
          speakNext();
        };
        utterance.onerror = () => {
          setIsSpeaking(false);
          speakNext();
        };
        window.speechSynthesis.speak(utterance);
      } catch {
        speakNext();
      }
    };

    isProcessingQueueRef.current = true;
    speakNext();
  }, [getPreferredVoice, isSupported, voiceEnabled, voices]);

  useEffect(() => {
    // Check if speech synthesis is supported
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSupported(true);
      
      // Load voices
      const loadVoices = () => {
        const availableVoices = window.speechSynthesis.getVoices();
        setVoices(availableVoices);
      };
      
      loadVoices();
      
      // Voices load asynchronously in some browsers
      window.speechSynthesis.onvoiceschanged = loadVoices;
      
      // Load voice preference from localStorage
      const savedVoiceEnabled = localStorage.getItem('voiceEnabled');
      if (savedVoiceEnabled === 'false') {
        setVoiceEnabled(false);
      }
    } else {
      setIsSupported(false);
    }
  }, []);

  useEffect(() => {
    flushPendingSpeak();
  }, [flushPendingSpeak, voices]);

  useEffect(() => {
    if (!isSupported) return;

    const handler = () => {
      flushPendingSpeak();
    };

    window.addEventListener('pointerdown', handler, { passive: true });
    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('pointerdown', handler);
      window.removeEventListener('keydown', handler);
    };
  }, [flushPendingSpeak, isSupported]);

  const speakQueued = useCallback(
    (text: string, options: SpeechOptions = {}) => {
      if (!isSupported || !voiceEnabled || !text) return;
      queueRef.current.push({ text, options });
      flushPendingSpeak();
    },
    [flushPendingSpeak, isSupported, voiceEnabled]
  );

  const speak = useCallback(
    (text: string, options: SpeechOptions = {}) => {
      if (!isSupported || !voiceEnabled || !text) return;
      queueRef.current = [{ text, options }];
      isProcessingQueueRef.current = false;
      window.speechSynthesis.cancel();
      flushPendingSpeak();
    },
    [flushPendingSpeak, isSupported, voiceEnabled]
  );

  const cancel = useCallback(() => {
    if (isSupported) {
      queueRef.current = [];
      isProcessingQueueRef.current = false;
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    }
  }, [isSupported]);

  const toggleVoice = useCallback(() => {
    const newVoiceEnabled = !voiceEnabled;
    setVoiceEnabled(newVoiceEnabled);
    localStorage.setItem('voiceEnabled', newVoiceEnabled.toString());
    
    if (newVoiceEnabled) {
      speak('Voice responses enabled');
    } else {
      cancel();
    }
    
    return newVoiceEnabled;
  }, [voiceEnabled, speak, cancel]);

  return {
    isSupported,
    isSpeaking,
    voices,
    voiceEnabled,
    speak,
    speakQueued,
    cancel,
    toggleVoice
  };
};
