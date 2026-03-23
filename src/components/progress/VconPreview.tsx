import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Pause, SkipBack, Volume2, VolumeX, ChevronDown, ChevronUp, Mic, Music } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import { supabase } from '@/integrations/supabase/client';

/* ─── Types ─── */

interface VconCut {
  cut_number: number;
  time_start: number;
  time_end: number;
  duration: number;
  section: string;
  telop: string;
  narration: string;
  annotations?: string[];
  visual_direction?: string;
  text_position?: string;
  text_size?: string;
  transition?: string;
}

interface VconPattern {
  pattern_name: string;
  total_duration: number;
  cuts: VconCut[];
}

interface Props {
  genStepResult: any;
  narrationAudioMap?: Record<string, string | null>;
  narrationAudioMapB?: Record<string, string | null>;
  selectedGender?: 'male' | 'female';
  jobId?: string | null;
}

/* ─── Safe parse ─── */

const safeParse = (v: any): any => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try {
    const p = JSON.parse(v);
    if (typeof p === 'string') try { return JSON.parse(p); } catch { return p; }
    return p;
  } catch { return null; }
};

/* ─── Format time ─── */

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ─── Vcon Screen ─── */

const VconScreen = ({ cut, visible }: { cut: VconCut | null; visible: boolean }) => {
  const fontSize = cut?.text_size === 'large' ? '2.5rem'
    : cut?.text_size === 'small' ? '0.875rem'
    : '1.5rem';
  const fontWeight = cut?.text_size === 'large' ? 'bold' : 'normal';

  return (
    <div
      className="relative w-full rounded-xl overflow-hidden flex items-center justify-center"
      style={{ aspectRatio: '16/9', backgroundColor: '#000' }}
    >
      <AnimatePresence mode="wait">
        {cut && visible && (
          <motion.div
            key={cut.cut_number}
            initial={{ opacity: cut.transition === 'fade' ? 0 : 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: cut.transition === 'fade' ? 0 : 1 }}
            transition={{ duration: cut.transition === 'fade' ? 0.3 : 0 }}
            className="absolute inset-0 flex flex-col items-center justify-center px-8"
          >
            <p
              className="text-center whitespace-pre-line"
              style={{ color: '#fff', fontSize, fontWeight, lineHeight: 1.4 }}
            >
              {cut.telop}
            </p>
            {cut.annotations && cut.annotations.length > 0 && (
              <div className="absolute bottom-4 left-4">
                {cut.annotations.map((a, i) => (
                  <p key={i} className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>{a}</p>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      {!visible && !cut && (
        <Play className="h-12 w-12" style={{ color: 'rgba(255,255,255,0.3)' }} />
      )}
    </div>
  );
};

/* ─── Cut List Item ─── */

const CutListItem = ({ cut, isActive, isPast, isExpanded, onClick, onToggle }: {
  cut: VconCut; isActive: boolean; isPast: boolean; isExpanded: boolean;
  onClick: () => void; onToggle: () => void;
}) => (
  <div className={cn(
    'rounded-lg transition-all border',
    isActive ? 'border-l-[3px] border-l-secondary bg-secondary/5 border-secondary/20' : isPast ? 'border-border bg-accent/30' : 'border-border',
  )}>
    <button
      onClick={onClick}
      className="w-full flex items-center gap-2 px-3 py-2 text-left"
    >
      <span className={cn('text-xs font-mono w-5', isActive ? 'text-secondary font-bold' : isPast ? 'text-success' : 'text-muted-foreground')}>
        {isActive ? '▶' : isPast ? '✅' : '○'}
      </span>
      <span className="text-xs font-mono text-muted-foreground w-8 shrink-0">C{cut.cut_number}</span>
      <span className="text-xs text-muted-foreground w-20 shrink-0">{formatTime(cut.time_start)}-{formatTime(cut.time_end)}</span>
      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">{cut.section}</Badge>
      <span className="text-xs truncate flex-1">「{cut.telop.split('\n')[0]}」</span>
      <button onClick={(e) => { e.stopPropagation(); onToggle(); }} className="text-muted-foreground hover:text-foreground shrink-0">
        {isExpanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
      </button>
    </button>
    {isExpanded && (
      <div className="px-3 pb-3 pt-1 border-t border-border ml-5 space-y-1.5">
        <div>
          <span className="text-[10px] text-muted-foreground font-medium">テロップ: </span>
          <span className="text-xs whitespace-pre-line">{cut.telop}</span>
        </div>
        {cut.narration && (
          <div>
            <span className="text-[10px] text-muted-foreground font-medium">ナレーション: </span>
            <span className="text-xs">{cut.narration}</span>
          </div>
        )}
        {cut.annotations && cut.annotations.length > 0 && (
          <div>
            <span className="text-[10px] text-muted-foreground font-medium">注釈: </span>
            <span className="text-xs">{cut.annotations.join(', ')}</span>
          </div>
        )}
        {cut.visual_direction && (
          <div>
            <span className="text-[10px] text-muted-foreground font-medium">映像指示: </span>
            <span className="text-xs">{cut.visual_direction}</span>
          </div>
        )}
        {cut.transition && (
          <div>
            <span className="text-[10px] text-muted-foreground font-medium">トランジション: </span>
            <span className="text-xs">{cut.transition}</span>
          </div>
        )}
      </div>
    )}
  </div>
);

/* ─── Main Component ─── */

const VconPreview = ({ genStepResult, narrationAudioMap, narrationAudioMapB, selectedGender, jobId }: Props) => {
  const parsed = safeParse(genStepResult);
  const vconData: VconPattern[] = parsed?.vcon_data ?? [];

  const [selectedPattern, setSelectedPattern] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expandedCut, setExpandedCut] = useState<number | null>(null);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const narrationAudioRef = useRef<HTMLAudioElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);

  // BGM URLs from gen_patterns
  const [bgmUrlMap, setBgmUrlMap] = useState<Record<string, string | null>>({});

  const pattern = vconData[selectedPattern];
  const totalDuration = pattern?.total_duration ?? 30;
  const cuts = pattern?.cuts ?? [];

  // Find current cut
  const currentCut = cuts.find(c => currentTime >= c.time_start && currentTime < c.time_end) ?? null;

  // Get narration audio URL for this pattern
  const patternName = pattern?.pattern_name ?? '';
  const narrationUrl = narrationAudioMap?.[patternName] ?? narrationAudioMap?.[`${patternName}1`] ?? null;
  const bgmUrl = bgmUrlMap[patternName] ?? null;

  // Fetch BGM URLs from gen_patterns
  useEffect(() => {
    if (!jobId) return;
    const fetchBgm = async () => {
      const { data } = await supabase
        .from('gen_patterns')
        .select('pattern_id, bgm_url')
        .eq('job_id', jobId);
      if (data) {
        const map: Record<string, string | null> = {};
        data.forEach(p => { map[p.pattern_id] = p.bgm_url; });
        setBgmUrlMap(map);
      }
    };
    fetchBgm();
  }, [jobId]);

  // Cleanup on unmount / pattern change
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  // Stop when pattern changes
  useEffect(() => {
    stopPlayback();
    setCurrentTime(0);
    setExpandedCut(null);
  }, [selectedPattern]);

  // Sync volumes
  useEffect(() => {
    if (narrationAudioRef.current) narrationAudioRef.current.volume = narrationVolume;
  }, [narrationVolume]);

  useEffect(() => {
    if (bgmAudioRef.current) bgmAudioRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    narrationAudioRef.current?.pause();
    bgmAudioRef.current?.pause();
  }, []);

  const startPlayback = useCallback((fromTime?: number) => {
    const startT = fromTime ?? currentTime;
    setCurrentTime(startT);
    setIsPlaying(true);

    // Sync narration audio
    if (narrationAudioRef.current && narrationUrl) {
      narrationAudioRef.current.currentTime = startT;
      narrationAudioRef.current.volume = narrationVolume;
      narrationAudioRef.current.play().catch(() => {});
    }

    // Sync BGM audio
    if (bgmAudioRef.current && bgmUrl) {
      bgmAudioRef.current.currentTime = startT;
      bgmAudioRef.current.volume = bgmVolume;
      bgmAudioRef.current.play().catch(() => {});
    }

    if (intervalRef.current) clearInterval(intervalRef.current);
    const startWall = Date.now();
    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startWall) / 1000 + startT;
      if (elapsed >= totalDuration) {
        setCurrentTime(totalDuration);
        stopPlayback();
      } else {
        setCurrentTime(elapsed);
      }
    }, 100);
  }, [currentTime, totalDuration, stopPlayback, narrationUrl, bgmUrl, narrationVolume, bgmVolume]);

  const togglePlay = useCallback(() => {
    if (isPlaying) {
      stopPlayback();
    } else {
      startPlayback();
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  const restart = useCallback(() => {
    stopPlayback();
    setCurrentTime(0);
    setTimeout(() => startPlayback(0), 50);
  }, [stopPlayback, startPlayback]);

  const seekTo = useCallback((time: number) => {
    if (isPlaying) {
      stopPlayback();
      setCurrentTime(time);
      setTimeout(() => startPlayback(time), 50);
    } else {
      setCurrentTime(time);
    }
  }, [isPlaying, stopPlayback, startPlayback]);

  const jumpToCut = useCallback((cut: VconCut) => {
    seekTo(cut.time_start);
  }, [seekTo]);

  if (vconData.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Play className="h-10 w-10 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Vコンデータがありません</p>
      </div>
    );
  }

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="space-y-4">
      {/* Pattern tabs */}
      {vconData.length > 1 && (
        <Tabs value={String(selectedPattern)} onValueChange={v => setSelectedPattern(Number(v))}>
          <TabsList className="flex-wrap h-auto gap-1 p-1">
            {vconData.map((p, i) => (
              <TabsTrigger key={i} value={String(i)} className="text-xs px-3 py-1.5 data-[state=active]:bg-secondary data-[state=active]:text-secondary-foreground">
                パターン{p.pattern_name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      )}

      {/* Vcon screen */}
      <VconScreen cut={currentCut} visible={isPlaying || currentTime > 0} />

      {/* Controls */}
      <div className="space-y-3">
        {/* Progress bar */}
        <div
          className="h-2 w-full rounded-full bg-muted cursor-pointer overflow-hidden"
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = (e.clientX - rect.left) / rect.width;
            seekTo(Math.max(0, Math.min(totalDuration, pct * totalDuration)));
          }}
        >
          <div
            className="h-full rounded-full brand-gradient-bg transition-all duration-100"
            style={{ width: `${progressPct}%` }}
          />
        </div>

        {/* Buttons + time */}
        <div className="flex items-center gap-3">
          <button
            onClick={togglePlay}
            className="w-10 h-10 rounded-full brand-gradient-bg text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </button>
          <button
            onClick={restart}
            className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </button>
          <span className="text-sm text-muted-foreground tabular-nums">
            {formatTime(currentTime)} / {formatTime(totalDuration)}
          </span>
        </div>

        {/* Volume controls */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Narration volume */}
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Mic className={cn('h-3.5 w-3.5 shrink-0', narrationUrl ? 'text-secondary' : 'text-muted-foreground/40')} />
            <span className="text-xs text-muted-foreground w-12 shrink-0">
              {narrationUrl ? 'NA' : 'NA未生成'}
            </span>
            <Slider
              value={[narrationVolume * 100]}
              onValueChange={([v]) => setNarrationVolume(v / 100)}
              max={100}
              step={1}
              disabled={!narrationUrl}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8">{Math.round(narrationVolume * 100)}%</span>
          </div>

          {/* BGM volume */}
          <div className="flex items-center gap-2 flex-1 min-w-[140px]">
            <Music className={cn('h-3.5 w-3.5 shrink-0', bgmUrl ? 'text-secondary' : 'text-muted-foreground/40')} />
            <span className="text-xs text-muted-foreground w-12 shrink-0">
              {bgmUrl ? 'BGM' : 'BGM未選択'}
            </span>
            <Slider
              value={[bgmVolume * 100]}
              onValueChange={([v]) => setBgmVolume(v / 100)}
              max={100}
              step={1}
              disabled={!bgmUrl}
              className="flex-1"
            />
            <span className="text-xs text-muted-foreground tabular-nums w-8">{Math.round(bgmVolume * 100)}%</span>
          </div>
        </div>

        {/* Audio info */}
        {(narrationUrl || bgmUrl) && (
          <div className="text-xs text-muted-foreground space-y-0.5">
            {narrationUrl && <p>🎙 ナレーション: パターン{patternName}</p>}
            {bgmUrl && <p>🎵 BGM: {bgmUrl.split('/').pop()} (Envato Elements)</p>}
          </div>
        )}
      </div>

      {/* Cut list */}
      <div className="space-y-1.5">
        <p className="text-sm font-medium flex items-center gap-2">
          📋 カット一覧（タイムライン）
        </p>
        <div className="space-y-1">
          {cuts.map((cut) => {
            const isActive = currentCut?.cut_number === cut.cut_number;
            const isPast = currentTime >= cut.time_end;
            return (
              <CutListItem
                key={cut.cut_number}
                cut={cut}
                isActive={isActive}
                isPast={isPast}
                isExpanded={expandedCut === cut.cut_number}
                onClick={() => jumpToCut(cut)}
                onToggle={() => setExpandedCut(expandedCut === cut.cut_number ? null : cut.cut_number)}
              />
            );
          })}
        </div>
      </div>

      {/* Hidden audio elements */}
      {narrationUrl && (
        <audio ref={narrationAudioRef} src={narrationUrl} preload="auto" />
      )}
      {bgmUrl && (
        <audio ref={bgmAudioRef} src={bgmUrl} preload="auto" loop />
      )}
    </div>
  );
};

export default VconPreview;
