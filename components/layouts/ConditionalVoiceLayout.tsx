"use client";

import { usePathname } from "next/navigation";
import { VoiceProvider } from "@/contexts/VoiceContext";
import { createContext, useContext } from "react";

// Create a dummy voice context for report page
const DummyVoiceContext = createContext({
  isSupported: false,
  isSpeaking: false,
  voiceEnabled: false,
  voices: [],
  speak: () => {},
  speakQueued: () => {},
  cancel: () => {},
  toggleVoice: () => false,
});

// Dummy VoiceProvider for report page
const DummyVoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <DummyVoiceContext.Provider value={{
      isSupported: false,
      isSpeaking: false,
      voiceEnabled: false,
      voices: [],
      speak: () => {},
      speakQueued: () => {},
      cancel: () => {},
      toggleVoice: () => false,
    }}>
      {children}
    </DummyVoiceContext.Provider>
  );
};

interface ConditionalVoiceLayoutProps {
  children: React.ReactNode;
}

export default function ConditionalVoiceLayout({ children }: ConditionalVoiceLayoutProps) {
  const pathname = usePathname();
  
  // Exclude voice for report page
  const isReportPage = pathname?.includes("/user/view-skincare-recommnedations");
  
  if (isReportPage) {
    return <DummyVoiceProvider>{children}</DummyVoiceProvider>;
  }
  
  return <VoiceProvider>{children}</VoiceProvider>;
}
