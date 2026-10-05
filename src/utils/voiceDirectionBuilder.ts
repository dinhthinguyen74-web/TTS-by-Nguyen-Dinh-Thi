import {
  ContentType,
  CommercialSubStyle,
  VoiceAge,
  VoiceGender,
  VoiceRegion,
  EnergyLevel,
  EmotionLevel,
  PauseLevel,
  EmphasisLevel,
  VoiceSettingsState,
} from '../types/index.ts';
import { VOICE_PERSONAS } from './voiceLibraryData.ts';

/**
 * Builds the comprehensive Voice Direction instruction passed to TTS speechMetadata.style
 */
export function buildVoiceDirectionPrompt(settings: VoiceSettingsState): string {
  const parts: string[] = [];

  // 1. Content Style Core Directive
  switch (settings.contentType) {
    case 'political':
      parts.push(
        'Authoritative, formal, official Vietnamese leadership delivery. Calm, steady, and resolute tone with high gravity. Careful natural pacing on multi-clause sentences. Emphasize strategic goals, directives, key achievements, and statistics. Slightly lower pitch and maintain solemn objectivity when discussing limitations and causes.'
      );
      break;
    case 'news':
      parts.push(
        'Objective, credible, professional Vietnamese news anchor delivery. Crisp articulation, steady moderately brisk cadence, neutral and authoritative tone. Emphasize essential facts, dates, and metrics without sensationalism.'
      );
      break;
    case 'documentary':
      parts.push(
        'Deep, warm, reflective documentary narration. Slower pacing, deliberate cinematic pauses, thoughtful resonance. Rich nuance differentiating scene setting, analysis, and character narrative.'
      );
      break;
    case 'commercial':
      if (settings.commercialSubStyle === 'luxury') {
        parts.push(
          'Sophisticated, prestigious, elegant luxury TVC delivery. Deep, smooth, polished tone with steady graceful cadence. Emphasize brand prestige and exclusive value.'
        );
      } else {
        parts.push(
          'Energetic, bright, engaging promotional TVC voice. Dynamic vocal presence, upbeat enthusiasm. Highlight brand identity, key USP features, exclusive offers, and strong Call-To-Action at the close.'
        );
      }
      break;
    case 'audiobook':
      parts.push(
        'Warm, expressive, natural Vietnamese storytelling. Flexible rhythm adapting to plot mood, subtle character voice modulation, breathing pauses between scene transitions.'
      );
      break;
    case 'tiktok':
      parts.push(
        'Lively, high-energy conversational short-video creator delivery. Fast-paced, punchy opening hook, engaging and friendly cadence.'
      );
      break;
    case 'kids':
      parts.push(
        'Lively, innocent, cheerful Vietnamese children storytelling and animation style. Bright and joyful intonation, expressive melodic speech, playful and animated cadence, warm and engaging for kids, pure and adorable.'
      );
      break;
    default:
      parts.push('Natural, clear, fluent Vietnamese speech with balanced pacing.');
  }

  // 2. Persona-specific specialized voice prompt if available
  const matchedPersona = VOICE_PERSONAS.find((p) => p.id === settings.personaId);
  if (matchedPersona?.voiceStylePrompt) {
    parts.push(matchedPersona.voiceStylePrompt);
  }

  // 3. Region / Accent Nuance
  if (settings.region === 'north') {
    parts.push('Clear Northern Vietnamese (Hanoi standard broadcaster) phonetics.');
  } else if (settings.region === 'south') {
    parts.push('Warm, melodic Southern Vietnamese (Saigon) natural conversational intonation.');
  } else if (settings.region === 'central') {
    parts.push('Authentic Central Vietnamese dialect color and gentle cadence.');
  }

  // 4. Age Persona Nuance
  if (settings.age === 'elderly') {
    parts.push('Mature, wise, seasoned elder tone with deliberate measured pauses.');
  } else if (settings.age === 'middle_aged') {
    parts.push('Reliable, confident middle-aged voice texture.');
  } else if (settings.age === 'young_adult') {
    parts.push('Youthful, fresh, vibrant voice tone.');
  } else if (settings.age === 'child') {
    parts.push(
      'Authentic sweet, cute, high-pitched young Vietnamese child voice (bé thiếu nhi), innocent, cheerful, playful, and adorable childlike tone.'
    );
  }

  // Pitch modifier
  if (settings.pitch && settings.pitch > 0) {
    parts.push(`Higher vocal pitch (+${settings.pitch}), bright youthful timbre.`);
  } else if (settings.pitch && settings.pitch < 0) {
    parts.push(`Deeper vocal pitch (${settings.pitch}), resonant lower register.`);
  }

  // 4. Energy & Emotion Modifiers
  if (settings.energy === 'high') {
    parts.push('High vocal energy and projection.');
  } else if (settings.energy === 'low') {
    parts.push('Soft, gentle, intimate vocal energy.');
  }

  if (settings.emotion === 'serious') {
    parts.push('Solemn, strictly professional demeanor.');
  } else if (settings.emotion === 'warm') {
    parts.push('Warm, empathetic, heartfelt resonance.');
  } else if (settings.emotion === 'expressive') {
    parts.push('Vivid emotional expression.');
  }

  // 5. Speed modifier
  if (settings.speed > 1.2) {
    parts.push('Brisk, rapid delivery.');
  } else if (settings.speed < 0.85) {
    parts.push('Slow, unhurried, measured tempo.');
  }

  // 6. Pause & Emphasis
  if (settings.pause === 'long') {
    parts.push('Generous breath pauses between key statements.');
  } else if (settings.pause === 'short') {
    parts.push('Tight, continuous sentence flow.');
  }

  if (settings.emphasis === 'high') {
    parts.push('Marked stress on focal terminology and numbers.');
  }

  // Append user custom direction if provided
  if (settings.customDirectionText && settings.customDirectionText.trim()) {
    parts.push(settings.customDirectionText.trim());
  }

  return parts.join(' ');
}
