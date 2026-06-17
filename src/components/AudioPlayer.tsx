"use client";
import { useRef, useState } from "react";

// Module-level singleton — only one audio plays at a time across all instances
let _currentAudio: HTMLAudioElement | null = null;

interface Props {
  src: string;
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
    } else {
      // pause any other playing audio first
      if (_currentAudio && _currentAudio !== audio) {
        _currentAudio.pause();
      }
      _currentAudio = audio;
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
  };

  const progress = duration > 0 ? currentTime / duration : 0;

  return (
    <div className="flex flex-col gap-2 px-4 py-3 bg-white rounded-xl border border-slate-200">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="flex-shrink-0 w-9 h-9 bg-sky-600 text-white rounded-full flex items-center justify-center hover:bg-sky-700 transition-colors text-sm"
          aria-label={playing ? "Pause narration" : "Play narration"}
        >
          {playing ? "⏸" : "▶"}
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-600">Audio Explanation</p>
          <p className="text-xs text-slate-400">{playing ? "Playing…" : "Tap to play"}</p>
        </div>
        <span className="text-xs text-slate-400 tabular-nums flex-shrink-0">
          {formatTime(currentTime)}{duration > 0 ? ` / ${formatTime(duration)}` : ""}
        </span>
      </div>

      {/* Progress bar */}
      <div className="relative h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className="absolute left-0 top-0 h-full bg-sky-500 rounded-full transition-all"
          style={{ width: `${progress * 100}%` }}
        />
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label="Seek"
        />
      </div>

      <audio
        ref={audioRef}
        src={src}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime ?? 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration ?? 0)}
        onPause={() => setPlaying(false)}
        onEnded={() => { setPlaying(false); setCurrentTime(0); if (_currentAudio === audioRef.current) _currentAudio = null; }}
        className="hidden"
      />
    </div>
  );
}
