import React, { useState } from 'react';
import {
  Mic,
  Gauge,
  Sparkles,
  Volume2,
  Play,
  Pause,
  User,
  Radio,
  Sliders,
  Check,
} from 'lucide-react';
import { VoiceId, SpeakingStyle, VoiceOption } from '../types/index.ts';

interface VoiceSettingsPanelProps {
  selectedVoice: VoiceId;
  onChangeVoice: (voice: VoiceId) => void;
  speed: number;
  onChangeSpeed: (speed: number) => void;
  selectedStyle: SpeakingStyle;
  onChangeStyle: (style: SpeakingStyle) => void;
  onPreviewVoice: (voice: VoiceId, style: SpeakingStyle) => void;
  isPreviewPlaying: boolean;
  previewVoiceId: VoiceId | null;
}

export const VOICES: VoiceOption[] = [
  {
    id: 'Kore',
    name: 'Kore',
    gender: 'female',
    description: 'Giọng Nữ dịu dàng, ấm áp, truyền cảm, ngắt nghỉ mềm mại',
    recommendedStyle: 'Truyền cảm',
  },
  {
    id: 'Zephyr',
    name: 'Zephyr',
    gender: 'female',
    description: 'Giọng Nữ trong sáng, rõ ràng, dứt khoát, chuẩn âm phát thanh',
    recommendedStyle: 'Tin tức',
  },
  {
    id: 'Fenrir',
    name: 'Fenrir',
    gender: 'male',
    description: 'Giọng Nam trầm ấm, điềm đạm, truyền tải chiều sâu và tự sự',
    recommendedStyle: 'Kể chuyện',
  },
  {
    id: 'Puck',
    name: 'Puck',
    gender: 'male',
    description: 'Giọng Nam trẻ trung, tươi vui, hoạt bát, tràn đầy năng lượng',
    recommendedStyle: 'Quảng cáo',
  },
  {
    id: 'Charon',
    name: 'Charon',
    gender: 'male',
    description: 'Giọng Nam chững chạc, đĩnh đạc, uy tín, thích hợp tài liệu',
    recommendedStyle: 'Tự nhiên',
  },
];

export const STYLES: { id: SpeakingStyle; label: string; desc: string }[] = [
  { id: 'Tự nhiên', label: 'Tự nhiên', desc: 'Chuẩn âm điệu, gần gũi đời thường' },
  { id: 'Truyền cảm', label: 'Truyền cảm', desc: 'Giàu cảm xúc, sâu lắng, ấm áp' },
  { id: 'Kể chuyện', label: 'Kể chuyện', desc: 'Sinh động, kịch tính, cuốn hút' },
  { id: 'Tin tức', label: 'Tin tức', desc: 'Trang trọng, rõ ràng, dứt khoát' },
  { id: 'Giáo dục', label: 'Giáo dục', desc: 'Từ tốn, mô phạm, dễ tiếp thu' },
  { id: 'Quảng cáo', label: 'Quảng cáo', desc: 'Sôi nổi, thu hút, tràn đầy năng lượng' },
];

export const SPEEDS = [0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0];

export const VoiceSettingsPanel: React.FC<VoiceSettingsPanelProps> = ({
  selectedVoice,
  onChangeVoice,
  speed,
  onChangeSpeed,
  selectedStyle,
  onChangeStyle,
  onPreviewVoice,
  isPreviewPlaying,
  previewVoiceId,
}) => {
  const [filterGender, setFilterGender] = useState<'all' | 'female' | 'male'>('all');

  const filteredVoices = VOICES.filter((v) =>
    filterGender === 'all' ? true : v.gender === filterGender
  );

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-6">
      {/* 1. Voice Selector */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Mic className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Chọn giọng đọc tiếng Việt
            </h4>
          </div>

          {/* Gender Filter Buttons */}
          <div className="inline-flex rounded-lg p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 self-start sm:self-auto text-xs">
            <button
              onClick={() => setFilterGender('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterGender === 'all'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              Tất cả
            </button>
            <button
              onClick={() => setFilterGender('female')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterGender === 'female'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              👩 Giọng Nữ
            </button>
            <button
              onClick={() => setFilterGender('male')}
              className={`px-2.5 py-1 rounded-md font-medium transition cursor-pointer ${
                filterGender === 'male'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              👨 Giọng Nam
            </button>
          </div>
        </div>

        {/* Voices Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredVoices.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            const isPlayingThis = isPreviewPlaying && previewVoiceId === voice.id;

            return (
              <div
                key={voice.id}
                onClick={() => onChangeVoice(voice.id)}
                className={`relative p-3.5 rounded-xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/20 shadow-xs'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="text-base">
                        {voice.gender === 'female' ? '👩' : '👨'}
                      </span>
                      <span className="font-bold text-sm text-slate-900 dark:text-slate-100">
                        {voice.name}
                      </span>
                      <span
                        className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          voice.gender === 'female'
                            ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/60 dark:text-pink-300'
                            : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                        }`}
                      >
                        {voice.gender === 'female' ? 'Nữ' : 'Nam'}
                      </span>
                    </div>

                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 line-clamp-2">
                    {voice.description}
                  </p>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    Hợp: <strong>{voice.recommendedStyle}</strong>
                  </span>

                  {/* Preview Button */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onPreviewVoice(voice.id, selectedStyle);
                    }}
                    className={`px-2 py-1 rounded-md text-xs font-medium flex items-center gap-1 cursor-pointer transition ${
                      isPlayingThis
                        ? 'bg-rose-600 text-white animate-pulse'
                        : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600'
                    }`}
                    title="Nghe mẫu giọng thử ngắn"
                  >
                    {isPlayingThis ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3 fill-current" />
                    )}
                    <span>{isPlayingThis ? 'Đang đọc...' : 'Thử giọng'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. Speaking Style Picker */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
            Phong cách đọc (Speaking Style)
          </h4>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {STYLES.map((style) => {
            const isSelected = selectedStyle === style.id;
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => onChangeStyle(style.id)}
                className={`p-2.5 rounded-xl border text-left transition cursor-pointer ${
                  isSelected
                    ? 'border-purple-500 bg-purple-50/50 dark:bg-purple-950/30 text-purple-900 dark:text-purple-200 ring-1 ring-purple-500'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/40 dark:bg-slate-800/20 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div className="font-bold text-xs">{style.label}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                  {style.desc}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Speed Control */}
      <div className="space-y-2.5 pt-2 border-t border-slate-100 dark:border-slate-800/80">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Gauge className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">
              Tốc độ đọc: <span className="text-emerald-600 dark:text-emerald-400 font-mono font-bold">{speed}x</span>
            </h4>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {speed === 1.0
              ? 'Tốc độ tiêu chuẩn'
              : speed > 1.0
              ? 'Đọc nhanh hơn'
              : 'Đọc chậm rãi'}
          </span>
        </div>

        {/* Speed Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
          {SPEEDS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onChangeSpeed(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                speed === s
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700/60'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
