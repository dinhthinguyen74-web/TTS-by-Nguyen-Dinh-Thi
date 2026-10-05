import React, { useRef, useState } from 'react';
import {
  UploadCloud,
  FileCheck,
  FileText,
  AlertCircle,
  Loader2,
  RefreshCw,
  Trash2,
  Undo2,
  Eye,
} from 'lucide-react';
import { DocumentMetadata } from '../types/index.ts';

interface DocumentUploadTabProps {
  metadata: DocumentMetadata | null;
  isExtracting: boolean;
  extractionError: string | null;
  onUploadFile: (file: File) => void;
  onClearFile: () => void;
  onRestoreOriginal: () => void;
  canRestore: boolean;
}

const MAX_FILE_SIZE_MB = 30;

export const DocumentUploadTab: React.FC<DocumentUploadTabProps> = ({
  metadata,
  isExtracting,
  extractionError,
  onUploadFile,
  onClearFile,
  onRestoreOriginal,
  canRestore,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndHandle = (file: File) => {
    setLocalError(null);
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf' && ext !== 'docx') {
      setLocalError('Chỉ hỗ trợ file định dạng .PDF hoặc .DOCX');
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setLocalError(`Dung lượng file vượt quá giới hạn ${MAX_FILE_SIZE_MB}MB.`);
      return;
    }

    onUploadFile(file);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndHandle(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndHandle(e.target.files[0]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload Zone */}
      {!metadata && !isExtracting ? (
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-200 group ${
            isDragOver
              ? 'border-rose-500 bg-rose-50/50 dark:bg-rose-950/20 scale-[0.99]'
              : 'border-slate-300 dark:border-slate-700 hover:border-rose-400 dark:hover:border-rose-500/70 bg-white dark:bg-slate-900/50'
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className="hidden"
          />

          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40 flex items-center justify-center text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform shadow-sm">
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <p className="text-base sm:text-lg font-semibold text-slate-800 dark:text-slate-100">
                Kéo & thả file PDF hoặc DOCX vào đây
              </p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                hoặc{' '}
                <span className="text-rose-600 dark:text-rose-400 font-semibold underline underline-offset-4 decoration-rose-300">
                  Chọn file từ máy tính
                </span>
              </p>
            </div>

            <div className="flex items-center space-x-2 text-xs text-slate-400 dark:text-slate-500 pt-2">
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-medium">
                .PDF
              </span>
              <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-800 font-mono text-slate-600 dark:text-slate-300 font-medium">
                .DOCX
              </span>
              <span>• Tối đa {MAX_FILE_SIZE_MB}MB</span>
            </div>
          </div>
        </div>
      ) : isExtracting ? (
        /* Loading Extraction State */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 sm:p-12 text-center shadow-sm">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-4 border-rose-100 dark:border-rose-950 border-t-rose-600 animate-spin flex items-center justify-center" />
              <div className="absolute inset-0 flex items-center justify-center">
                <FileText className="w-6 h-6 text-rose-500 animate-pulse" />
              </div>
            </div>
            <div>
              <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                Đang đọc và trích xuất nội dung tiếng Việt...
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Tự động bóc tách cấu trúc, tiêu đề, đoạn văn và kiểm tra lớp chữ
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* Uploaded Document Info Card */
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-900/60 bg-gradient-to-r from-emerald-50/50 via-white to-emerald-50/20 dark:from-emerald-950/20 dark:via-slate-900 dark:to-emerald-950/10 p-5 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* File info */}
            <div className="flex items-start space-x-3.5">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 flex items-center justify-center text-emerald-700 dark:text-emerald-400 shrink-0 shadow-sm">
                <FileCheck className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-200/60 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300">
                    {metadata?.fileType}
                  </span>
                  <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm sm:text-base truncate max-w-[280px] sm:max-w-md">
                    {metadata?.filename}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-mono">
                  <span>Dung lượng: <strong>{metadata?.fileSize}</strong></span>
                  <span>•</span>
                  <span>Số trang: <strong>{metadata?.pageCount} trang</strong></span>
                  <span>•</span>
                  <span>Từ: <strong>{metadata?.wordCount.toLocaleString('vi-VN')}</strong></span>
                  <span>•</span>
                  <span>Ký tự: <strong>{metadata?.charCount.toLocaleString('vi-VN')}</strong></span>
                  {metadata?.isScanned && (
                    <span className="text-amber-600 dark:text-amber-400 font-sans font-medium">
                      (Đã xử lý OCR nhận dạng scan)
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Document Controls */}
            <div className="flex items-center space-x-2 self-end md:self-center shrink-0">
              {canRestore && (
                <button
                  onClick={onRestoreOriginal}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                  title="Khôi phục nội dung văn bản lúc vừa trích xuất"
                >
                  <Undo2 className="w-3.5 h-3.5 text-blue-500" />
                  <span>Khôi phục gốc</span>
                </button>
              )}

              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Tải lên file khác thay thế"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                <span>Thay file</span>
              </button>

              <button
                onClick={onClearFile}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 transition flex items-center gap-1.5 cursor-pointer shadow-xs"
                title="Xóa tài liệu này"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa file</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden file input for "Thay file" */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        className="hidden"
      />

      {/* Error alert */}
      {(localError || extractionError) && (
        <div className="flex items-start space-x-2.5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-300 text-xs sm:text-sm">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
          <div className="flex-1 font-medium">{localError || extractionError}</div>
        </div>
      )}
    </div>
  );
};
