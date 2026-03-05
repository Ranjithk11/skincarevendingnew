import React from 'react';
import { IconButton, Tooltip } from '@mui/material';
import { VolumeUp, VolumeOff } from '@mui/icons-material';
import { useSpeechSynthesis } from '@/hooks/useSpeechSynthesis';
import { keyframes } from '@emotion/react';
import { styled } from '@mui/material/styles';

// Pulse animation for when voice is speaking
const pulse = keyframes`
  0% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.1);
    opacity: 0.8;
  }
  100% {
    transform: scale(1);
    opacity: 1;
  }
`;

const AnimatedIconButton = styled(IconButton)<{ $isSpeaking: boolean }>`
  transition: all 0.2s ease;
  ${({ $isSpeaking }) =>
    $isSpeaking &&
    `
    animation: ${pulse} 1.5s infinite;
  `}
`;

interface VoiceControlProps {
  onToggle?: (enabled: boolean) => void;
}

const VoiceControl: React.FC<VoiceControlProps> = ({ onToggle }) => {
  const { isSupported, voiceEnabled, toggleVoice, isSpeaking } = useSpeechSynthesis();

  if (!isSupported) {
    return null; // Don't render if speech synthesis is not supported
  }

  const handleToggle = () => {
    const newState = toggleVoice();
    if (onToggle) {
      onToggle(newState);
    }
  };

  return (
    <Tooltip title={voiceEnabled ? "Disable Voice" : "Enable Voice"}>
      <AnimatedIconButton
        $isSpeaking={isSpeaking}
        onClick={handleToggle}
        color={voiceEnabled ? "success" : "default"}
        sx={{
          '&:hover': {
            backgroundColor: 'rgba(34, 197, 94, 0.1)',
          },
        }}
      >
        {voiceEnabled ? (
          <VolumeUp 
            sx={{ 
              fontSize: 24,
              color: '#22c55e',
            }} 
          />
        ) : (
          <VolumeOff 
            sx={{ 
              fontSize: 24,
              color: '#9ca3af',
            }} 
          />
        )}
      </AnimatedIconButton>
    </Tooltip>
  );
};

export default VoiceControl;
