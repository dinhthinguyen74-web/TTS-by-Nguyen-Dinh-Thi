export type VoiceId = 'Kore' | 'Zephyr' | 'Puck' | 'Fenrir' | 'Charon';

export type VoiceGender = 'male' | 'female' | 'auto';

export type VoiceAge = 'elderly' | 'middle_aged' | 'young_adult' | 'child';

export type VoiceRegion = 'north' | 'central' | 'south' | 'auto';

export type ContentType =
  | 'political'     // 🏛️ Văn bản chính trị, báo cáo lãnh đạo
  | 'news'          // 📰 Bản tin thời sự, tin tức sự kiện
  | 'documentary'   // 🎬 Phóng sự, phim tài liệu
  | 'commercial'    // 📺 Video quảng cáo / TVC / giới thiệu sản phẩm
  | 'audiobook'     // 📚 Sách nói / Audiobook / Kể chuyện
  | 'tiktok'        // 📱 TikTok / Reels / Shorts / Video ngắn
  | 'kids';         // 🧸 Truyện thiếu nhi, cổ tích, hoạt hình & giáo dục mầm non

export type CommercialSubStyle =
  | 'energetic'
  | 'bright'
  | 'youthful'
  | 'luxury'
  | 'trustworthy';

export type SpeakingStyle =
  | 'Tự nhiên'
  | 'Truyền cảm'
  | 'Kể chuyện'
  | 'Tin tức'
  | 'Giáo dục'
  | 'Quảng cáo';

export type PauseLevel = 'short' | 'medium' | 'long' | 'auto';
export type EmphasisLevel = 'low' | 'medium' | 'high';
export type EnergyLevel = 'low' | 'medium' | 'high';
export type EmotionLevel = 'neutral' | 'expressive' | 'dramatic' | 'serious' | 'warm';

export interface VoiceOption {
  id: VoiceId;
  name: string;
  gender: 'female' | 'male';
  description: string;
  recommendedStyle: SpeakingStyle;
}

export interface VoicePersona {
  id: string;
  name: string;
  baseVoice: VoiceId;
  gender: 'male' | 'female';
  age: VoiceAge;
  region: VoiceRegion;
  avatarIcon: string;
  title: string;
  tagline: string;
  bestFor: string;
  accentLabel: string;
  sampleAudioText: string;
  voiceStylePrompt?: string;
  badge?: string;
}

export interface VoicePreset {
  id: string;
  name: string;
  icon: string;
  description: string;
  contentType: ContentType;
  gender: VoiceGender;
  age: VoiceAge;
  region: VoiceRegion;
  personaId: string;
  speed: number;
  pitch: number;
  energy: EnergyLevel;
  pause: PauseLevel;
  emphasis: EmphasisLevel;
  emotion: EmotionLevel;
}

export interface VoiceSettingsState {
  contentType: ContentType;
  commercialSubStyle: CommercialSubStyle;
  gender: VoiceGender;
  age: VoiceAge;
  region: VoiceRegion;
  personaId: string;
  speed: number;
  pitch: number;       // -10 to +10
  energy: EnergyLevel;
  pause: PauseLevel;
  emphasis: EmphasisLevel;
  emotion: EmotionLevel;
  autoVoiceDirection: boolean;
  customDirectionText?: string;
}

export interface VoiceDirectionAnalysis {
  contentType: ContentType;
  recommendedPersonaId: string;
  recommendedGender: VoiceGender;
  recommendedAge: VoiceAge;
  recommendedRegion: VoiceRegion;
  recommendedSpeed: number;
  recommendedEnergy: EnergyLevel;
  recommendedEmotion: EmotionLevel;
  recommendedPause: PauseLevel;
  recommendedEmphasis: EmphasisLevel;
  keyPhrasesToEmphasize: string[];
  directionSummary: string;
  rawDirectionPrompt: string;
}

export interface DocumentMetadata {
  filename: string;
  fileType: 'pdf' | 'docx' | 'text';
  fileSize?: string;
  pageCount?: number;
  wordCount: number;
  charCount: number;
  extractedAt?: string;
  isScanned?: boolean;
}

export interface TextChunk {
  id: string;
  index: number;
  title: string;
  text: string;
  wordCount: number;
  charCount: number;
  status: 'pending' | 'processing' | 'completed' | 'error';
  audioBase64?: string;
  mp3Base64?: string;
  duration?: number;
  error?: string;
}

export interface GeneratedAudioItem {
  id: string;
  title: string;
  timestamp: number;
  audioBase64: string;
  mp3Base64?: string;
  duration: number;
  voice: VoiceId;
  personaName?: string;
  speed: number;
  style: SpeakingStyle;
  contentType?: ContentType;
  wordCount: number;
  charCount: number;
  sourceType: 'text' | 'pdf' | 'docx';
  filename?: string;
}
