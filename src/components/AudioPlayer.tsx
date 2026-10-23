'use client';

import { useRef, useState } from 'react';

function fmt(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Reproduce el beat completo, sin botón de descarga.
export default function AudioPlayer({ src, title }: { src: string | null; title: string }) {
  const ref = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);

  if (!src) {
    return <div className="player player-off">Audio de ejemplo no disponible</div>;
  }

  const toggle = () => {
    const audio = ref.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  };

  return (
    <div className="player" onContextMenu={(e) => e.preventDefault()}>
      <audio
        ref={ref}
        src={src}
        preload="metadata"
        controlsList="nodownload noplaybackrate"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
      />
      <button
        type="button"
        className="play-btn"
        onClick={toggle}
        aria-label={playing ? `Pausar ${title}` : `Reproducir ${title}`}
      >
        {playing ? (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M4.5 3H7.5V15H4.5ZM10.5 3H13.5V15H10.5Z" fill="#0F1012" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M5 3L15 9L5 15Z" fill="#0F1012" />
          </svg>
        )}
      </button>
      <input
        type="range"
        min={0}
        max={duration || 0}
        step={0.1}
        value={time}
        aria-label="Posición de la pista"
        onChange={(e) => {
          const value = Number(e.target.value);
          if (ref.current) ref.current.currentTime = value;
          setTime(value);
        }}
      />
      <span className="time">
        {fmt(time)} / {fmt(duration)}
      </span>
    </div>
  );
}
