import React, { useState, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  FileText,
  UploadCloud,
  Sparkles,
  Volume2,
  Wand2,
  AlertCircle,
  CheckCircle2,
  Layers,
  HelpCircle,
  RefreshCw,
  Loader2,
  Share2,
  Phone,
  MapPin,
  User,
} from 'lucide-react';
import { Header } from './components/Header.tsx';
import { TextInputTab } from './components/TextInputTab.tsx';
import { DocumentUploadTab } from './components/DocumentUploadTab.tsx';
import { TextPreparationToolbar } from './components/TextPreparationToolbar.tsx';
import { VoiceLibraryModule } from './components/VoiceLibraryModule.tsx';
import { AudiobookChunksList } from './components/AudiobookChunksList.tsx';
import { AudioPlayer } from './components/AudioPlayer.tsx';
import { HistoryModal } from './components/HistoryModal.tsx';
import { playWithWebSpeech, stopWebSpeech } from './utils/browserTtsHelper.ts';
import {
  VoiceId,
  SpeakingStyle,
  DocumentMetadata,
  TextChunk,
  GeneratedAudioItem,
  VoiceSettingsState,
  VoicePersona,
} from './types/index.ts';
import {
  countWords,
  countChars,
  splitTextIntoChunks,
} from './utils/documentParser.ts';
import { cleanVietnameseText } from './utils/textNormalizer.ts';
import {
  VOICE_PERSONAS,
  CONTENT_TYPES_CONFIG,
} from './utils/voiceLibraryData.ts';
import { buildVoiceDirectionPrompt } from './utils/voiceDirectionBuilder.ts';

const DEFAULT_SAMPLE_TEXT = `Kính thưa các đồng chí lãnh đạo và toàn thể hội nghị,
Hôm nay, ngày 05/10/2026, chúng ta cùng nhìn lại những kết quả quan trọng đã đạt được trong công tác chuyển đổi số quốc gia. Nhờ sự chỉ đạo quyết liệt và nỗ lực của các cơ quan, hơn 2.500.000 hồ sơ thủ tục hành chính đã được xử lý trực tuyến, nâng cao tỷ lệ hài lòng của người dân đạt 98.5%.
Trong giai đoạn tới, chúng ta cần tiếp tục phát huy các thành tựu, tăng cường bảo đảm an toàn thông tin, đẩy mạnh ứng dụng trí tuệ nhân tạo để hoàn thành xuất sắc các mục tiêu và nhiệm vụ trọng tâm đã đề ra.`;

export default function App() {
  // Theme state
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem('vietvoice_dark_mode');
    return saved ? saved === 'true' : false;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('vietvoice_dark_mode', String(darkMode));
  }, [darkMode]);

  // Active Tab: 'text' or 'upload'
  const [activeTab, setActiveTab] = useState<'text' | 'upload'>('text');

  // Text content & initial state
  const [rawText, setRawText] = useState<string>(DEFAULT_SAMPLE_TEXT);
  const [originalExtractedText, setOriginalExtractedText] = useState<string>('');
  const [documentMetadata, setDocumentMetadata] = useState<DocumentMetadata | null>(null);

  // File Extraction states
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);

  // Text Preparation & Cleaning switches
  const [cleanWhitespace, setCleanWhitespace] = useState<boolean>(true);
  const [optimizePunctuation, setOptimizePunctuation] = useState<boolean>(true);
  const [normalizeNumbers, setNormalizeNumbers] = useState<boolean>(true);
  const [isAiPolishing, setIsAiPolishing] = useState<boolean>(false);
  const [cleanSuccessNotice, setCleanSuccessNotice] = useState<string | null>(null);

  // Voice Library & Direction Settings
  const [voiceSettings, setVoiceSettings] = useState<VoiceSettingsState>({
    contentType: 'political',
    commercialSubStyle: 'bright',
    gender: 'auto',
    age: 'middle_aged',
    region: 'north',
    personaId: 'mai_phuong',
    speed: 1.0,
    pitch: 0,
    energy: 'medium',
    pause: 'medium',
    emphasis: 'high',
    emotion: 'serious',
    autoVoiceDirection: true,
  });

  // Current active persona
  const activePersona =
    VOICE_PERSONAS.find((p) => p.id === voiceSettings.personaId) || VOICE_PERSONAS[0];

  // Voice Preview State
  const [isPreviewLoading, setIsPreviewLoading] = useState<boolean>(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState<boolean>(false);
  const [previewVoiceId, setPreviewVoiceId] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // Chunks & Long document handling
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [currentChunkIndex, setCurrentChunkIndex] = useState<number>(0);
  const [isBatchGenerating, setIsBatchGenerating] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;
  const isBatchCancelledRef = useRef(false);

  // Completed Master Audio Player state (WAV and MP3)
  const [currentAudioUrl, setCurrentAudioUrl] = useState<string | null>(null);
  const [currentMp3Url, setCurrentMp3Url] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [playingChunkId, setPlayingChunkId] = useState<string | null>(null);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  // History state
  const [historyItems, setHistoryItems] = useState<GeneratedAudioItem[]>(() => {
    try {
      const saved = localStorage.getItem('vietvoice_history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);

  // Sync history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('vietvoice_history', JSON.stringify(historyItems));
    } catch (e) {
      console.warn('Could not save history to localStorage', e);
    }
  }, [historyItems]);

  // Sync chunks whenever rawText changes significantly or user changes tab
  useEffect(() => {
    if (rawText.trim().length > 1300) {
      const generatedChunks = splitTextIntoChunks(rawText, 1400);
      setChunks(generatedChunks);
    } else {
      setChunks([]);
    }
  }, [rawText]);

  // Notice timeout
  useEffect(() => {
    if (cleanSuccessNotice) {
      const timer = setTimeout(() => setCleanSuccessNotice(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [cleanSuccessNotice]);

  // ----------------------------------------------------------------------
  // Handlers: File Upload & Extraction
  // ----------------------------------------------------------------------
  const handleUploadFile = async (file: File) => {
    setIsExtracting(true);
    setExtractionError(null);
    setGlobalError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/extract', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Trích xuất tài liệu thất bại');
      }

      setRawText(data.text);
      setOriginalExtractedText(data.text);
      setDocumentMetadata({
        filename: data.filename,
        fileType: data.fileType,
        fileSize: data.fileSize,
        pageCount: data.pageCount,
        wordCount: data.wordCount,
        charCount: data.charCount,
        isScanned: data.isScanned,
      });

      // Split chunks if long
      if (data.text.length > 1300) {
        setChunks(splitTextIntoChunks(data.text, 1400));
      } else {
        setChunks([]);
      }
    } catch (err: any) {
      console.error('File upload failed:', err);
      setExtractionError(err.message || 'Lỗi khi đọc file');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleClearFile = () => {
    setDocumentMetadata(null);
    setOriginalExtractedText('');
    setRawText('');
    setChunks([]);
    setExtractionError(null);
  };

  const handleRestoreOriginal = () => {
    if (originalExtractedText) {
      setRawText(originalExtractedText);
      setCleanSuccessNotice('Đã khôi phục văn bản ban đầu vừa trích xuất');
    }
  };

  // ----------------------------------------------------------------------
  // Handlers: Text Clean-up & Preparation
  // ----------------------------------------------------------------------
  const handleApplyManualCleanup = () => {
    if (!rawText.trim()) return;
    const cleaned = cleanVietnameseText(rawText, {
      cleanWhitespace,
      fixLineBreaks: true,
      optimizePunctuation,
      normalizeNumbersAndSymbols: normalizeNumbers,
    });
    setRawText(cleaned);
    setCleanSuccessNotice('Đã áp dụng các bộ lọc làm sạch văn bản thành công!');
  };

  const handleAiPolish = async () => {
    if (!rawText.trim()) return;
    setIsAiPolishing(true);
    setGlobalError(null);

    try {
      const res = await fetch('/api/ai-prepare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Không thể tối ưu bằng AI');
      }

      setRawText(data.text);
      setCleanSuccessNotice('Gemini AI đã tối ưu ngắt nghỉ và chuẩn hóa ngữ âm xong!');
    } catch (err: any) {
      console.error('AI polish error:', err);
      setGlobalError(err.message || 'Lỗi khi xử lý bằng AI');
    } finally {
      setIsAiPolishing(false);
    }
  };

  // ----------------------------------------------------------------------
  // Handlers: Voice Preview
  // ----------------------------------------------------------------------
  const handlePreviewVoice = async (persona: VoicePersona, directionPrompt: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    stopWebSpeech();

    if (isPreviewPlaying && previewVoiceId === persona.id) {
      setIsPreviewPlaying(false);
      setPreviewVoiceId(null);
      return;
    }

    setIsPreviewLoading(true);
    setPreviewVoiceId(persona.id);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: persona.sampleAudioText,
          voice: persona.baseVoice,
          speed: voiceSettings.speed,
          voiceDirection: directionPrompt,
          generateMp3: false,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('Failed to parse TTS response as JSON', jsonErr);
      }

      // Check if quota exceeded or client fallback is requested
      const isQuota =
        res.status === 429 ||
        data?.isQuotaExceeded ||
        data?.useClientFallback ||
        data?.error?.toLowerCase?.().includes('quota') ||
        data?.error?.toLowerCase?.().includes('resource_exhausted');

      if (isQuota) {
        setCleanSuccessNotice(
          '💡 Đang phát thử qua giọng đọc trình duyệt (do tài khoản chạm giới hạn quota miễn phí hàng ngày của Gemini).'
        );
        setIsPreviewPlaying(true);
        playWithWebSpeech(persona.sampleAudioText, {
          rate: voiceSettings.speed,
          isChild: persona.age === 'child',
          pitch: persona.age === 'child' ? 1.4 : 1.0,
          onEnd: () => {
            setIsPreviewPlaying(false);
            setPreviewVoiceId(null);
          },
        });
        return;
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || `Lỗi máy chủ (${res.status})`);
      }

      if (data?.audioBase64) {
        const audio = new Audio(data.audioBase64);
        previewAudioRef.current = audio;
        setIsPreviewPlaying(true);
        audio.onended = () => {
          setIsPreviewPlaying(false);
          setPreviewVoiceId(null);
        };
        await audio.play();
      }
    } catch (err: any) {
      console.error('Preview error:', err);
      const errMsg = err?.message?.toLowerCase?.() || '';
      if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429')) {
        setCleanSuccessNotice('💡 Chuyển sang giọng đọc dự phòng của trình duyệt.');
        setIsPreviewPlaying(true);
        playWithWebSpeech(persona.sampleAudioText, {
          rate: voiceSettings.speed,
          isChild: persona.age === 'child',
          pitch: persona.age === 'child' ? 1.4 : 1.0,
          onEnd: () => {
            setIsPreviewPlaying(false);
            setPreviewVoiceId(null);
          },
        });
      } else {
        setIsPreviewPlaying(false);
        setPreviewVoiceId(null);
        setGlobalError(err.message || 'Lỗi khi nghe thử giọng');
      }
    } finally {
      setIsPreviewLoading(false);
    }
  };

  // ----------------------------------------------------------------------
  // Handlers: TTS Speech Generation (Single & Batch)
  // ----------------------------------------------------------------------
  const generateSpeechForText = async (
    textToSpeak: string
  ): Promise<{ audioBase64: string; mp3Base64?: string; duration: number }> => {
    // Clean text automatically prior to speech synthesis if enabled
    let finalText = textToSpeak;
    if (cleanWhitespace || optimizePunctuation || normalizeNumbers) {
      finalText = cleanVietnameseText(finalText, {
        cleanWhitespace,
        fixLineBreaks: true,
        optimizePunctuation,
        normalizeNumbersAndSymbols: normalizeNumbers,
      });
    }

    const directionPrompt = buildVoiceDirectionPrompt(voiceSettings);

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: finalText,
          voice: activePersona.baseVoice,
          speed: voiceSettings.speed,
          voiceDirection: directionPrompt,
          generateMp3: true,
        }),
      });

      let data: any = null;
      try {
        data = await res.json();
      } catch (jsonErr) {
        console.warn('Failed to parse TTS response as JSON', jsonErr);
      }

      const isQuota =
        res.status === 429 ||
        data?.isQuotaExceeded ||
        data?.useClientFallback ||
        data?.error?.toLowerCase?.().includes('quota') ||
        data?.error?.toLowerCase?.().includes('resource_exhausted');

      if (isQuota) {
        setCleanSuccessNotice(
          '💡 Đang phát qua giọng dự phòng trình duyệt (do tài khoản chạm giới hạn quota miễn phí hàng ngày của Gemini).'
        );
        playWithWebSpeech(finalText, {
          rate: voiceSettings.speed,
          isChild: activePersona.age === 'child',
          pitch: activePersona.age === 'child' ? 1.4 : 1.0,
        });

        return {
          audioBase64: '',
          duration: Math.max(2, Math.round(countWords(finalText) / 2.5)),
        };
      }

      if (!res.ok || data?.error) {
        throw new Error(data?.error || 'Lỗi khi tạo âm thanh');
      }

      return {
        audioBase64: data.audioBase64,
        mp3Base64: data.mp3Base64,
        duration: data.duration || 0,
      };
    } catch (err: any) {
      const errMsg = err?.message?.toLowerCase?.() || '';
      if (errMsg.includes('quota') || errMsg.includes('resource_exhausted') || errMsg.includes('429')) {
        setCleanSuccessNotice('💡 Chuyển sang giọng đọc dự phòng của trình duyệt.');
        playWithWebSpeech(finalText, {
          rate: voiceSettings.speed,
          isChild: activePersona.age === 'child',
          pitch: activePersona.age === 'child' ? 1.4 : 1.0,
        });
        return {
          audioBase64: '',
          duration: Math.max(2, Math.round(countWords(finalText) / 2.5)),
        };
      }
      throw err;
    }
  };

  const handleGenerateMain = async () => {
    if (!rawText.trim()) {
      setGlobalError('Vui lòng nhập hoặc dán nội dung văn bản trước khi tạo giọng nói.');
      return;
    }

    setGlobalError(null);

    // If text has multiple chunks, run batch generation workflow
    if (chunks.length > 1) {
      handleGenerateAllChunks();
      return;
    }

    // Single chunk generation
    setIsBatchGenerating(true);
    setCurrentChunkIndex(0);

    try {
      const { audioBase64, mp3Base64, duration } = await generateSpeechForText(rawText);

      setCurrentAudioUrl(audioBase64);
      setCurrentMp3Url(mp3Base64 || null);
      setAudioDuration(duration);

      // Save to history
      const title =
        documentMetadata?.filename ||
        rawText.slice(0, 45).replace(/\n/g, ' ') ||
        'Văn bản đọc';
      const newItem: GeneratedAudioItem = {
        id: `audio-${Date.now()}`,
        title,
        timestamp: Date.now(),
        audioBase64,
        mp3Base64,
        duration,
        voice: activePersona.baseVoice,
        personaName: activePersona.name,
        speed: voiceSettings.speed,
        style: 'Tự nhiên',
        contentType: voiceSettings.contentType,
        wordCount: countWords(rawText),
        charCount: countChars(rawText),
        sourceType: documentMetadata ? documentMetadata.fileType : 'text',
        filename: documentMetadata?.filename
          ? `${documentMetadata.filename.replace(/\.[^/.]+$/, '')}_${activePersona.name}`
          : `VietVoice_${activePersona.name}_${Date.now()}`,
      };

      setHistoryItems((prev) => [newItem, ...prev.slice(0, 19)]);
    } catch (err: any) {
      console.error('Speech generation failed:', err);
      setGlobalError(err.message || 'Không thể tạo giọng nói. Vui lòng kiểm tra lại nội dung.');
    } finally {
      setIsBatchGenerating(false);
    }
  };

  const handleGenerateAllChunks = async () => {
    if (chunks.length === 0) return;
    setIsBatchGenerating(true);
    setIsPaused(false);
    isBatchCancelledRef.current = false;
    setGlobalError(null);

    const updatedChunks = [...chunks];
    const generatedAudioParts: string[] = [];

    for (let i = 0; i < updatedChunks.length; i++) {
      if (isBatchCancelledRef.current) break;

      // Handle pause
      while (isPausedRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 400));
        if (isBatchCancelledRef.current) break;
      }

      setCurrentChunkIndex(i);
      updatedChunks[i] = { ...updatedChunks[i], status: 'processing' };
      setChunks([...updatedChunks]);

      try {
        const { audioBase64, mp3Base64, duration } = await generateSpeechForText(
          updatedChunks[i].text
        );
        updatedChunks[i] = {
          ...updatedChunks[i],
          status: 'completed',
          audioBase64,
          mp3Base64,
          duration,
        };
        generatedAudioParts.push(audioBase64);
      } catch (err: any) {
        console.error(`Chunk ${i + 1} failed:`, err);
        updatedChunks[i] = {
          ...updatedChunks[i],
          status: 'error',
          error: err.message,
        };
      }
      setChunks([...updatedChunks]);
    }

    setIsBatchGenerating(false);

    // Merge completed chunks into one full audio
    if (generatedAudioParts.length > 0) {
      try {
        const mergeRes = await fetch('/api/merge-audio', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ audioChunks: generatedAudioParts }),
        });
        const mergeData = await mergeRes.json();
        if (mergeRes.ok && mergeData.audioBase64) {
          setCurrentAudioUrl(mergeData.audioBase64);
          setCurrentMp3Url(mergeData.mp3Base64 || null);
          setAudioDuration(mergeData.duration);

          // Add merged item to history
          const title = documentMetadata?.filename || `Tài liệu (${chunks.length} phần)`;
          const newItem: GeneratedAudioItem = {
            id: `audio-merged-${Date.now()}`,
            title,
            timestamp: Date.now(),
            audioBase64: mergeData.audioBase64,
            mp3Base64: mergeData.mp3Base64,
            duration: mergeData.duration,
            voice: activePersona.baseVoice,
            personaName: activePersona.name,
            speed: voiceSettings.speed,
            style: 'Tự nhiên',
            contentType: voiceSettings.contentType,
            wordCount: countWords(rawText),
            charCount: countChars(rawText),
            sourceType: documentMetadata ? documentMetadata.fileType : 'text',
            filename: documentMetadata?.filename
              ? `${documentMetadata.filename.replace(/\.[^/.]+$/, '')}_TronBo`
              : `VietVoice_Audiobook_${Date.now()}`,
          };
          setHistoryItems((prev) => [newItem, ...prev.slice(0, 19)]);
        }
      } catch (mergeErr) {
        console.warn('Could not auto-merge all audio chunks', mergeErr);
      }
    }
  };

  const handlePauseResume = () => {
    setIsPaused((prev) => !prev);
  };

  // Chunk play & download
  const handlePlayChunk = (chunk: TextChunk) => {
    if (!chunk.audioBase64) return;
    if (playingChunkId === chunk.id) {
      setPlayingChunkId(null);
      if (previewAudioRef.current) previewAudioRef.current.pause();
    } else {
      setPlayingChunkId(chunk.id);
      if (previewAudioRef.current) previewAudioRef.current.pause();
      const audio = new Audio(chunk.audioBase64);
      previewAudioRef.current = audio;
      audio.onended = () => setPlayingChunkId(null);
      audio.play();
    }
  };

  const handleDownloadChunk = (chunk: TextChunk, format: 'mp3' | 'wav') => {
    let url = chunk.audioBase64;
    let ext = 'wav';

    if (format === 'mp3') {
      if (chunk.mp3Base64) {
        url = chunk.mp3Base64;
        ext = 'mp3';
      } else {
        // Fallback to wav if mp3 not ready
        ext = 'wav';
      }
    }

    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    const cleanTitle = (chunk.title || `Phan_${chunk.index}`).replace(/\s+/g, '_');
    a.download = `${cleanTitle}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Download all chunks as a clean ZIP (supports mp3 or wav)
  const handleDownloadZip = async (format: 'mp3' | 'wav') => {
    const readyChunks = chunks.filter((c) => c.status === 'completed' && c.audioBase64);
    if (readyChunks.length === 0) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folderName = documentMetadata?.filename
        ? documentMetadata.filename.replace(/\.[^/.]+$/, '')
        : 'VietVoice_Audiobook';
      const folder = zip.folder(folderName) || zip;

      for (const chunk of readyChunks) {
        let base64Data = chunk.audioBase64!;
        let ext = 'wav';

        if (format === 'mp3') {
          if (chunk.mp3Base64) {
            base64Data = chunk.mp3Base64;
            ext = 'mp3';
          } else {
            // Convert to MP3
            try {
              const res = await fetch('/api/convert-mp3', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wavBase64: chunk.audioBase64 }),
              });
              const data = await res.json();
              if (data.mp3Base64) {
                base64Data = data.mp3Base64;
                ext = 'mp3';
              }
            } catch (e) {
              ext = 'wav';
            }
          }
        }

        const cleanBase64 = base64Data.replace(/^data:audio\/\w+;base64,/, '');
        const filename = `${chunk.index.toString().padStart(2, '0')}_${chunk.title.replace(
          /[\s\/:*?"<>|]+/g,
          '_'
        )}.${ext}`;
        folder.file(filename, cleanBase64, { base64: true });
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${folderName}_Audio_${format.toUpperCase()}_TronBo.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Zip generation error:', err);
    } finally {
      setIsZipping(false);
    }
  };

  // Split long document trigger
  const handleSplitLongDoc = () => {
    const freshChunks = splitTextIntoChunks(rawText, 1400);
    setChunks(freshChunks);
    setCleanSuccessNotice(`Đã chia lại văn bản thành ${freshChunks.length} phần`);
  };

  // Active workflow step calculation
  const getWorkflowStep = () => {
    if (currentAudioUrl) return 6;
    if (isBatchGenerating) return 5;
    if (chunks.length > 0 || (rawText && rawText.length > 100)) return 4;
    if (documentMetadata) return 3;
    if (rawText.trim().length > 0) return 3;
    return 1;
  };

  const currentStep = getWorkflowStep();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col font-sans selection:bg-rose-500/20 selection:text-rose-600 dark:selection:bg-rose-500/30 dark:selection:text-rose-400">
      {/* Top Navigation */}
      <Header
        darkMode={darkMode}
        onToggleDarkMode={() => setDarkMode(!darkMode)}
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={historyItems.length}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero Banner with Step Progress */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/60 text-rose-700 dark:text-rose-300 text-xs font-semibold shadow-xs">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Thư Viện Giọng Đọc & Phong Cách Tiếng Việt Chuẩn Studio</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Chuyển Văn Bản & Tài Liệu Thành{' '}
            <span className="bg-gradient-to-r from-rose-600 via-red-500 to-amber-500 bg-clip-text text-transparent">
              Giọng Nói Tự Nhiên
            </span>
          </h1>

          <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
            Hỗ trợ chính luận lãnh đạo, thời sự, tài liệu, TVC quảng cáo, sách nói và video TikTok. Xuất file <strong>MP3</strong> hoặc <strong>WAV</strong> chuẩn studio.
          </p>

          {/* Workflow Steps indicator */}
          <div className="hidden md:flex items-center justify-center space-x-2 pt-2 text-xs">
            {[
              { num: 1, label: 'Nhập / Tải file' },
              { num: 2, label: 'Trích xuất' },
              { num: 3, label: 'Làm sạch & Soạn thảo' },
              { num: 4, label: 'Thư viện giọng & Phong cách' },
              { num: 5, label: 'Tạo giọng nói' },
              { num: 6, label: 'Nghe & Tải MP3/WAV' },
            ].map((s, idx) => (
              <React.Fragment key={s.num}>
                <div
                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-full font-medium transition ${
                    currentStep >= s.num
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                  }`}
                >
                  <span className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">
                    {s.num}
                  </span>
                  <span>{s.label}</span>
                </div>
                {idx < 5 && (
                  <span className="text-slate-300 dark:text-slate-700 font-bold">→</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* Global Error Banner */}
        {globalError && (
          <div className="flex items-start space-x-2.5 p-4 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-sm shadow-xs animate-shake">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
            <div className="flex-1 font-medium">{globalError}</div>
            <button
              onClick={() => setGlobalError(null)}
              className="text-xs underline hover:text-red-900 dark:hover:text-red-100 cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* Notice alert */}
        {cleanSuccessNotice && (
          <div className="flex items-center space-x-2 p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-medium animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{cleanSuccessNotice}</span>
          </div>
        )}

        {/* Input Method Tabs */}
        <div className="space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-200 dark:border-slate-800 pb-2">
            <button
              onClick={() => setActiveTab('text')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'text'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>✍️ Nhập văn bản</span>
            </button>

            <button
              onClick={() => setActiveTab('upload')}
              className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition cursor-pointer ${
                activeTab === 'upload'
                  ? 'bg-rose-600 text-white shadow-md shadow-rose-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
              }`}
            >
              <UploadCloud className="w-4 h-4" />
              <span>📄 Upload tài liệu (PDF / DOCX)</span>
              {documentMetadata && (
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
              )}
            </button>
          </div>

          {/* Tab 1: Textarea Editor */}
          {activeTab === 'text' ? (
            <TextInputTab
              text={rawText}
              onChangeText={setRawText}
              onClear={() => setRawText('')}
              onGenerate={handleGenerateMain}
              isGenerating={isBatchGenerating}
            />
          ) : (
            /* Tab 2: Document Upload & Extract Area */
            <div className="space-y-4">
              <DocumentUploadTab
                metadata={documentMetadata}
                isExtracting={isExtracting}
                extractionError={extractionError}
                onUploadFile={handleUploadFile}
                onClearFile={handleClearFile}
                onRestoreOriginal={handleRestoreOriginal}
                canRestore={Boolean(originalExtractedText && rawText !== originalExtractedText)}
              />

              {/* Once extracted, display editable textarea for review */}
              {rawText && !isExtracting && (
                <TextInputTab
                  text={rawText}
                  onChangeText={setRawText}
                  onClear={() => setRawText('')}
                  onGenerate={handleGenerateMain}
                  isGenerating={isBatchGenerating}
                />
              )}
            </div>
          )}
        </div>

        {/* Step 3: Text Preparation Toolbar */}
        {rawText.trim().length > 0 && (
          <TextPreparationToolbar
            cleanWhitespace={cleanWhitespace}
            onToggleCleanWhitespace={() => setCleanWhitespace(!cleanWhitespace)}
            optimizePunctuation={optimizePunctuation}
            onToggleOptimizePunctuation={() => setOptimizePunctuation(!optimizePunctuation)}
            normalizeNumbers={normalizeNumbers}
            onToggleNormalizeNumbers={() => setNormalizeNumbers(!normalizeNumbers)}
            onApplyManualCleanup={handleApplyManualCleanup}
            onAiPolish={handleAiPolish}
            isAiPolishing={isAiPolishing}
            chunkCount={chunks.length}
            onSplitLongDoc={handleSplitLongDoc}
          />
        )}

        {/* Step 4: THƯ VIỆN GIỌNG ĐỌC & PHONG CÁCH (NEW MODULE) */}
        <VoiceLibraryModule
          settings={voiceSettings}
          onChangeSettings={setVoiceSettings}
          currentText={rawText}
          onPreviewVoice={handlePreviewVoice}
          isPreviewLoading={isPreviewLoading}
          isPreviewPlaying={isPreviewPlaying}
          onSelectSampleText={(text) => {
            setRawText(text);
            setActiveTab('text');
            window.scrollTo({ top: 180, behavior: 'smooth' });
          }}
        />

        {/* Primary CTA Generate Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white shadow-xl shadow-rose-950/20">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="font-extrabold text-base sm:text-lg flex items-center justify-center sm:justify-start gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span>Tạo giọng đọc chuyên nghiệp tiếng Việt</span>
            </h3>
            <p className="text-xs sm:text-sm text-slate-300">
              Giọng: <strong>{activePersona.name}</strong> ({activePersona.title}) • Thể loại:{' '}
              <strong>
                {CONTENT_TYPES_CONFIG.find((c) => c.id === voiceSettings.contentType)?.label ||
                  'Chính luận'}
              </strong>{' '}
              • Tốc độ: <strong>{voiceSettings.speed}x</strong>
              {chunks.length > 1 && ` • Sẽ xử lý ${chunks.length} phần liên tiếp`}
            </p>
          </div>

          <button
            onClick={handleGenerateMain}
            disabled={isBatchGenerating || !rawText.trim()}
            className="w-full sm:w-auto px-8 py-3.5 rounded-2xl font-extrabold text-sm sm:text-base text-white bg-gradient-to-r from-rose-600 via-red-500 to-rose-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-600/30 hover:scale-[1.02] active:scale-[0.98]"
          >
            {isBatchGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>
                  Đang xử lý phần {currentChunkIndex + 1}/{chunks.length || 1}...
                </span>
              </>
            ) : (
              <>
                <Volume2 className="w-5 h-5" />
                <span>Tạo giọng nói ngay</span>
              </>
            )}
          </button>
        </div>

        {/* Long Document / Audiobook Chunks Manager */}
        {chunks.length > 1 && (
          <AudiobookChunksList
            chunks={chunks}
            currentIndex={currentChunkIndex}
            isBatchGenerating={isBatchGenerating}
            onGenerateChunk={(idx) => {}}
            onGenerateAll={handleGenerateAllChunks}
            onPauseResume={handlePauseResume}
            isPaused={isPaused}
            onPlayChunk={handlePlayChunk}
            playingChunkId={playingChunkId}
            onDownloadChunk={handleDownloadChunk}
            onDownloadZip={handleDownloadZip}
            isZipping={isZipping}
          />
        )}

        {/* Step 6: Master Audio Player (with MP3 & WAV download) */}
        {currentAudioUrl && (
          <div className="space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>Bước 6 — Kết quả phát & Tải file MP3 / WAV</span>
            </div>
            <AudioPlayer
              audioUrl={currentAudioUrl}
              mp3Url={currentMp3Url}
              title={
                documentMetadata?.filename ||
                (rawText.slice(0, 50).replace(/\n/g, ' ') + '...')
              }
              duration={audioDuration}
              voiceName={activePersona.name}
              styleName={
                CONTENT_TYPES_CONFIG.find((c) => c.id === voiceSettings.contentType)?.label ||
                'Chính luận'
              }
              downloadFilename={
                documentMetadata?.filename
                  ? `${documentMetadata.filename.replace(/\.[^/.]+$/, '')}_VietVoice_${activePersona.name}`
                  : `VietVoice_${activePersona.name}_${Date.now()}`
              }
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur-sm py-6 text-center text-xs text-slate-500 dark:text-slate-400">
        <div className="max-w-7xl mx-auto px-4 space-y-2.5">
          <p className="font-bold text-slate-800 dark:text-slate-200 text-sm">
            Việt Voice AI by Nguyễn Đình Thi — Thư viện giọng đọc & Phong cách tiếng Việt chuẩn Studio
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Hỗ trợ chính luận, thời sự, tài liệu, quảng cáo, sách nói, truyện thiếu nhi và video ngắn. Tải xuống định dạng MP3 và WAV 24kHz.
          </p>

          <div className="pt-2 border-t border-slate-200/60 dark:border-slate-800/80 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-slate-700 dark:text-slate-300 text-xs sm:text-sm">
            <div className="flex items-center gap-1.5 font-medium">
              <User className="w-4 h-4 text-rose-500" />
              <span>Tác giả: <strong className="text-slate-900 dark:text-white font-bold">Nguyễn Đình Thi - Thái Bình</strong></span>
            </div>
            <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
            <div className="flex items-center gap-1.5 font-medium">
              <Phone className="w-4 h-4 text-rose-500" />
              <span>Điện thoại: </span>
              <a
                href="tel:0934287727"
                className="font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 hover:underline px-2.5 py-0.5 rounded-full bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-900/50 transition"
              >
                0934.287.727
              </a>
            </div>
          </div>
        </div>
      </footer>

      {/* History Modal */}
      <HistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        items={historyItems}
        onPlayItem={(item) => {
          setCurrentAudioUrl(item.audioBase64);
          setCurrentMp3Url(item.mp3Base64 || null);
          setAudioDuration(item.duration);
        }}
        onDeleteItem={(id) => {
          setHistoryItems((prev) => prev.filter((it) => it.id !== id));
        }}
        onClearAll={() => setHistoryItems([])}
      />
    </div>
  );
}
