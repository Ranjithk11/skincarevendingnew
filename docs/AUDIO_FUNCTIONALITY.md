# Audio Functionality Implementation

This document describes the audio/text-to-speech functionality implemented in the Skincare Vending Machine project, inspired by the Leafwater Vending Machine V1.2.

## Overview

The audio functionality uses the Web Speech API's `SpeechSynthesis` interface to provide text-to-speech (TTS) capabilities. Users can toggle voice responses on/off, and the system will announce important events throughout the user journey.

## Implementation Details

### 1. Core Components

#### `useSpeechSynthesis` Hook (`hooks/useSpeechSynthesis.ts`)
- Manages the Web Speech API integration
- Handles voice selection, speech synthesis, and state management
- Persists voice preference in localStorage
- Provides methods for speaking, canceling, and toggling voice

#### `VoiceContext` (`contexts/VoiceContext.tsx`)
- React context for global voice state management
- Provides `useVoice` and `useVoiceMessages` hooks
- Includes predefined messages for common actions

#### `VoiceControl` Component (`components/ui/VoiceControl.tsx`)
- UI component for toggling voice on/off
- Displays animated icon when speaking
- Integrated into the header navigation

### 2. Integration Points

#### Layout Integration
- `VoiceProvider` wraps the entire app in `app/layout.tsx`
- `VoiceControl` added to `HomeLayout.tsx` header

#### Component Integration
Voice announcements have been added to:

1. **Feedback Page** (`app/feedback/page.tsx`)
   - Announces successful dispense
   - Announces errors during dispensing

2. **Cart Component** (`containers/skinanalysis-home/Recommendations/cartProduct.tsx`)
   - Announces when items are added to cart
   - Announces when items are removed from cart
   - Announces checkout and payment steps

### 3. Predefined Messages

The `useVoiceMessages` hook provides these predefined messages:

```typescript
const messages = {
  welcome: "Welcome to Skincare Vending Machine",
  selectProduct: "Please select a product",
  addToCart: "Product added to cart",
  removeFromCart: "Product removed from cart",
  checkout: "Proceeding to checkout",
  payment: "Please complete your payment",
  dispense: "Dispensing your product",
  thankYou: "Thank you for your purchase",
  scanFace: "Please position your face in the frame",
  analyzing: "Analyzing your skin",
  recommendations: "Here are your personalized recommendations",
  error: "An error occurred. Please try again",
  networkError: "Network error. Please check your connection",
  invalidInput: "Invalid input. Please try again",
  success: "Operation completed successfully",
};
```

## Usage Examples

### Basic Usage

```typescript
import { useVoice } from '@/contexts/VoiceContext';

function MyComponent() {
  const { speak, voiceEnabled } = useVoice();
  
  const handleClick = () => {
    if (voiceEnabled) {
      speak("Custom message");
    }
  };
  
  return <button onClick={handleClick}>Speak</button>;
}
```

### Using Predefined Messages

```typescript
import { useVoiceMessages } from '@/contexts/VoiceContext';

function MyComponent() {
  const { speakMessage } = useVoiceMessages();
  
  const handleAddToCart = () => {
    // Add to cart logic
    speakMessage('addToCart');
  };
  
  return <button onClick={handleAddToCart}>Add to Cart</button>;
}
```

### Custom Voice Options

```typescript
import { useVoice } from '@/contexts/VoiceContext';

function MyComponent() {
  const { speak } = useVoice();
  
  const speakCustom = () => {
    speak("Custom message", {
      rate: 1.2,      // Speech rate (0.1 to 10)
      pitch: 1.0,     // Speech pitch (0 to 2)
      volume: 0.8,    // Volume (0 to 1)
    });
  };
  
  return <button onClick={speakCustom}>Speak Custom</button>;
}
```

## Voice Selection

The system automatically selects a female voice if available, with these preferences:
1. Voice names containing "female" or "Female"
2. "Samantha"
3. "Google UK English Female"
4. "Microsoft Zira"
5. "Microsoft Hazel"
6. Falls back to the first available voice

## Browser Compatibility

The Web Speech API is supported in:
- Chrome (desktop and mobile)
- Edge (desktop and mobile)
- Safari (iOS and macOS)
- Firefox (limited support)

## Features

1. **Toggle Control**: Users can enable/disable voice responses
2. **Visual Feedback**: Voice icon animates when speaking
3. **Persistent Settings**: Voice preference saved in localStorage
4. **Auto-Cancel**: New speech automatically cancels previous speech
5. **Error Handling**: Graceful fallback when speech synthesis is not supported

## Future Enhancements

1. **Multi-language Support**: Add support for different languages
2. **Custom Voice Selection**: Allow users to choose preferred voice
3. **Speed Control**: Allow users to adjust speech rate
4. **Audio Files**: Add support for playing pre-recorded audio files
5. **Background Music**: Add ambient music for different sections

## Troubleshooting

### Voice Not Working
- Check if browser supports Web Speech API
- Ensure user has interacted with the page (required by some browsers)
- Check if voice is enabled in the UI

### Voice Too Fast/Slow
- Adjust the `rate` parameter in the speak function
- Default rate is 1.0 (normal speed)

### No Voice Available
- The system falls back to the first available voice
- Some browsers may need user interaction before voices are loaded

## Comparison with Leafwater V1.2

The Leafwater project used a similar approach with these key differences:

| Feature | Leafwater V1.2 | Current Implementation |
|---------|----------------|----------------------|
| API | Web Speech API | Web Speech API |
| Voice Toggle | Header button | Header button with animation |
| Storage | localStorage | localStorage |
| Messages | Inline strings | Centralized message constants |
| Voice Selection | Female preference | Enhanced female preference list |
| Visual Feedback | Icon change | Pulse animation when speaking |
