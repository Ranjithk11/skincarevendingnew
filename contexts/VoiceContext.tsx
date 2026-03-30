"use client";

import React, { createContext, useCallback, useContext, useMemo, ReactNode } from 'react';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';

interface VoiceContextType {
  isSupported: boolean;
  isSpeaking: boolean;
  voiceEnabled: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, options?: { rate?: number; pitch?: number; volume?: number; voice?: string }) => void;
  speakQueued: (text: string, options?: { rate?: number; pitch?: number; volume?: number; voice?: string }) => void;
  cancel: () => void;
  toggleVoice: () => boolean;
}

const VoiceContext = createContext<VoiceContextType | undefined>(undefined);

interface VoiceProviderProps {
  children: ReactNode;
}

export const VoiceProvider: React.FC<VoiceProviderProps> = ({ children }) => {
  const speechSynthesis = useSpeechSynthesis();

  return (
    <VoiceContext.Provider value={speechSynthesis}>
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (context === undefined) {
    // Check if we're on the report page and return dummy context if so
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname?.includes("/user/view-skincare-recommnedations")) {
        return {
          isSupported: false,
          isSpeaking: false,
          voiceEnabled: false,
          voices: [],
          speak: () => {},
          speakQueued: () => {},
          cancel: () => {},
          toggleVoice: () => false,
        };
      }
    }
    throw new Error('useVoice must be used within a VoiceProvider');
  }
  return context;
};

// Helper hook for speaking with predefined messages
export const useVoiceMessages = () => {
  const { speak, speakQueued, cancel, voiceEnabled } = useVoice();

  const messages = useMemo(
    () => ({
    welcome: "Welcome to Leaf Water Skincare Vending Machine",
    homeStartScan: "Tap Start A I Skin Scan to begin.",
    questionnaireIntro: "",
    questionnaireSlide1: "Enter your details.",
    questionnaireSlide2: "Select your skin type to continue.",
    selectProduct: "Please select a product",
    addToCart: "Product added to cart",
    removeFromCart: "Product removed from cart",
    checkout: "Proceeding to checkout",
    checkoutTapCart: "Please  proceed to checkout.",
    payment: "Please complete your payment",
    paymentContinue: "Please complete your payment to continue.",
    paymentProcessing: "Your payment is being processed. Please wait.",
    dispense: "Dispensing your product",
    dispenseCollect: "Please collect your product from the tray below.",
    thankYou: "Thank you for your purchase",
    feedbackPrompt: "Please rate your experience. Your feedback helps us improve.",
    scanFace: "Please position your face in the frame",
    analyzing: "Analyzing your skin",
    analysisCompleteClickRecommendations: "Analysis completed successfully. Please tap Get Our Recommendations.",
    recommendations: "Here are your personalized recommendations",
    error: "An error occurred. Please try again",
    networkError: "Network error. Please check your connection",
    invalidInput: "Invalid input. Please try again",
    success: "",
  }),
    []
  );

  const speakMessage = useCallback(
    (key: keyof typeof messages, customText?: string) => {
      if (!voiceEnabled) return;
      const text = customText || messages[key];
      if (!text) return;
      cancel();
      speakQueued(text);
    },
    [cancel, messages, speakQueued, voiceEnabled]
  );

  const speakSequence = useCallback(
    (keys: Array<keyof typeof messages>) => {
      if (!voiceEnabled) return;
      if (!Array.isArray(keys) || keys.length === 0) return;

      cancel();

      keys.forEach((key) => {
        const text = messages[key];
        if (!text) return;
        speakQueued(text);
      });
    },
    [cancel, messages, speakQueued, voiceEnabled]
  );

  return { speakMessage, speakSequence, messages };
};
