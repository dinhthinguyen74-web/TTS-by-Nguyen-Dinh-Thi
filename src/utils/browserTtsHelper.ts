/**
 * Browser Web Speech API & Fallback Audio Helper
 * Ensures continuous speech playback even when cloud API quota is exhausted.
 */

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function playWithWebSpeech(
  text: string,
  options: {
    rate?: number;
    pitch?: number;
    isChild?: boolean;
    onEnd?: () => void;
  } = {}
): void {
  if (!isSpeechSynthesisSupported()) {
    if (options.onEnd) options.onEnd();
    return;
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'vi-VN';
  utterance.rate = Math.max(0.6, Math.min(2.0, options.rate || 1.0));
  
  // For child voices, increase pitch
  const basePitch = options.isChild ? 1.4 : (options.pitch || 1.0);
  utterance.pitch = Math.max(0.5, Math.min(2.0, basePitch));

  const voices = window.speechSynthesis.getVoices();
  const vietnameseVoice = voices.find(
    (v) => v.lang.toLowerCase().startsWith('vi') || v.name.toLowerCase().includes('vietnam')
  );
  if (vietnameseVoice) {
    utterance.voice = vietnameseVoice;
  }

  if (options.onEnd) {
    utterance.onend = () => options.onEnd?.();
    utterance.onerror = () => options.onEnd?.();
  }

  window.speechSynthesis.speak(utterance);
}

export function stopWebSpeech(): void {
  if (isSpeechSynthesisSupported()) {
    window.speechSynthesis.cancel();
  }
}
