import React from 'react';
import {
  X,
  History,
  Trash2,
  Play,
  Download,
  Calendar,
  Mic,
  Clock,
  FileText,
  Volume2,
} from 'lucide-react';
import { GeneratedAudioItem } from '../types/index.ts';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: GeneratedAudioItem[];
  onPlayItem: (item: GeneratedAudioItem) => void;
  onDeleteItem: (id: string) => void;
  onClearAll: () => void;
}

export const HistoryModal: React.FC<HistoryModalProps> = ({
  isOpen,
  onClose,
  items,
  onPlayItem,
  onDeleteItem,
  onClearAll,
}) => {
  if (!isOpen) return null;

  const formatDate = (timestamp: number) => {
    const d = new Date(timestamp);
    return d.toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleDownload = (item: GeneratedAudioItem) => {
    const a = document.createElement('a');
    a.href = item.audioBase64;
    a.download = item.filename || `VietVoice_${item.voice}_${item.id}.wav`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
      <div
        className="w-full max-w-2xl rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col max-h-[85vh] animate-in fade-in zoom-in-95 duration-150"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-800 dark:text-slate-100">
                Lịch sử tạo giọng nói ({items.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Các bản audio đã tạo được lưu trữ an toàn trong trình duyệt
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {items.length > 0 && (
              <button
                onClick={onClearAll}
                className="px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition cursor-pointer flex items-center gap-1"
                title="Xóa toàn bộ lịch sử"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {items.length === 0 ? (
            <div className="text-center py-12 space-y-2 text-slate-400">
              <Volume2 className="w-10 h-10 mx-auto opacity-40 text-slate-400" />
              <p className="text-sm font-medium">Chưa có bản ghi âm nào trong lịch sử</p>
              <p className="text-xs">
                Khi bạn tạo giọng nói từ văn bản hoặc file, audio sẽ được lưu tại đây để nghe lại bất cứ lúc nào.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-800/30 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300">
                      {item.voice}
                    </span>
                    <h4 className="font-semibold text-xs sm:text-sm text-slate-800 dark:text-slate-200 line-clamp-1">
                      {item.title}
                    </h4>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 font-mono">
                    <span className="flex items-center gap-1 font-sans">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      {formatDate(item.timestamp)}
                    </span>
                    <span>•</span>
                    <span>{item.wordCount} từ</span>
                    <span>•</span>
                    <span>{item.style}</span>
                    <span>•</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                      {item.duration > 0 ? `${item.duration}s` : 'WAV'}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-1.5 self-end sm:self-center shrink-0">
                  <button
                    onClick={() => {
                      onPlayItem(item);
                      onClose();
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition flex items-center gap-1 cursor-pointer shadow-xs"
                    title="Phát audio này trong trình phát chính"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Nghe</span>
                  </button>

                  <button
                    onClick={() => handleDownload(item)}
                    className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition cursor-pointer"
                    title="Tải file audio (.wav)"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteItem(item.id)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition cursor-pointer"
                    title="Xóa mục này"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
