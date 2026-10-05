import React from 'react';
import {
  Layers,
  Play,
  Pause,
  Download,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileArchive,
  Volume2,
  Sparkles,
} from 'lucide-react';
import { TextChunk } from '../types/index.ts';

interface AudiobookChunksListProps {
  chunks: TextChunk[];
  currentIndex: number;
  isBatchGenerating: boolean;
  onGenerateChunk: (index: number) => void;
  onGenerateAll: () => void;
  onPauseResume: () => void;
  isPaused: boolean;
  onPlayChunk: (chunk: TextChunk) => void;
  playingChunkId: string | null;
  onDownloadChunk: (chunk: TextChunk, format: 'mp3' | 'wav') => void;
  onDownloadZip: (format: 'mp3' | 'wav') => void;
  isZipping: boolean;
}

export const AudiobookChunksList: React.FC<AudiobookChunksListProps> = ({
  chunks,
  currentIndex,
  isBatchGenerating,
  onGenerateAll,
  onPauseResume,
  isPaused,
  onPlayChunk,
  playingChunkId,
  onDownloadChunk,
  onDownloadZip,
  isZipping,
}) => {
  const [zipFormat, setZipFormat] = React.useState<'mp3' | 'wav'>('mp3');

  if (chunks.length <= 1) return null;

  const completedCount = chunks.filter((c) => c.status === 'completed').length;
  const progressPercent = Math.round((completedCount / chunks.length) * 100);

  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4">
      {/* Header with Progress */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Layers className="w-5 h-5 text-rose-600 dark:text-rose-400" />
            <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Quản lý chương & Đoạn audio ({chunks.length} phần)
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tài liệu dài được chia thành các phần để tránh gián đoạn và đảm bảo chất lượng âm thanh tốt nhất
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Generate All / Pause / Resume */}
          {isBatchGenerating ? (
            <button
              onClick={onPauseResume}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 border border-amber-300 dark:border-amber-800 transition flex items-center gap-1.5 cursor-pointer"
            >
              {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              <span>{isPaused ? 'Tiếp tục tạo' : 'Tạm dừng'}</span>
            </button>
          ) : (
            <button
              onClick={onGenerateAll}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs shadow-rose-500/30"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Tạo toàn bộ ({chunks.length} phần)</span>
            </button>
          )}

          {/* Download All as ZIP */}
          {completedCount > 0 && (
            <div className="flex items-center space-x-1.5">
              <div className="inline-flex rounded-xl p-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
                <button
                  onClick={() => setZipFormat('mp3')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    zipFormat === 'mp3'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  MP3
                </button>
                <button
                  onClick={() => setZipFormat('wav')}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    zipFormat === 'wav'
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-400'
                  }`}
                >
                  WAV
                </button>
              </div>

              <button
                onClick={() => onDownloadZip(zipFormat)}
                disabled={isZipping}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title={`Tải gói file nén ZIP chứa tất cả các phần audio dạng .${zipFormat.toUpperCase()}`}
              >
                {isZipping ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <FileArchive className="w-3.5 h-3.5 text-blue-500" />
                )}
                <span>Tải ZIP ({completedCount}/{chunks.length})</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Realtime Progress Bar */}
      {isBatchGenerating && (
        <div className="space-y-1.5 bg-rose-50/50 dark:bg-rose-950/20 p-3 rounded-xl border border-rose-100 dark:border-rose-900/40">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-900 dark:text-rose-200">
            <span className="flex items-center gap-1.5">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-600" />
              Đang xử lý phần {Math.min(currentIndex + 1, chunks.length)}/{chunks.length}
            </span>
            <span className="font-mono">{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-rose-100 dark:bg-rose-950 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all duration-300 rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      )}

      {/* Chunks List */}
      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {chunks.map((chunk, idx) => {
          const isPlaying = playingChunkId === chunk.id;
          const isCurrentProcessing = isBatchGenerating && currentIndex === idx;

          return (
            <div
              key={chunk.id}
              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                isCurrentProcessing
                  ? 'border-rose-500 bg-rose-50/40 dark:bg-rose-950/30'
                  : chunk.status === 'completed'
                  ? 'border-emerald-200 dark:border-emerald-900/40 bg-emerald-50/20 dark:bg-emerald-950/10'
                  : chunk.status === 'error'
                  ? 'border-red-200 dark:border-red-900/40 bg-red-50/20 dark:bg-red-950/10'
                  : 'border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/20'
              }`}
            >
              {/* Chunk Info */}
              <div className="flex items-start space-x-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 mt-0.5 ${
                    chunk.status === 'completed'
                      ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400'
                      : isCurrentProcessing
                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 animate-pulse'
                      : 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  {chunk.index}
                </div>

                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200">
                      {chunk.title}
                    </span>
                    <span className="text-[11px] text-slate-400 font-mono">
                      ({chunk.wordCount} từ • {chunk.charCount} ký tự)
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">
                    "{chunk.text}"
                  </p>
                </div>
              </div>

              {/* Status & Action */}
              <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                {chunk.status === 'completed' ? (
                  <>
                    <button
                      onClick={() => onPlayChunk(chunk)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 cursor-pointer transition ${
                        isPlaying
                          ? 'bg-rose-600 text-white'
                          : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-200'
                      }`}
                      title={isPlaying ? 'Dừng phát' : 'Nghe đoạn này'}
                    >
                      {isPlaying ? (
                        <Pause className="w-3 h-3" />
                      ) : (
                        <Play className="w-3 h-3 fill-current" />
                      )}
                      <span>{isPlaying ? 'Dừng' : 'Phát'}</span>
                    </button>

                    <button
                      onClick={() => onDownloadChunk(chunk, 'mp3')}
                      className="px-2 py-1 rounded-lg text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer text-xs font-semibold flex items-center gap-1"
                      title="Tải audio phần này dạng .mp3"
                    >
                      <Download className="w-3 h-3" />
                      <span>MP3</span>
                    </button>

                    <button
                      onClick={() => onDownloadChunk(chunk, 'wav')}
                      className="px-2 py-1 rounded-lg text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 transition cursor-pointer text-xs"
                      title="Tải audio phần này dạng .wav"
                    >
                      WAV
                    </button>
                  </>
                ) : isCurrentProcessing ? (
                  <span className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Đang tạo...
                  </span>
                ) : chunk.status === 'error' ? (
                  <span className="text-xs text-red-600 dark:text-red-400 font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Lỗi
                  </span>
                ) : (
                  <span className="text-xs text-slate-400 dark:text-slate-500 font-mono">
                    Chờ xử lý
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
