"use client";

import { useRef, useState } from "react";
import { Play, Pause, Download } from "lucide-react";

interface Props {
  lessonNumber: number;
  stem: string;
  audioUrl: string;
  downloadHref: string;
  filename: string;
}

export function AudioLessonPlayer({ lessonNumber, stem, audioUrl, downloadHref, filename }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
    } else {
      el.play();
    }
    setPlaying(!playing);
  };

  const handleTimeUpdate = () => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    setCurrentTime(el.currentTime);
    setProgress((el.currentTime / el.duration) * 100);
  };

  const handleLoaded = () => {
    if (audioRef.current) setDuration(audioRef.current.duration);
  };

  const handleEnded = () => setPlaying(false);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = audioRef.current;
    if (!el || !el.duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    el.currentTime = pct * el.duration;
  };

  const fmt = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoaded}
        onEnded={handleEnded}
        preload="metadata"
      />

      <div className="flex items-start gap-3">
        {/* Play / pause button */}
        <button
          onClick={toggle}
          className="flex-shrink-0 w-9 h-9 rounded-full bg-sky-500 hover:bg-sky-400 flex items-center justify-center transition-colors mt-0.5"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
            <Pause size={16} className="text-white" />
          ) : (
            <Play size={16} className="text-white ml-0.5" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          {/* Lesson number + title */}
          <div className="text-[10px] text-slate-400 font-medium mb-0.5">
            Lesson {lessonNumber}
          </div>
          <div className="text-sm text-slate-200 leading-snug line-clamp-2 mb-2">
            {stem}
          </div>

          {/* Progress bar */}
          <div
            className="h-1.5 rounded-full bg-slate-700 cursor-pointer mb-1"
            onClick={handleSeek}
            role="slider"
            aria-label="Seek audio"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div
              className="h-1.5 rounded-full bg-sky-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Time + download */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-slate-400 tabular-nums">
              {fmt(currentTime)}{duration > 0 ? ` / ${fmt(duration)}` : ""}
            </span>
            <a
              href={downloadHref}
              download={filename}
              className="flex items-center gap-1 text-[10px] text-slate-300 hover:text-sky-400 transition-colors"
            >
              <Download size={11} />
              Download
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
