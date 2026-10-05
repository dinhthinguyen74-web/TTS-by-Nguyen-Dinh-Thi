import React, { useState } from 'react';
import {
  Mic2,
  Sparkles,
  Sliders,
  Play,
  Pause,
  RotateCcw,
  Check,
  ChevronDown,
  Info,
  Volume2,
  Wand2,
  Bookmark,
  Compass,
  Layers,
  Flame,
  Radio,
  Loader2,
  UserCheck,
  Baby,
  Heart,
  BookOpen,
  Music,
} from 'lucide-react';
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
  VoicePersona,
  VoicePreset,
  VoiceDirectionAnalysis,
} from '../types/index.ts';
import {
  VOICE_PERSONAS,
  CONTENT_TYPES_CONFIG,
  VOICE_PRESETS,
} from '../utils/voiceLibraryData.ts';
import { buildVoiceDirectionPrompt } from '../utils/voiceDirectionBuilder.ts';

interface VoiceLibraryModuleProps {
  settings: VoiceSettingsState;
  onChangeSettings: (newSettings: VoiceSettingsState) => void;
  currentText: string;
  onPreviewVoice: (persona: VoicePersona, directionPrompt: string) => void;
  isPreviewLoading: boolean;
  isPreviewPlaying: boolean;
  onSelectSampleText?: (text: string) => void;
}

export const VoiceLibraryModule: React.FC<VoiceLibraryModuleProps> = ({
  settings,
  onChangeSettings,
  currentText,
  onPreviewVoice,
  isPreviewLoading,
  isPreviewPlaying,
  onSelectSampleText,
}) => {
  const [activeTab, setActiveTab] = useState<'content' | 'kids' | 'personas' | 'tuning' | 'ai_direction'>('content');
  const [isAnalyzingAi, setIsAnalyzingAi] = useState(false);
  const [aiAnalysisResult, setAiAnalysisResult] = useState<VoiceDirectionAnalysis | null>(null);
  const [showAdvancedTuning, setShowAdvancedTuning] = useState(false);
  const [kidsSubCategory, setKidsSubCategory] = useState<'all' | 'female' | 'male' | 'preschool' | 'elementary' | 'lullaby'>('all');

  // Active persona
  const currentPersona =
    VOICE_PERSONAS.find((p) => p.id === settings.personaId) || VOICE_PERSONAS[0];

  // Active content config
  const currentContentConfig =
    CONTENT_TYPES_CONFIG.find((c) => c.id === settings.contentType) ||
    CONTENT_TYPES_CONFIG[0];

  const [ageFilter, setAgeFilter] = useState<'all' | VoiceAge>('all');

  // Filtered personas based on Gender, Age, Region
  const filteredPersonas = VOICE_PERSONAS.filter((p) => {
    if (settings.gender !== 'auto' && p.gender !== settings.gender) return false;
    if (settings.region !== 'auto' && p.region !== settings.region) return false;
    if (ageFilter !== 'all' && p.age !== ageFilter) return false;
    return true;
  });

  // Dedicated child personas list & filter
  const allChildPersonas = VOICE_PERSONAS.filter(
    (p) => p.age === 'child' || p.id === 'chi_tho_ngoc'
  );

  const displayChildPersonas = allChildPersonas.filter((p) => {
    if (kidsSubCategory === 'female') return p.gender === 'female' && p.id !== 'chi_tho_ngoc';
    if (kidsSubCategory === 'male') return p.gender === 'male';
    if (kidsSubCategory === 'preschool') return p.id === 'be_tho_con';
    if (kidsSubCategory === 'elementary') return p.id === 'minh_anh' || p.id === 'tuan_khang';
    if (kidsSubCategory === 'lullaby') return p.id === 'chi_tho_ngoc';
    return true;
  });

  // Apply a 1-click Preset
  const handleApplyPreset = (preset: VoicePreset) => {
    const matchedPersona = VOICE_PERSONAS.find((p) => p.id === preset.personaId) || currentPersona;
    onChangeSettings({
      ...settings,
      contentType: preset.contentType,
      personaId: matchedPersona.id,
      gender: preset.gender,
      age: preset.age,
      region: preset.region,
      speed: preset.speed,
      pitch: preset.pitch,
      energy: preset.energy,
      pause: preset.pause,
      emphasis: preset.emphasis,
      emotion: preset.emotion,
    });
  };

  // Run AI Auto Voice Direction
  const handleRunAiAnalysis = async () => {
    if (!currentText || !currentText.trim()) return;
    setIsAnalyzingAi(true);

    try {
      const res = await fetch('/api/ai-analyze-direction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: currentText }),
      });

      const data = await res.json();
      if (res.ok && data.analysis) {
        const analysis: VoiceDirectionAnalysis = data.analysis;
        setAiAnalysisResult(analysis);

        // Auto apply suggested parameters if enabled
        const matchedPersona =
          VOICE_PERSONAS.find((p) => p.id === analysis.recommendedPersonaId) || currentPersona;

        onChangeSettings({
          ...settings,
          contentType: analysis.contentType || settings.contentType,
          personaId: matchedPersona.id,
          gender: analysis.recommendedGender || settings.gender,
          age: analysis.recommendedAge || settings.age,
          region: analysis.recommendedRegion || settings.region,
          speed: analysis.recommendedSpeed || settings.speed,
          energy: analysis.recommendedEnergy || settings.energy,
          emotion: analysis.recommendedEmotion || settings.emotion,
          pause: analysis.recommendedPause || settings.pause,
          emphasis: analysis.recommendedEmphasis || settings.emphasis,
          customDirectionText: analysis.rawDirectionPrompt || undefined,
        });
      }
    } catch (err) {
      console.error('AI Voice Direction error:', err);
    } finally {
      setIsAnalyzingAi(false);
    }
  };

  const handlePreviewCurrent = () => {
    const directionPrompt = buildVoiceDirectionPrompt(settings);
    onPreviewVoice(currentPersona, directionPrompt);
  };

  return (
    <div className="rounded-3xl border-2 border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl overflow-hidden transition-all">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 p-5 sm:p-6 text-white border-b border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-600/30">
              <Mic2 className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  THƯ VIỆN GIỌNG ĐỌC & PHONG CÁCH
                </h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  STUDIO PRO
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
                Đạo diễn ngữ điệu theo Loại nội dung → Phong cách → Giọng BTV Studio → Vùng miền → Cảm xúc
              </p>
            </div>
          </div>

          {/* Quick Preview Button in Header */}
          <button
            onClick={handlePreviewCurrent}
            disabled={isPreviewLoading}
            className="self-start md:self-center px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-600 hover:to-red-700 disabled:opacity-50 text-white transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-600/30 shrink-0"
          >
            {isPreviewLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang tạo bản nghe thử...</span>
              </>
            ) : isPreviewPlaying ? (
              <>
                <Pause className="w-4 h-4" />
                <span>Dừng nghe thử</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>🎧 Nghe thử giọng</span>
              </>
            )}
          </button>
        </div>

        {/* One-Click Presets Strip */}
        <div className="mt-4 pt-3.5 border-t border-slate-800/80">
          <div className="flex items-center space-x-2 mb-2 text-xs font-semibold text-slate-300">
            <Bookmark className="w-3.5 h-3.5 text-amber-400" />
            <span>Preset 1-chạm (Cài đặt âm sắc chuẩn):</span>
          </div>

          <div className="flex items-center space-x-2 overflow-x-auto pb-1.5 scrollbar-thin">
            {VOICE_PRESETS.map((preset) => {
              const isActive =
                settings.contentType === preset.contentType &&
                settings.personaId === preset.personaId;
              return (
                <button
                  key={preset.id}
                  onClick={() => handleApplyPreset(preset)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition flex items-center gap-1.5 cursor-pointer shrink-0 border ${
                    isActive
                      ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-600/20'
                      : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border-slate-700'
                  }`}
                >
                  <span>{preset.icon}</span>
                  <span>{preset.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 px-4 sm:px-6 overflow-x-auto">
        {[
          { id: 'content', label: '1. Loại nội dung', icon: '🏛️' },
          { id: 'kids', label: '🎈 Giọng Đọc Trẻ Em (8 giọng)', icon: '🧒', badge: 'Hot' },
          { id: 'personas', label: '2. Giọng Studio & Vùng miền', icon: '🎙️' },
          { id: 'tuning', label: '3. Tinh chỉnh thông số', icon: '🎚️' },
          { id: 'ai_direction', label: '4. 🤖 AI Voice Direction', icon: '✨' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`py-3.5 px-4 font-bold text-xs sm:text-sm whitespace-nowrap border-b-2 transition flex items-center gap-2 cursor-pointer ${
              activeTab === tab.id
                ? tab.id === 'kids'
                  ? 'border-amber-500 text-amber-600 dark:text-amber-400 bg-amber-50/40 dark:bg-slate-900'
                  : 'border-rose-600 text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-900'
                : 'border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
            {tab.badge && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-black bg-amber-500 text-white shadow-xs">
                {tab.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* TAB 1: LOẠI NỘI DUNG */}
      {activeTab === 'content' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <span>Chọn thể loại văn bản cần chuyển giọng nói</span>
              <span className="text-xs font-normal text-slate-500">
                (Hệ thống tự động thiết lập cao độ, nhịp ngắt và điểm nhấn phù hợp)
              </span>
            </h4>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {CONTENT_TYPES_CONFIG.map((item) => {
              const isSelected = settings.contentType === item.id;
              return (
                <div
                  key={item.id}
                  onClick={() => onChangeSettings({ ...settings, contentType: item.id })}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-1 ring-rose-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-800/20'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xl">{item.icon}</span>
                        <h5 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                          {item.label}
                        </h5>
                      </div>
                      {isSelected && (
                        <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-rose-700 dark:text-rose-300">
                      {item.subtitle}
                    </p>

                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                      {item.pacingNote}
                    </p>
                  </div>

                  <div className="mt-3 pt-2.5 border-t border-slate-200/60 dark:border-slate-800/60">
                    <div className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
                      Kỹ thuật nhấn giọng:
                    </div>
                    <ul className="text-[11px] text-slate-500 dark:text-slate-400 space-y-0.5 list-disc list-inside">
                      {item.emphasisRules.slice(0, 2).map((rule, idx) => (
                        <li key={idx} className="truncate">
                          {rule}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sub-style options for Commercial if selected */}
          {settings.contentType === 'commercial' && (
            <div className="p-4 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 space-y-2.5 animate-in fade-in">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-amber-600" />
                Phong cách video quảng cáo / TVC:
              </span>
              <div className="flex flex-wrap gap-2 text-xs">
                {[
                  { id: 'energetic', label: '🔥 Năng động' },
                  { id: 'bright', label: '✨ Tươi sáng' },
                  { id: 'youthful', label: '⚡ Trẻ trung' },
                  { id: 'luxury', label: '💎 Sang trọng & Cao cấp' },
                  { id: 'trustworthy', label: '🤝 Tin cậy & Đĩnh đạc' },
                ].map((st) => (
                  <button
                    key={st.id}
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        commercialSubStyle: st.id as CommercialSubStyle,
                      })
                    }
                    className={`px-3 py-1.5 rounded-xl font-semibold transition cursor-pointer border ${
                      settings.commercialSubStyle === st.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Content Integrity Reminder Box */}
          <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-400 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <span>
              <strong>Nguyên tắc bảo toàn nội dung tuyệt đối:</strong> Hệ thống chỉ điều khiển
              cao độ, tốc độ, ngữ điệu và ngắt nghỉ khi đọc. Không tự ý viết lại, thêm bớt hay thay đổi
              nội dung, tên riêng, số liệu và quan điểm chính trị của tác giả.
            </span>
          </div>
        </div>
      )}

      {/* TAB: GIỌNG ĐỌC TRẺ EM & THIẾU NHI (8 GIỌNG CHUYÊN NGHIỆP) */}
      {activeTab === 'kids' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Kids Hero Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-amber-500/15 via-rose-500/10 to-orange-500/15 border-2 border-amber-300 dark:border-amber-700/60 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-amber-100 dark:bg-amber-950/80 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 text-xs font-black">
                <span>🎈 BỘ SƯU TẬP GIỌNG ĐỌC THIẾU NHI & TRẺ EM</span>
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              </div>
              <h4 className="text-base sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span>8 Giọng Đọc Trẻ Em Tự Nhiên & Trong Sáng</span>
              </h4>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 max-w-2xl leading-relaxed">
                Được tinh chỉnh âm sắc đặc biệt cho <strong>truyện cổ tích</strong>, <strong>hoạt hình thiếu nhi</strong>, <strong>đồng dao mầm non</strong>, <strong>khoa học vui cho bé</strong> và <strong>bài tập đọc tiểu học</strong>. Cao độ líu lo ngây thơ, ngắt nghỉ sinh động.
              </p>
            </div>

            {/* Quick 1-click Preset buttons */}
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onChangeSettings({
                    ...settings,
                    contentType: 'kids',
                    personaId: 'be_bong',
                    gender: 'female',
                    age: 'child',
                    region: 'north',
                    speed: 1.0,
                    pitch: 4,
                    energy: 'high',
                    emotion: 'expressive',
                  });
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>👧 Bé Bống (Cổ tích)</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onChangeSettings({
                    ...settings,
                    contentType: 'kids',
                    personaId: 'be_bo',
                    gender: 'male',
                    age: 'child',
                    region: 'north',
                    speed: 1.1,
                    pitch: 4,
                    energy: 'high',
                    emotion: 'expressive',
                  });
                }}
                className="px-3.5 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20 transition cursor-pointer flex items-center gap-1.5"
              >
                <span>👦 Bé Bo (Hoạt hình)</span>
              </button>
            </div>
          </div>

          {/* Sub-Category Filter Chips */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 shrink-0">Phân loại giọng nhí:</span>
            {[
              { id: 'all', label: '🌟 Tất cả (8 giọng)' },
              { id: 'female', label: '👧 Bé gái (Bống, Mai Anh)' },
              { id: 'male', label: '👦 Bé trai (Bo, Bin, Tuấn Khang)' },
              { id: 'preschool', label: '🍼 Mầm non 4-5 tuổi (Thỏ Con)' },
              { id: 'elementary', label: '🎒 Tiểu học (Minh Anh SGK)' },
              { id: 'lullaby', label: '🌙 Ru ngủ (Chị Thỏ Ngọc)' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setKidsSubCategory(f.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition cursor-pointer border ${
                  kidsSubCategory === f.id
                    ? 'bg-amber-500 text-white border-amber-500 shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Quick story sample filler */}
          {onSelectSampleText && (
            <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 flex flex-wrap items-center justify-between gap-2.5">
              <span className="text-xs font-bold text-amber-900 dark:text-amber-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Dán nhanh mẫu truyện thiếu nhi để nghe thử giọng:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() =>
                    onSelectSampleText(
                      'Ngày xửa ngày xưa, trong một khu rừng xanh mát mẻ, có một chú Thỏ trắng xinh xắn và một bạn Rùa chậm chạp. Thỏ con luôn tự hào mình chạy nhanh nhất rừng. Một hôm, Thỏ huênh hoang rủ Rùa chạy thi: "Này Rùa ơi, đố bạn chạy đua thắng được tớ đấy!". Rùa mỉm cười hiền từ đáp: "Được thôi, chúng mình cùng thi nhé!".'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition cursor-pointer"
                >
                  🐰 Truyện Thỏ và Rùa
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelectSampleText(
                      'Thỏ trắng mắt hồng,\nĐôi tai dài dài,\nĐôi chân thoăn thoắt,\nThỏ chạy rất tài.\nThỏ thích ăn cà rốt,\nUống dòng nước mát trong,\nBé khen thỏ ngoan ngoãn,\nCả lớp đều mến yêu!'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition cursor-pointer"
                >
                  🍼 Thơ Mầm non Chú Thỏ
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelectSampleText(
                      'Oa, các bạn nhìn kìa! Chú khủng long khổng lồ đang bước đi trong thung lũng xanh mướt, tuyệt vời quá đi thôi! Chúng mình cùng đuổi theo xem chú khủng long ăn gì nào!'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition cursor-pointer"
                >
                  🚀 Hoạt hình Khủng Long
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onSelectSampleText(
                      'Dạ, con xin chào ông bà và ba mẹ! Hôm nay ở trường con được cô khen và tặng phiếu bé ngoan nè, con vui lắm luôn á! Con hứa sẽ luôn chăm ngoan học giỏi để ông bà vui lòng!'
                    )
                  }
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-amber-900 dark:text-amber-200 hover:bg-amber-100 transition cursor-pointer"
                >
                  🎀 Lời chúc bé ngoan
                </button>
              </div>
            </div>
          )}

          {/* Child Voices Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {displayChildPersonas.map((persona) => {
              const isSelected = settings.personaId === persona.id;
              return (
                <div
                  key={persona.id}
                  onClick={() => {
                    onChangeSettings({
                      ...settings,
                      personaId: persona.id,
                      contentType: 'kids',
                      age: persona.age,
                      gender: persona.gender,
                      pitch: persona.id === 'be_tho_con' ? 5 : persona.age === 'child' ? 4 : 1,
                      speed: persona.id === 'chi_tho_ngoc' ? 0.85 : 1.0,
                    });
                  }}
                  className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden group shadow-sm hover:shadow-md ${
                    isSelected
                      ? 'border-amber-500 bg-amber-50/60 dark:bg-amber-950/25 ring-2 ring-amber-500/30'
                      : 'border-slate-200 dark:border-slate-800 hover:border-amber-400 bg-white dark:bg-slate-900'
                  }`}
                >
                  {persona.badge && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full text-[10px] font-black bg-gradient-to-r from-amber-500 to-rose-500 text-white shadow-xs">
                      {persona.badge}
                    </div>
                  )}

                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-2xl shrink-0 group-hover:scale-110 transition-transform">
                        {persona.avatarIcon}
                      </div>
                      <div className="pr-12">
                        <h5 className="font-black text-sm text-slate-900 dark:text-slate-100">
                          {persona.name}
                        </h5>
                        <span className="text-[11px] font-semibold text-amber-700 dark:text-amber-400 block font-mono">
                          {persona.accentLabel}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed line-clamp-3">
                      {persona.tagline}
                    </p>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="font-bold text-slate-700 dark:text-slate-300">Hợp nhất: </span>
                      <span>{persona.bestFor}</span>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const direction = buildVoiceDirectionPrompt({
                          ...settings,
                          personaId: persona.id,
                          contentType: 'kids',
                          age: persona.age,
                          pitch: persona.id === 'be_tho_con' ? 5 : 4,
                        });
                        onPreviewVoice(persona, direction);
                      }}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 hover:bg-amber-100 dark:hover:bg-amber-950/50 text-slate-800 dark:text-slate-200 transition flex items-center gap-1.5 cursor-pointer"
                      title="Nghe thử giọng mẫu này"
                    >
                      <Play className="w-3.5 h-3.5 fill-current text-amber-600" />
                      <span>Nghe thử</span>
                    </button>

                    {isSelected ? (
                      <span className="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500 text-white flex items-center gap-1 shadow-xs">
                        <Check className="w-3.5 h-3.5" />
                        <span>Đang chọn</span>
                      </span>
                    ) : (
                      <span className="text-xs font-bold text-amber-600 dark:text-amber-400 group-hover:underline">
                        Chọn giọng →
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Child Voice Info Note */}
          <div className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-xs text-slate-600 dark:text-slate-300 flex items-start gap-3">
            <Baby className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-amber-900 dark:text-amber-200 block">
                Đặc điểm kỹ thuật giọng thiếu nhi tại Việt Voice AI:
              </span>
              <p>
                Hệ thống tự động nâng cao độ (Pitch +3 đến +5), tăng sự biểu cảm (Expressive High), kết hợp chỉ dẫn phong cách ngắt nghỉ ngây thơ chuẩn lứa tuổi thiếu nhi giúp tạo ra giọng đọc tự nhiên, líu lo và ấm áp, không bị rè hay biến dạng cơ học.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GIỌNG STUDIO (VBEE/ELEVENLABS) & VÙNG MIỀN */}
      {activeTab === 'personas' && (
        <div className="p-5 sm:p-6 space-y-6">
          {/* Quick Filters Bar (Gender, Age, Region) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
            {/* Filter: Gender */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Giới tính giọng
              </label>
              <div className="flex rounded-xl p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                {(['auto', 'male', 'female'] as VoiceGender[]).map((g) => (
                  <button
                    key={g}
                    onClick={() => onChangeSettings({ ...settings, gender: g })}
                    className={`flex-1 py-1 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                      settings.gender === g
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {g === 'auto' ? '🔄 Tự động' : g === 'male' ? '👨 Nam' : '👩 Nữ'}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter: Age */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Độ tuổi giọng
              </label>
              <select
                value={ageFilter}
                onChange={(e) => {
                  const val = e.target.value as 'all' | VoiceAge;
                  setAgeFilter(val);
                  if (val !== 'all') {
                    onChangeSettings({
                      ...settings,
                      age: val,
                      pitch: val === 'child' ? 3 : settings.pitch,
                    });
                  }
                }}
                className="w-full py-1.5 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-semibold text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer"
              >
                <option value="all">🌟 Tất cả độ tuổi ({VOICE_PERSONAS.length} giọng)</option>
                <option value="child">🧒 Giọng Trẻ em ({VOICE_PERSONAS.filter(p => p.age === 'child').length} giọng nhí)</option>
                <option value="young_adult">🧑 Thanh niên (Sáng, năng lượng)</option>
                <option value="middle_aged">👨 Trung niên (Chắc chắn, rõ chữ)</option>
                <option value="elderly">👴 Người cao tuổi (Trầm, từ tốn)</option>
              </select>
            </div>

            {/* Filter: Region */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                Vùng miền
              </label>
              <div className="flex rounded-xl p-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs">
                {(['auto', 'north', 'south'] as VoiceRegion[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => onChangeSettings({ ...settings, region: r })}
                    className={`flex-1 py-1 px-2 rounded-lg font-semibold transition cursor-pointer text-center ${
                      settings.region === r
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                    }`}
                  >
                    {r === 'auto' ? '🔄 Tự động' : r === 'north' ? '🇻🇳 Miền Bắc' : '🇻🇳 Miền Nam'}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Category Chips */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-thin">
            <span className="text-xs font-semibold text-slate-400 shrink-0 mr-1">Bộ lọc nhanh:</span>
            <button
              onClick={() => {
                setAgeFilter('all');
                onChangeSettings({ ...settings, gender: 'auto', region: 'auto' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                ageFilter === 'all' && settings.gender === 'auto' && settings.region === 'auto'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              Tất cả ({VOICE_PERSONAS.length})
            </button>

            <button
              onClick={() => {
                setAgeFilter('child');
                onChangeSettings({
                  ...settings,
                  age: 'child',
                  gender: 'auto',
                  personaId: 'be_bong',
                  pitch: 4,
                });
              }}
              className={`px-3 py-1 rounded-full text-xs font-bold whitespace-nowrap transition cursor-pointer border flex items-center gap-1.5 ${
                ageFilter === 'child'
                  ? 'bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20'
                  : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
              }`}
            >
              <span>🧒 Giọng Trẻ Em ({VOICE_PERSONAS.filter(p => p.age === 'child').length} giọng)</span>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            </button>

            <button
              onClick={() => {
                setAgeFilter('all');
                onChangeSettings({ ...settings, gender: 'female' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                ageFilter === 'all' && settings.gender === 'female'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              👩 Giọng Nữ
            </button>

            <button
              onClick={() => {
                setAgeFilter('all');
                onChangeSettings({ ...settings, gender: 'male' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                ageFilter === 'all' && settings.gender === 'male'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              👨 Giọng Nam
            </button>

            <button
              onClick={() => {
                setAgeFilter('all');
                onChangeSettings({ ...settings, region: 'north' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                ageFilter === 'all' && settings.region === 'north'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              🇻🇳 Giọng Miền Bắc
            </button>

            <button
              onClick={() => {
                setAgeFilter('all');
                onChangeSettings({ ...settings, region: 'south' });
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap transition cursor-pointer border ${
                ageFilter === 'all' && settings.region === 'south'
                  ? 'bg-rose-600 text-white border-rose-600'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
              }`}
            >
              🇻🇳 Giọng Miền Nam
            </button>
          </div>

          {/* Personas Cards Grid */}
          <div className="space-y-2">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span>Danh sách giọng đọc chuyên nghiệp ({filteredPersonas.length})</span>
                {ageFilter === 'child' && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 text-xs font-bold">
                    Đang hiển thị các giọng Thiếu nhi / Trẻ em
                  </span>
                )}
              </span>
              <span className="text-xs font-normal text-slate-500">
                Lấy cảm hứng từ Vbee Studio & ElevenLabs
              </span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {filteredPersonas.map((persona) => {
                const isSelected = settings.personaId === persona.id;
                return (
                  <div
                    key={persona.id}
                    onClick={() =>
                      onChangeSettings({
                        ...settings,
                        personaId: persona.id,
                        age: persona.age,
                        gender: persona.gender,
                        pitch: persona.age === 'child' ? 3 : settings.pitch,
                      })
                    }
                    className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-rose-600 bg-rose-50/40 dark:bg-rose-950/20 shadow-md ring-1 ring-rose-500/20'
                        : persona.age === 'child'
                        ? 'border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/10 hover:border-amber-400'
                        : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                    }`}
                  >
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2.5">
                          <span className="text-2xl">{persona.avatarIcon}</span>
                          <div>
                            <h5 className="font-extrabold text-sm text-slate-900 dark:text-slate-100">
                              {persona.name}
                            </h5>
                            <span className="text-[11px] text-slate-500 dark:text-slate-400 block font-mono">
                              {persona.accentLabel}
                            </span>
                          </div>
                        </div>

                        {isSelected ? (
                          <span className="w-5 h-5 rounded-full bg-rose-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-3.5 h-3.5" />
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {persona.gender === 'female' ? 'Nữ' : 'Nam'}
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-600 dark:text-slate-300 line-clamp-2 leading-relaxed">
                        {persona.tagline}
                      </p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate max-w-[180px]">
                        Hợp: {persona.bestFor.split(',')[0]}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const direction = buildVoiceDirectionPrompt({
                            ...settings,
                            personaId: persona.id,
                          });
                          onPreviewVoice(persona, direction);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-rose-100 dark:hover:bg-rose-950/40 text-slate-700 dark:text-slate-200 transition flex items-center gap-1 cursor-pointer"
                        title="Nghe thử giọng này"
                      >
                        <Play className="w-3 h-3 fill-current text-rose-600" />
                        <span>Thử giọng</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: TINH CHỈNH THÔNG SỐ (SLIDERS & CONTROLS) */}
      {activeTab === 'tuning' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Speed & Pitch Controls */}
            <div className="space-y-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Tốc độ & Cao độ giọng
              </h5>

              {/* Speed */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Tốc độ đọc (Speed):
                  </span>
                  <span className="font-mono font-bold text-rose-600 dark:text-rose-400 text-sm">
                    {settings.speed}x
                  </span>
                </div>
                <div className="flex items-center space-x-1.5 flex-wrap gap-1">
                  {[0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map((s) => (
                    <button
                      key={s}
                      onClick={() => onChangeSettings({ ...settings, speed: s })}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition cursor-pointer ${
                        settings.speed === s
                          ? 'bg-rose-600 text-white shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              {/* Pitch Slider */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-slate-800 dark:text-slate-200">
                    Cao độ (Pitch):
                  </span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">
                    {settings.pitch === 0
                      ? 'Trung tính'
                      : settings.pitch > 0
                      ? `+${settings.pitch} (Cao)`
                      : `${settings.pitch} (Trầm)`}
                  </span>
                </div>
                <input
                  type="range"
                  min="-5"
                  max="5"
                  step="1"
                  value={settings.pitch}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, pitch: parseInt(e.target.value, 10) })
                  }
                  className="w-full h-2 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
                />
                <div className="flex justify-between text-[10px] text-slate-400">
                  <span>Trầm ấm</span>
                  <span>Trung tính</span>
                  <span>Trong cao</span>
                </div>
              </div>
            </div>

            {/* Energy, Pause, Emphasis */}
            <div className="space-y-5 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-slate-800">
              <h5 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Năng lượng & Nhịp ngắt câu
              </h5>

              {/* Energy */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Năng lượng giọng (Energy):
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['low', 'medium', 'high'] as EnergyLevel[]).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => onChangeSettings({ ...settings, energy: lvl })}
                      className={`py-1.5 px-2 rounded-xl font-semibold transition cursor-pointer text-center border ${
                        settings.energy === lvl
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {lvl === 'low' ? 'Nhẹ nhàng' : lvl === 'medium' ? 'Vừa phải' : 'Mạnh mẽ'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Pause */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Khoảng nghỉ giữa các vế câu (Pauses):
                </span>
                <div className="grid grid-cols-4 gap-1.5 text-xs">
                  {(['short', 'medium', 'long', 'auto'] as PauseLevel[]).map((p) => (
                    <button
                      key={p}
                      onClick={() => onChangeSettings({ ...settings, pause: p })}
                      className={`py-1.5 px-1 rounded-xl font-semibold transition cursor-pointer text-center border ${
                        settings.pause === p
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {p === 'short'
                        ? 'Ngắn'
                        : p === 'medium'
                        ? 'Vừa'
                        : p === 'long'
                        ? 'Dài'
                        : 'Tự động'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Emphasis */}
              <div className="space-y-1.5">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  Độ nhấn từ khóa & số liệu (Emphasis):
                </span>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  {(['low', 'medium', 'high'] as EmphasisLevel[]).map((emp) => (
                    <button
                      key={emp}
                      onClick={() => onChangeSettings({ ...settings, emphasis: emp })}
                      className={`py-1.5 px-2 rounded-xl font-semibold transition cursor-pointer text-center border ${
                        settings.emphasis === emp
                          ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                          : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {emp === 'low' ? 'Nhẹ' : emp === 'medium' ? 'Rõ ràng' : 'Nhấn mạnh'}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: 🤖 AI AUTO VOICE DIRECTION */}
      {activeTab === 'ai_direction' && (
        <div className="p-5 sm:p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/40">
            <div className="space-y-0.5">
              <h5 className="font-extrabold text-sm text-purple-900 dark:text-purple-200 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>AI Auto Voice Direction (Đạo diễn âm thanh tự động)</span>
              </h5>
              <p className="text-xs text-purple-700 dark:text-purple-300">
                Gemini AI phân tích cấu trúc câu, phát hiện điểm nhấn chiến lược và tạo kịch bản ngữ điệu riêng
              </p>
            </div>

            <button
              onClick={handleRunAiAnalysis}
              disabled={isAnalyzingAi || !currentText.trim()}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white transition flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20 shrink-0"
            >
              {isAnalyzingAi ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Đang phân tích...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Phân tích văn bản ngay</span>
                </>
              )}
            </button>
          </div>

          {/* AI Analysis Result Card */}
          {aiAnalysisResult ? (
            <div className="space-y-4 p-5 rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 animate-in fade-in">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-700/60 pb-3">
                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4" />
                  Đã tạo kịch bản đạo diễn giọng đọc thành công!
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  Gợi ý: {currentPersona.name} ({currentPersona.title})
                </span>
              </div>

              {/* Summary in Vietnamese */}
              <div className="space-y-1">
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  Tóm tắt phong cách đọc:
                </div>
                <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-200 italic bg-slate-50 dark:bg-slate-800/80 p-3 rounded-xl border border-slate-200/60 dark:border-slate-700">
                  "{aiAnalysisResult.directionSummary}"
                </p>
              </div>

              {/* Key phrases to emphasize */}
              {aiAnalysisResult.keyPhrasesToEmphasize &&
                aiAnalysisResult.keyPhrasesToEmphasize.length > 0 && (
                  <div className="space-y-1.5">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      Các cụm từ then chốt AI sẽ nhấn mạnh:
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {aiAnalysisResult.keyPhrasesToEmphasize.map((phrase, idx) => (
                        <span
                          key={idx}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900/50"
                        >
                          ★ {phrase}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

              {/* Internal Voice Direction instruction for TTS */}
              <div className="space-y-1.5 pt-2">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block font-mono">
                  Voice Direction Prompt (truyền vào TTS model):
                </span>
                <textarea
                  value={settings.customDirectionText || aiAnalysisResult.rawDirectionPrompt || ''}
                  onChange={(e) =>
                    onChangeSettings({ ...settings, customDirectionText: e.target.value })
                  }
                  rows={3}
                  className="w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-900 text-xs font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 focus:outline-none"
                  placeholder="Hướng dẫn đạo diễn âm thanh..."
                />
              </div>
            </div>
          ) : (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl space-y-2">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto" />
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                Chưa có phân tích ngữ điệu
              </p>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Bấm nút "Phân tích văn bản ngay" bên trên để AI quét văn bản và tự động tạo kịch bản
                ngữ điệu chuyên nghiệp tối ưu nhất cho văn bản của bạn.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Bottom Selected Persona Summary Bar */}
      <div className="p-4 sm:p-5 bg-slate-50/80 dark:bg-slate-950/60 border-t border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center space-x-3">
          <span className="text-2xl">{currentPersona.avatarIcon}</span>
          <div>
            <div className="font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <span>Đang chọn: {currentPersona.name}</span>
              <span className="font-normal text-slate-500">({currentPersona.title})</span>
            </div>
            <div className="text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-0.5 font-mono">
              <span>{currentContentConfig.label}</span>
              <span>•</span>
              <span>{settings.speed}x</span>
              <span>•</span>
              <span>{currentPersona.accentLabel}</span>
            </div>
          </div>
        </div>

        <button
          onClick={handlePreviewCurrent}
          disabled={isPreviewLoading}
          className="self-end sm:self-center px-3.5 py-1.5 rounded-xl font-bold bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          {isPreviewPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5 fill-current" />}
          <span>{isPreviewPlaying ? 'Dừng' : 'Nghe thử giọng này'}</span>
        </button>
      </div>
    </div>
  );
};
