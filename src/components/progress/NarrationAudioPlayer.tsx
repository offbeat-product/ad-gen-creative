import { useRef, useState, useEffect } from 'react';
import { Play, Pause, Download } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  audioUrl: string;
  patternName: string;
}

const NarrationAudioPlayer = ({ audioUrl, patternName }: Props) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    // Reset when URL changes
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = val;
    }
    setCurrentTime(val);
  };

  return (
    <div className="bg-muted rounded-lg p-4 mt-4">
      <p className="text-xs font-medium text-muted-foreground mb-2">▶ ナレーション音声</p>
      <div className="flex items-center gap-3">
        <button
          onClick={togglePlay}
          className="w-10 h-10 rounded-full brand-gradient-bg text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
        >
          {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
        </button>
        <div className="flex-1">
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.1}
            value={currentTime}
            onChange={handleSeek}
            className={cn(
              "w-full h-1.5 rounded-full appearance-none cursor-pointer",
              "[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-secondary [&::-webkit-slider-thumb]:cursor-pointer",
              "[&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-secondary [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:border-0",
            )}
            style={{
              background: duration > 0
                ? `linear-gradient(to right, hsl(var(--secondary)) ${(currentTime / duration) * 100}%, hsl(var(--muted)) ${(currentTime / duration) * 100}%)`
                : 'hsl(var(--muted))',
            }}
          />
        </div>
        <span className="text-xs text-muted-foreground tabular-nums min-w-[80px] text-right">
          {formatTime(currentTime)} / {formatTime(duration)}
        </span>
        <a
          href={audioUrl}
          download={`${patternName}.mp3`}
          className="text-muted-foreground hover:text-foreground transition-colors shrink-0"
          title="ダウンロード"
        >
          <Download className="h-4 w-4" />
        </a>
      </div>
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={() => setCurrentTime(audioRef.current?.currentTime || 0)}
        onLoadedMetadata={() => setDuration(audioRef.current?.duration || 0)}
        onEnded={() => setIsPlaying(false)}
        preload="metadata"
      />
    </div>
  );
};

export default NarrationAudioPlayer;
