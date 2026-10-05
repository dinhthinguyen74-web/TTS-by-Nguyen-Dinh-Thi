import React from 'react';
import {
  Wand2,
  CheckSquare,
  Square,
  Sparkles,
  SlidersHorizontal,
  Layers,
  Scissors,
  HelpCircle,
  Loader2,
} from 'lucide-react';

interface TextPreparationToolbarProps {
  cleanWhitespace: boolean;
  onToggleCleanWhitespace: () => void;
  optimizePunctuation: boolean;
  onToggleOptimizePunctuation: () => void;
  normalizeNumbers: boolean;
  onToggleNormalizeNumbers: () => void;
  onApplyManualCleanup: () => void;
  onAiPolish: () => void;
  isAiPolishing: boolean;
  chunkCount: number;
  onSplitLongDoc: () => void;
}

export const TextPreparationToolbar: React.FC<TextPreparationToolbarProps> = ({
  cleanWhitespace,
  onToggleCleanWhitespace,
  optimizePunctuation,
  onToggleOptimizePunctuation,
  normalizeNumbers,
  onToggleNormalizeNumbers,
  onApplyManualCleanup,
  onAiPolish,
  isAiPolishing,
  chunkCount,
  onSplitLongDoc,
}) => {
  return (
    <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center">
            <SlidersHorizontal className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
              <span>Chuẩn bị & Làm sạch văn bản đọc</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-normal">
                Khuyên dùng
              </span>
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tối ưu ngắt câu, chuẩn hóa số và tiền tệ để giọng đọc diễn cảm, không vấp
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={onApplyManualCleanup}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-900/60 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
            title="Thực hiện làm sạch theo các tùy chọn đã đánh dấu bên dưới"
          >
            <Wand2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Áp dụng làm sạch ngay</span>
          </button>

          <button
            onClick={onAiPolish}
            disabled={isAiPolishing}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 transition flex items-center gap-1.5 cursor-pointer shadow-xs shadow-purple-500/20"
            title="Sử dụng Gemini AI để thêm nhịp thở, tối ưu phát âm tự nhiên nhất"
          >
            {isAiPolishing ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            )}
            <span>AI tối ưu đọc</span>
          </button>
        </div>
      </div>

      {/* Checkbox options */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 text-xs">
        {/* Option 1: Clean Whitespace & Line breaks */}
        <button
          type="button"
          onClick={onToggleCleanWhitespace}
          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition text-left cursor-pointer ${
            cleanWhitespace
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-slate-800 dark:text-slate-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {cleanWhitespace ? (
            <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block text-slate-800 dark:text-slate-200">
              Tự động làm sạch văn bản
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
              Ghép dòng ngắt sai, xóa khoảng trắng thừa, giữ nguyên đoạn văn
            </span>
          </div>
        </button>

        {/* Option 2: Optimize punctuation */}
        <button
          type="button"
          onClick={onToggleOptimizePunctuation}
          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition text-left cursor-pointer ${
            optimizePunctuation
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-slate-800 dark:text-slate-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {optimizePunctuation ? (
            <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block text-slate-800 dark:text-slate-200">
              Tự động tối ưu dấu câu
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
              Chuẩn hóa dấu chấm, phẩy, ba chấm để giọng đọc có nhịp thở
            </span>
          </div>
        </button>

        {/* Option 3: Normalize numbers, currency, dates */}
        <button
          type="button"
          onClick={onToggleNormalizeNumbers}
          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition text-left cursor-pointer ${
            normalizeNumbers
              ? 'bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/60 text-slate-800 dark:text-slate-200'
              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
          }`}
        >
          {normalizeNumbers ? (
            <CheckSquare className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          ) : (
            <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
          )}
          <div>
            <span className="font-semibold block text-slate-800 dark:text-slate-200">
              Xử lý số & ký hiệu
            </span>
            <span className="text-[11px] text-slate-500 dark:text-slate-400 leading-tight block mt-0.5">
              Đọc số lớn, ngày tháng, tỷ lệ %, tiền tệ (150.000 đ → đồng), đơn vị đo
            </span>
          </div>
        </button>
      </div>

      {/* Long document chunk status */}
      {chunkCount > 1 && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 text-xs">
          <div className="flex items-center space-x-2">
            <Layers className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <span>
              Tài liệu dài: Đã tự động chia thành <strong>{chunkCount} phần</strong> theo chương/đoạn
              văn để xử lý mượt mà và không bị gián đoạn.
            </span>
          </div>
          <button
            onClick={onSplitLongDoc}
            className="text-xs font-semibold underline underline-offset-2 hover:text-amber-900 dark:hover:text-amber-200 cursor-pointer shrink-0 ml-2"
          >
            Chia lại đoạn
          </button>
        </div>
      )}
    </div>
  );
};
