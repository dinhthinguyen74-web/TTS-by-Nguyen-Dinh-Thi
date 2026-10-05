import React, { useRef, useState, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Download,
  Gauge,
  Music,
  Share2,
  Sparkles,
  Loader2,
  FileAudio,
} from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string | null;
  mp3Url?: string | null;
  title: string;
  duration?: number;
  voiceName?: string;
  styleName?: string;
  downloadFilename?: string;
}

export const AudioPlayer: React.FC<AudioPlayerProps> = ({
  audioUrl,
  mp3Url,
  title,
  duration: initialDuration = 0,
  voiceName = 'Mai Phương',
  styleName = 'Chính luận',
  downloadFilename = 'VietVoice_Audio',
}) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const progressBarRef = useRef<HTMLDivElement | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isSeeking, setIsSeeking] = useState(false);

  // Format selection: 'mp3' or 'wav'
  const [downloadFormat, setDownloadFormat] = useState<'mp3' | 'wav'>('mp3');
  const [isConvertingMp3, setIsConvertingMp3] = useState(false);

  // Sync initial duration if updated
  useEffect(() => {
    if (initialDuration > 0) {
      setDuration(initialDuration);
    }
  }, [initialDuration]);

  // Reset playback when audio source changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.pause();
      setIsPlaying(false);
      setCurrentTime(0);
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Update audio properties
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
      audioRef.current.playbackRate = playbackRate;
    }
  }, [volume, isMuted, playbackRate]);

  // Hotkey listener (Space for Play/Pause, Left/Right for Seek)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
      if (tag === 'textarea' || tag === 'input') return;

      if (e.code === 'Space') {
        e.preventDefault();
        togglePlayPause();
      } else if (e.code === 'ArrowLeft') {
        seekRelative(-10);
      } else if (e.code === 'ArrowRight') {
        seekRelative(10);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentTime, duration]);

  const togglePlayPause = () => {
    if (!audioRef.current || !audioUrl) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current && !isSeeking) {
      setCurrentTime(audioRef.current.currentTime);
      if (audioRef.current.duration && !isNaN(audioRef.current.duration)) {
        setDuration(audioRef.current.duration);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (d && !isNaN(d)) {
        setDuration(d);
      }
    }
  };

  const handleEnded = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const seekRelative = (seconds: number) => {
    if (!audioRef.current) return;
    const newTime = Math.min(Math.max(0, audioRef.current.currentTime + seconds), duration);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleReplay = () => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = 0;
    setCurrentTime(0);
    audioRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressBarRef.current || !audioRef.current || duration <= 0) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const newTime = pos * duration;
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleDownload = async () => {
    if (!audioUrl) return;

    let targetUrl = audioUrl;
    const baseName = downloadFilename.replace(/\.(wav|mp3)$/i, '');
    let finalFilename = `${baseName}.${downloadFormat}`;

    if (downloadFormat === 'mp3') {
      if (mp3Url) {
        targetUrl = mp3Url;
      } else {
        // Convert on the fly
        setIsConvertingMp3(true);
        try {
          const res = await fetch('/api/convert-mp3', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ wavBase64: audioUrl }),
          });
          const data = await res.json();
          if (data.mp3Base64) {
            targetUrl = data.mp3Base64;
          }
        } catch (e) {
          console.warn('Fallback to WAV on MP3 convert failure', e);
          finalFilename = `${baseName}.wav`;
        } finally {
          setIsConvertingMp3(false);
        }
      }
    }

    const a = document.createElement('a');
    a.href = targetUrl;
    a.download = finalFilename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!audioUrl) return null;

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div className="rounded-3xl border-2 border-rose-500/30 bg-gradient-to-br from-white via-rose-50/20 to-white dark:from-slate-900 dark:via-rose-950/20 dark:to-slate-900 p-5 sm:p-6 shadow-xl shadow-rose-500/5 space-y-4">
      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
      />

      {/* Track info header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/60 dark:border-slate-800 pb-4">
        <div className="flex items-center space-x-3.5">
          <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-rose-500/20 shrink-0">
            <Music className={`w-6 h-6 ${isPlaying ? 'animate-bounce' : ''}`} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-base line-clamp-1">
              {title || 'Bản ghi âm tiếng Việt chất lượng cao'}
            </h3>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              <span>Giọng: <strong className="text-slate-800 dark:text-slate-200">{voiceName}</strong></span>
              <span>•</span>
              <span>Phong cách: <strong className="text-slate-800 dark:text-slate-200">{styleName}</strong></span>
              <span>•</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">24kHz Audio</span>
            </div>
          </div>
        </div>

        {/* Format Selector & Download Action */}
        <div className="flex items-center space-x-2.5 self-start md:self-center shrink-0">
          {/* Format pills (MP3 / WAV) */}
          <div className="inline-flex rounded-xl p-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold">
            <button
              onClick={() => setDownloadFormat('mp3')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                downloadFormat === 'mp3'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>MP3</span>
              <span className="text-[10px] opacity-75 font-normal">(Nhẹ)</span>
            </button>
            <button
              onClick={() => setDownloadFormat('wav')}
              className={`px-3 py-1.5 rounded-lg transition cursor-pointer flex items-center gap-1 ${
                downloadFormat === 'wav'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <span>WAV</span>
              <span className="text-[10px] opacity-75 font-normal">(Gốc)</span>
            </button>
          </div>

          {/* Download Button */}
          <button
            onClick={handleDownload}
            disabled={isConvertingMp3}
            className="px-4 py-2 rounded-xl text-xs sm:text-sm font-bold text-white bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 disabled:opacity-50 transition flex items-center gap-2 cursor-pointer shadow-md shadow-rose-500/20"
          >
            {isConvertingMp3 ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Đang xuất MP3...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Tải về .{downloadFormat.toUpperCase()}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Seeker / Waveform Progress Bar */}
      <div className="space-y-1.5">
        <div
          ref={progressBarRef}
          onClick={handleProgressBarClick}
          className="relative h-4 rounded-full bg-slate-200 dark:bg-slate-800 cursor-pointer flex items-center group overflow-hidden"
        >
          {/* Waveform visualizer bars */}
          <div className="absolute inset-0 flex items-center justify-between px-2 opacity-25 dark:opacity-20 pointer-events-none">
            {Array.from({ length: 48 }).map((_, i) => (
              <span
                key={i}
                className="w-1 bg-current rounded-full"
                style={{
                  height: `${25 + Math.sin(i * 0.7) * 50}%`,
                }}
              />
            ))}
          </div>

          {/* Progress fill */}
          <div
            className="h-full bg-gradient-to-r from-rose-500 to-red-600 transition-all rounded-full relative"
            style={{ width: `${progressPercent}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-rose-600 scale-0 group-hover:scale-100 transition-transform" />
          </div>
        </div>

        {/* Time stamps */}
        <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-slate-400">
          <span>{formatTime(currentTime)}</span>
          <span className="text-[11px] text-slate-400 font-sans hidden sm:inline">
            Phím tắt: [Dấu cách] Phát/Dừng • [← / →] Tua ±10s
          </span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Main Controls Row */}
      <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
        {/* Playback rate speed pills */}
        <div className="flex items-center space-x-1.5">
          <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline flex items-center gap-1">
            <Gauge className="w-3.5 h-3.5" />
            Tốc độ:
          </span>
          {[0.75, 1.0, 1.25, 1.5, 2.0].map((rate) => (
            <button
              key={rate}
              onClick={() => setPlaybackRate(rate)}
              className={`px-2 py-1 rounded-md text-xs font-mono font-semibold transition cursor-pointer ${
                playbackRate === rate
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
              }`}
            >
              {rate}x
            </button>
          ))}
        </div>

        {/* Center transport buttons */}
        <div className="flex items-center space-x-2 sm:space-x-3">
          {/* Replay */}
          <button
            onClick={handleReplay}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Nghe lại từ đầu"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Seek -10s */}
          <button
            onClick={() => seekRelative(-10)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Lùi lại 10 giây"
          >
            <span className="text-xs font-bold font-mono">-10s</span>
          </button>

          {/* Big Play / Pause Button */}
          <button
            onClick={togglePlayPause}
            className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-rose-600 via-red-500 to-rose-600 text-white flex items-center justify-center shadow-lg shadow-rose-500/30 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            title={isPlaying ? 'Tạm dừng (Phím Space)' : 'Phát (Phím Space)'}
          >
            {isPlaying ? (
              <Pause className="w-6 h-6" />
            ) : (
              <Play className="w-6 h-6 fill-current translate-x-0.5" />
            )}
          </button>

          {/* Seek +10s */}
          <button
            onClick={() => seekRelative(10)}
            className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title="Tua tới 10 giây"
          >
            <span className="text-xs font-bold font-mono">+10s</span>
          </button>
        </div>

        {/* Volume slider */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={isMuted ? 'Bật âm thanh' : 'Tắt tiếng'}
          >
            {isMuted || volume === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-400" />
            ) : (
              <Volume2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.05"
            value={isMuted ? 0 : volume}
            onChange={(e) => {
              setVolume(parseFloat(e.target.value));
              if (isMuted) setIsMuted(false);
            }}
            className="w-18 sm:w-24 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-600"
          />
        </div>
      </div>
    </div>
  );
};
