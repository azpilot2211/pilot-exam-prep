"use client";
import { useRef, useState } from "react";

interface Props {
  src: string;
}

export function AudioPlayer({ src }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-slate-200">
      <button
        onClick={toggle}
        className="flex-shrink-0 w-10 h-10 bg-sky-600 text-white rounded-full flex items-center justify-center hover:bg-sky-700 transition-colors text-sm"
        aria-label={playing ? "Pause narration" : "Play narration"}
      >
        {playing ? "⏸" : "▶"}
      </button>
      <div>
        <p className="text-xs font-semibold text-slate-600">Audio Explanation</p>
        <p className="text-xs text-slate-400">{playing ? "Playing…" : "Tap to play"}</p>
      </div>
      <audio
        ref={audioRef}
        src={src}
        onEnded={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
