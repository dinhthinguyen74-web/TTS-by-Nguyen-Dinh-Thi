/**
 * Browser Vietnamese Speech Synthesis Fallback Utility
 * Provides seamless client-side Vietnamese text-to-speech
 * when Gemini API daily quota is temporarily exhausted.
 */

import { VoiceAge, VoiceGender } from '../types/index.ts';

export interface BrowserVoiceConfig {
  voice?: SpeechSynthesisVoice | null;
  pitch: number;
  rate: number;
  volume: number;
}

/**
 * Finds the best Vietnamese voice available on the user's browser/system.
 */
export function getBestVietnameseVoice(gender?: VoiceGender): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  const voices = window.speechSynthesis.getVoices();
  const viVoices = voices.filter(
    (v) =>
      v.lang.toLowerCase().startsWith('vi') ||
      v.lang.toLowerCase().includes('vn') ||
      v.name.toLowerCase().includes('vietnam')
  );

  if (viVoices.length > 0) {
    if (gender === 'female') {
      const female = viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('female') ||
          v.name.toLowerCase().includes('nữ') ||
          v.name.toLowerCase().includes('an') ||
          v.name.toLowerCase().includes('mai') ||
          v.name.toLowerCase().includes('linh')
      );
      if (female) return female;
    } else if (gender === 'male') {
      const male = viVoices.find(
        (v) =>
          v.name.toLowerCase().includes('male') ||
          v.name.toLowerCase().includes('nam') ||
          v.name.toLowerCase().includes('minh') ||
          v.name.toLowerCase().includes('dung')
      );
      if (male) return male;
    }
    return viVoices[0];
  }

  // Fallback to default voice
  return voices[0] || null;
}

/**
 * Speaks text using Web Speech API with tailored pitch and rate
 */
export function speakWithBrowserSynthesis(
  text: string,
  options: {
    age?: VoiceAge;
    gender?: VoiceGender;
    speed?: number;
    pitchBonus?: number;
    onEnd?: () => void;
    onError?: (err: any) => void;
  }
): SpeechSynthesisUtterance | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;

  window.speechSynthesis.cancel(); // Stop any previous playback

  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestVietnameseVoice(options.gender);
  if (voice) {
    utterance.voice = voice;
  }
  utterance.lang = 'vi-VN';

  // Speed
  const baseRate = options.speed || 1.0;
  utterance.rate = Math.max(0.5, Math.min(2.0, baseRate));

  // Child voices require higher pitch in speech synthesis (1.4 - 1.8)
  if (options.age === 'child') {
    utterance.pitch = Math.min(2.0, 1.4 + (options.pitchBonus ? options.pitchBonus * 0.08 : 0.15));
  } else if (options.age === 'elderly') {
    utterance.pitch = 0.85;
  } else {
    utterance.pitch = Math.max(0.6, Math.min(1.5, 1.0 + (options.pitchBonus ? options.pitchBonus * 0.05 : 0)));
  }

  if (options.onEnd) {
    utterance.onend = () => options.onEnd?.();
  }
  if (options.onError) {
    utterance.onerror = (e) => options.onError?.(e);
  }

  window.speechSynthesis.speak(utterance);
  return utterance;
}

/**
 * Stop any active browser speech synthesis
 */
export function stopBrowserSynthesis() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
}
