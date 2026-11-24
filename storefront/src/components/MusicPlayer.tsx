import { Music2, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

interface MusicPlayerProps {
  url: string
}

/** Reproductor opcional: solo aparece si el dueño configuró una canción. */
export function MusicPlayer({ url }: MusicPlayerProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const [open, setOpen] = useState(false)
  const [playing, setPlaying] = useState(false)
  const [volume, setVolume] = useState(0.5)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.pause()
    audio.currentTime = 0
    setPlaying(false)
  }, [url])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume
  }, [volume])

  if (!url) return null

  const toggle = async () => {
    const audio = audioRef.current
    if (!audio) return
    try {
      if (playing) {
        audio.pause()
        setPlaying(false)
      } else {
        await audio.play()
        setPlaying(true)
      }
    } catch {
      setPlaying(false)
    }
  }

  return (
    <div className="fixed bottom-5 left-4 z-40 sm:left-6">
      <audio
        ref={audioRef}
        src={url}
        preload="none"
        loop
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
      />

      {open ? (
        <div className="absolute bottom-14 left-0 w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-white/[0.12] bg-[#0b0b16]/95 p-3 shadow-[0_30px_80px_-20px_rgba(0,0,0,.9)] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-[11px] font-semibold text-white/80">Eclipse + · Música</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-full p-1 text-white/40 transition hover:text-white"
              aria-label="Cerrar reproductor"
            >
              <X size={13} />
            </button>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <button
              type="button"
              onClick={() => void toggle()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-white transition hover:brightness-110"
              aria-label={playing ? 'Pausar música' : 'Reproducir música'}
            >
              {playing ? <Pause size={15} /> : <Play size={15} className="ml-0.5" />}
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={(event) => setVolume(Number(event.target.value))}
              className="h-1 min-w-0 flex-1 cursor-pointer"
              style={{ accentColor: 'rgb(var(--primary-rgb))' }}
              aria-label="Volumen"
            />
          </div>
          <p className="mt-2 text-[9px] leading-4 text-white/30">
            La música solo suena cuando tú la activas.
          </p>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex h-11 items-center gap-2 rounded-full border px-4 text-[11px] font-semibold text-white shadow-[0_10px_40px_-12px_rgb(var(--primary-rgb)/.7)] transition hover:-translate-y-0.5 ${
          playing
            ? 'border-accent/50 bg-accent/20 text-accent'
            : 'border-white/15 bg-[#0b0b16]/90 backdrop-blur-xl'
        }`}
        aria-label="Abrir reproductor de música"
      >
        <Music2 size={15} className={playing ? 'animate-pulse' : ''} />
        {playing ? 'Sonando' : 'Música'}
      </button>
    </div>
  )
}
