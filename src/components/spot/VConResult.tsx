import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Film,
  RefreshCw,
  Play,
  Pause,
  SkipBack,
  Mic,
  Music,
} from 'lucide-react';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export interface VconCut {
  cut_number: number;
  time_start: number;
  time_end: number;
  duration: number;
  section?: string;
  telop?: string;
  narration?: string;
  visual_direction?: string;
  text_position?: string;
  text_size?: string;
  transition?: string;
  annotations?: string[];
}

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
  input_data?: Record<string, unknown> | null;
  created_at?: string | null;
  project_id?: string | null;
}

export interface VconAsset {
  id: string;
  asset_type: string;
  file_url: string;
  metadata: Record<string, any> | null;
}

interface NarrationOption {
  job_id: string;
  audio_url: string;
  label: string;
  created_at: string;
}

interface BgmOption {
  asset_id: string;
  audio_url: string;
  label: string;
  created_at: string;
}

interface Props {
  job: SpotJob | null;
  assets: VconAsset[];
  jobId: string | null;
  durationSeconds: 15 | 30 | 60;
  creativeType: 'video' | 'banner';
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const fmt = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1) : '0.0');

const formatTimeRange = (start: number | undefined, end: number | undefined) =>
  `${fmt(start)}-${fmt(end)}s`;

const formatTime = (s: number) => {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
};

/* ─── Vcon Player Screen ─── */
const VconScreen = ({
  cut,
  visible,
  isPlaying,
  onToggle,
}: {
  cut: VconCut | null;
  visible: boolean;
  isPlaying: boolean;
  onToggle: () => void;
}) => {
  const fontSize =
    cut?.text_size === 'large'
      ? 'clamp(1.5rem, 5vw, 2.5rem)'
      : cut?.text_size === 'small'
      ? 'clamp(0.75rem, 1.5vw, 0.875rem)'
      : 'clamp(1rem, 2.5vw, 1.5rem)';
  const fontWeight = cut?.text_size === 'large' ? 'bold' : 'normal';
  const isBottomLeft = cut?.text_position === 'bottom-left';

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={isPlaying ? '一時停止' : '再生'}
      onClick={onToggle}
      onKeyDown={(e) => {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          onToggle();
        }
      }}
      className="relative w-full rounded-xl overflow-hidden bg-black cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      style={{ aspectRatio: '16/9' }}
    >
      {cut && visible && (
        <div
          key={cut.cut_number}
          className={cn(
            'absolute inset-0 flex flex-col px-8 py-6',
            isBottomLeft ? 'items-start justify-end' : 'items-center justify-center',
            cut.transition === 'fade' && 'animate-in fade-in duration-300',
          )}
        >
          <p
            className={cn(
              'whitespace-pre-line leading-snug',
              isBottomLeft ? 'text-left' : 'text-center',
            )}
            style={{ color: '#fff', fontSize, fontWeight }}
          >
            {cut.telop}
          </p>
          {cut.annotations && cut.annotations.length > 0 && (
            <div className="absolute bottom-3 left-4 space-y-0.5 pointer-events-none">
              {cut.annotations.map((a, i) => (
                <p key={i} className="text-[11px]" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {a}
                </p>
              ))}
            </div>
          )}
        </div>
      )}
      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
            <Play className="h-8 w-8 text-white ml-1" />
          </div>
        </div>
      )}
    </div>
  );
};

const VConResult = ({
  job,
  assets,
  jobId,
  durationSeconds,
  creativeType,
  context,
  onStartNew,
}: Props) => {
  const [expandedCuts, setExpandedCuts] = useState<Set<number>>(new Set());

  const cuts: VconCut[] = useMemo(
    () =>
      (assets[0]?.metadata as any)?.cuts ?? (job?.output_data as any)?.cuts ?? [],
    [assets, job],
  );
  const totalCuts = cuts.length;
  const totalDuration =
    (job?.output_data as any)?.total_duration ??
    (cuts.length > 0 ? cuts[cuts.length - 1].time_end : durationSeconds);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  /* ─── Player state ─── */
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [narrationVolume, setNarrationVolume] = useState(1.0);
  const [bgmVolume, setBgmVolume] = useState(0.3);
  const [narrationOptions, setNarrationOptions] = useState<NarrationOption[]>([]);
  const [selectedNarrationJobId, setSelectedNarrationJobId] = useState<string>('none');
  const [bgmOptions, setBgmOptions] = useState<BgmOption[]>([]);
  const [selectedBgmAssetId, setSelectedBgmAssetId] = useState<string>('none');
  const intervalRef = useRef<ReturnType<typeof setInterval>>();
  const narrationAudioRef = useRef<HTMLAudioElement>(null);
  const bgmAudioRef = useRef<HTMLAudioElement>(null);

  const selectedNarration = narrationOptions.find((o) => o.job_id === selectedNarrationJobId);
  const narrationUrl = selectedNarration?.audio_url ?? null;

  const selectedBgm = bgmOptions.find((o) => o.asset_id === selectedBgmAssetId);
  const bgmUrl = selectedBgm?.audio_url ?? null;

  const currentCut =
    cuts.find((c) => currentTime >= c.time_start && currentTime < c.time_end) ?? null;

  /* ─── Fetch narration audio jobs from same project ─── */
  const projectId = job?.project_id;
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const { data: jobs } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, input_data')
        .eq('project_id', projectId)
        .eq('tool_type', 'narration_audio')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (!jobs || jobs.length === 0 || cancelled) return;

      const jobIds = jobs.map((j) => j.id);
      const { data: assetRows } = await supabase
        .from('gen_spot_assets')
        .select('job_id, file_url, asset_type, sort_order')
        .in('job_id', jobIds)
        .order('sort_order', { ascending: true });

      if (cancelled) return;
      const byJob = new Map<string, string>();
      (assetRows ?? []).forEach((a: any) => {
        if (byJob.has(a.job_id)) return;
        const url = String(a.file_url ?? '');
        if (!url) return;
        // prefer audio assets
        if (
          a.asset_type === 'mp3' ||
          a.asset_type === 'audio' ||
          a.asset_type === 'narration_audio' ||
          /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(url)
        ) {
          byJob.set(a.job_id, url);
        }
      });

      const opts: NarrationOption[] = jobs
        .filter((j) => byJob.has(j.id))
        .map((j) => {
          const input = (j.input_data as any) ?? {};
          const voice =
            input.voice_name ?? input.voice_id ?? input.selected_voice ?? '';
          const pattern = input.pattern_name ?? input.pattern ?? '';
          const dateStr = new Date(j.created_at as string).toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          const parts = [pattern, voice].filter(Boolean).join(' / ');
          return {
            job_id: j.id,
            audio_url: byJob.get(j.id)!,
            label: `${parts || 'ナレーション'}（${dateStr}）`,
            created_at: j.created_at as string,
          };
        });

      // Preserve any synthesized preset entry (from output_data.narration_audio_url
      // that doesn't match a fetched job) so auto-selection survives the fetch.
      setNarrationOptions((prev) => {
        const preset = prev.find((p) => p.job_id === '__preset__');
        return preset ? [preset, ...opts.filter((o) => o.audio_url !== preset.audio_url)] : opts;
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  /* ─── Fetch BGM uploads from same project ─── */
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const { data: bgmJobs } = await supabase
        .from('gen_spot_jobs')
        .select('id')
        .eq('project_id', projectId)
        .eq('tool_type', 'bgm_suggestion');
      if (!bgmJobs || bgmJobs.length === 0 || cancelled) {
        setBgmOptions([]);
        return;
      }
      const bgmJobIds = bgmJobs.map((j) => j.id);
      const { data: bgmAssetRows } = await supabase
        .from('gen_spot_assets')
        .select('id, file_url, file_name, asset_type, created_at, metadata')
        .in('job_id', bgmJobIds)
        .eq('asset_type', 'bgm_upload')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      const opts: BgmOption[] = (bgmAssetRows ?? [])
        .filter((a: any) => a.file_url)
        .map((a: any) => {
          const dateStr = new Date(a.created_at as string).toLocaleString('ja-JP', {
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
          return {
            asset_id: a.id,
            audio_url: String(a.file_url),
            label: `${a.file_name ?? 'BGM'}（${dateStr}）`,
            created_at: a.created_at as string,
          };
        });
      // Preserve any synthesized preset entry from output_data.bgm_url
      setBgmOptions((prev) => {
        const preset = prev.find((p) => p.asset_id === '__preset__');
        return preset ? [preset, ...opts.filter((o) => o.audio_url !== preset.audio_url)] : opts;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ─── Auto-select narration/BGM from job output_data (or input_data fallback) ─── */
  const presetNarrationUrl =
    ((job?.output_data as any)?.narration_audio_url as string | undefined) ??
    ((job?.input_data as any)?.narration_audio_url as string | undefined);
  const presetBgmUrl =
    ((job?.output_data as any)?.bgm_url as string | undefined) ??
    ((job?.input_data as any)?.bgm_url as string | undefined);
  const narrationAutoApplied = useRef(false);
  const bgmAutoApplied = useRef(false);

  useEffect(() => {
    if (narrationAutoApplied.current) return;
    if (!presetNarrationUrl) return;
    const match = narrationOptions.find((o) => o.audio_url === presetNarrationUrl);
    if (match) {
      setSelectedNarrationJobId(match.job_id);
      narrationAutoApplied.current = true;
    } else {
      const synth: NarrationOption = {
        job_id: '__preset__',
        audio_url: presetNarrationUrl,
        label: 'アップロード音声 (生成時指定)',
        created_at: new Date().toISOString(),
      };
      setNarrationOptions((prev) =>
        prev.some((p) => p.job_id === '__preset__') ? prev : [synth, ...prev],
      );
      setSelectedNarrationJobId('__preset__');
      narrationAutoApplied.current = true;
    }
  }, [presetNarrationUrl, narrationOptions]);

  useEffect(() => {
    if (bgmAutoApplied.current) return;
    if (!presetBgmUrl) return;
    const match = bgmOptions.find((o) => o.audio_url === presetBgmUrl);
    if (match) {
      setSelectedBgmAssetId(match.asset_id);
      bgmAutoApplied.current = true;
    } else {
      const synth: BgmOption = {
        asset_id: '__preset__',
        audio_url: presetBgmUrl,
        label: 'アップロードBGM (生成時指定)',
        created_at: new Date().toISOString(),
      };
      setBgmOptions((prev) =>
        prev.some((p) => p.asset_id === '__preset__') ? prev : [synth, ...prev],
      );
      setSelectedBgmAssetId('__preset__');
      bgmAutoApplied.current = true;
    }
  }, [presetBgmUrl, bgmOptions]);

  /* ─── Sync volume ─── */
  useEffect(() => {
    if (narrationAudioRef.current) narrationAudioRef.current.volume = narrationVolume;
  }, [narrationVolume]);

  useEffect(() => {
    if (bgmAudioRef.current) bgmAudioRef.current.volume = bgmVolume;
  }, [bgmVolume]);

  /* ─── Cleanup on unmount ─── */
  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  /* ─── Stop when audio sources change ─── */
  useEffect(() => {
    stopPlayback();
    setCurrentTime(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedNarrationJobId, selectedBgmAssetId]);

  const stopPlayback = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
    narrationAudioRef.current?.pause();
    bgmAudioRef.current?.pause();
  }, []);

  const startPlayback = useCallback(
    (fromTime?: number) => {
      const startT = fromTime ?? currentTime;
      setCurrentTime(startT);
      setIsPlaying(true);

      if (narrationAudioRef.current && narrationUrl) {
        try {
          narrationAudioRef.current.currentTime = startT;
        } catch {
          /* ignore */
        }
        narrationAudioRef.current.volume = narrationVolume;
        narrationAudioRef.current.play().catch(() => {});
      }

      if (bgmAudioRef.current && bgmUrl) {
        try {
          bgmAudioRef.current.currentTime = startT;
        } catch {
          /* ignore */
        }
        bgmAudioRef.current.volume = bgmVolume;
        bgmAudioRef.current.play().catch(() => {});
      }

      if (intervalRef.current) clearInterval(intervalRef.current);
      const startWall = Date.now();
      intervalRef.current = setInterval(() => {
        const elapsed = (Date.now() - startWall) / 1000 + startT;
        if (elapsed >= totalDuration) {
          setCurrentTime(totalDuration);
          setIsPlaying(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = undefined;
          }
          narrationAudioRef.current?.pause();
          bgmAudioRef.current?.pause();
        } else {
          setCurrentTime(elapsed);
        }
      }, 100);
    },
    [currentTime, totalDuration, narrationUrl, narrationVolume, bgmUrl, bgmVolume],
  );

  const togglePlay = useCallback(() => {
    if (isPlaying) stopPlayback();
    else startPlayback();
  }, [isPlaying, stopPlayback, startPlayback]);

  const restart = useCallback(() => {
    stopPlayback();
    setCurrentTime(0);
    setTimeout(() => startPlayback(0), 50);
  }, [stopPlayback, startPlayback]);

  const seekTo = useCallback(
    (time: number) => {
      const clamped = Math.max(0, Math.min(totalDuration, time));
      if (isPlaying) {
        stopPlayback();
        setCurrentTime(clamped);
        setTimeout(() => startPlayback(clamped), 50);
      } else {
        setCurrentTime(clamped);
        if (narrationAudioRef.current) {
          try {
            narrationAudioRef.current.currentTime = clamped;
          } catch {
            /* ignore */
          }
        }
        if (bgmAudioRef.current) {
          try {
            bgmAudioRef.current.currentTime = clamped;
          } catch {
            /* ignore */
          }
        }
      }
    },
    [isPlaying, stopPlayback, startPlayback, totalDuration],
  );

  const toggleCut = (n: number) => {
    setExpandedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleExportJson = () => {
    const data = {
      cuts,
      duration_seconds: durationSeconds,
      creative_type: creativeType,
      meta: {
        client_name: context?.project.product.client.name,
        product_name: context?.project.product.name,
        project_name: context?.project.name,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vcon_${jobId?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!job) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        生成結果はまだありません
      </div>
    );
  }

  const progressPct = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">生成結果</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {job.status === 'pending' && (
              <span className="text-muted-foreground">待機中...</span>
            )}
            {job.status === 'running' && <span className="text-warning">生成中</span>}
            {job.status === 'completed' && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> 完了
              </span>
            )}
            {job.status === 'failed' && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> 失敗
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={onStartNew}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> 新しく生成
          </Button>
        </div>
      </div>

      {isRunning && (
        <div className="space-y-2">
          <Progress value={undefined} className="animate-pulse" />
          <div className="text-xs text-muted-foreground text-center">
            🎬 Vコンを設計中... 30秒〜1分ほどお待ちください
          </div>
        </div>
      )}

      {job.status === 'failed' && job.error_message && (
        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
          {job.error_message}
        </div>
      )}

      {totalCuts > 0 && (
        <>
          {/* ─── Player section ─── */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium flex items-center gap-2">🎬 Vコンプレビュー</p>
              <span className="text-xs text-muted-foreground">
                動画尺 <strong className="text-foreground">{durationSeconds}秒</strong> / 全{' '}
                <strong className="text-foreground">{totalCuts}カット</strong>
              </span>
            </div>

            <VconScreen
              cut={currentCut}
              visible={isPlaying || currentTime > 0}
              isPlaying={isPlaying}
              onToggle={togglePlay}
            />

            {/* Progress bar */}
            <div
              className="h-2 w-full rounded-full bg-muted cursor-pointer overflow-hidden"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pct = (e.clientX - rect.left) / rect.width;
                seekTo(pct * totalDuration);
              }}
            >
              <div
                className="h-full rounded-full bg-primary transition-all duration-100"
                style={{ width: `${progressPct}%` }}
              />
            </div>

            {/* Buttons + time */}
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 hover:opacity-90 transition-opacity"
                aria-label={isPlaying ? '一時停止' : '再生'}
              >
                {isPlaying ? (
                  <Pause className="h-4 w-4" />
                ) : (
                  <Play className="h-4 w-4 ml-0.5" />
                )}
              </button>
              <button
                onClick={restart}
                className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                aria-label="最初から"
              >
                <SkipBack className="h-3.5 w-3.5" />
              </button>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatTime(currentTime)} / {formatTime(totalDuration)}
              </span>

              {/* Narration volume */}
              <div className="flex items-center gap-2 ml-auto min-w-[180px]">
                <Mic
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    narrationUrl ? 'text-primary' : 'text-muted-foreground/40',
                  )}
                />
                <Slider
                  value={[narrationVolume * 100]}
                  onValueChange={([v]) => setNarrationVolume(v / 100)}
                  max={100}
                  step={1}
                  disabled={!narrationUrl}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                  {Math.round(narrationVolume * 100)}%
                </span>
              </div>
            </div>

            {/* BGM volume */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 ml-auto min-w-[180px]">
                <Music
                  className={cn(
                    'h-3.5 w-3.5 shrink-0',
                    bgmUrl ? 'text-secondary' : 'text-muted-foreground/40',
                  )}
                />
                <Slider
                  value={[bgmVolume * 100]}
                  onValueChange={([v]) => setBgmVolume(v / 100)}
                  max={100}
                  step={5}
                  disabled={!bgmUrl}
                  className="flex-1"
                />
                <span className="text-xs text-muted-foreground tabular-nums w-9 text-right">
                  {Math.round(bgmVolume * 100)}%
                </span>
              </div>
            </div>

            {/* Fixed status display (Vコン is a frozen design doc) */}
            <div className="text-xs text-muted-foreground space-y-1 pt-1">
              <div>
                🎙 ナレーション:{' '}
                {narrationUrl ? (
                  <span className="text-foreground font-medium">設定済み</span>
                ) : (
                  <span className="italic">なし</span>
                )}
              </div>
              <div>
                🎵 BGM:{' '}
                {bgmUrl ? (
                  <span className="text-foreground font-medium">設定済み</span>
                ) : (
                  <span className="italic">なし</span>
                )}
              </div>
            </div>
          </div>

          {/* Hidden audio */}
          {narrationUrl && (
            <audio ref={narrationAudioRef} src={narrationUrl} preload="auto" />
          )}
          {bgmUrl && (
            <audio ref={bgmAudioRef} src={bgmUrl} preload="auto" loop playsInline />
          )}

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-1.5 pt-2 border-t">
            <Button variant="outline" size="sm" onClick={handleExportJson}>
              <Download className="h-3.5 w-3.5 mr-1" /> JSONエクスポート
            </Button>
            <Link to="/tools/image-generation">
              <Button variant="outline" size="sm">
                <ImageIcon className="h-3.5 w-3.5 mr-1" /> 絵コンテ画像へ
              </Button>
            </Link>
            <Link to="/tools/carousel-video">
              <Button variant="outline" size="sm">
                <Film className="h-3.5 w-3.5 mr-1" /> カルーセル動画へ
              </Button>
            </Link>
          </div>

          {/* ─── Cut list (clickable) ─── */}
          <div className="space-y-1">
            <p className="text-sm font-medium">📋 カット一覧（クリックでジャンプ）</p>
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10 text-center"></TableHead>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead className="w-24">時間</TableHead>
                    <TableHead className="w-16 text-center">秒</TableHead>
                    <TableHead className="w-24">セクション</TableHead>
                    <TableHead>テロップ</TableHead>
                    <TableHead className="w-8"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cuts.map((cut) => {
                    const expanded = expandedCuts.has(cut.cut_number);
                    const isCurrent = currentCut?.cut_number === cut.cut_number;
                    const isPast = currentTime >= (cut.time_end ?? 0);
                    return (
                      <>
                        <TableRow
                          key={`row-${cut.cut_number}`}
                          className={cn(
                            'cursor-pointer',
                            isCurrent && 'bg-primary/10 border-l-4 border-l-primary',
                          )}
                          onClick={() => seekTo(cut.time_start ?? 0)}
                        >
                          <TableCell className="text-center text-xs">
                            {isCurrent ? (
                              <span className="text-primary font-bold">▶</span>
                            ) : isPast ? (
                              <span className="text-success">✅</span>
                            ) : (
                              <span className="text-muted-foreground">○</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center font-bold tabular-nums text-secondary">
                            {cut.cut_number}
                          </TableCell>
                          <TableCell className="text-xs tabular-nums">
                            {formatTimeRange(cut.time_start, cut.time_end)}
                          </TableCell>
                          <TableCell className="text-center text-xs tabular-nums">
                            {fmt(cut.duration)}s
                          </TableCell>
                          <TableCell className="text-xs">
                            {cut.section ? (
                              <Badge variant="outline" className="text-[10px]">
                                {cut.section}
                              </Badge>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell className="text-xs font-medium whitespace-pre-wrap">
                            {cut.telop || (
                              <span className="text-muted-foreground/60">(なし)</span>
                            )}
                            {cut.annotations && cut.annotations.length > 0 && (
                              <Badge
                                variant="secondary"
                                className="ml-1.5 text-[10px] align-middle"
                              >
                                ※注釈
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className="text-center"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCut(cut.cut_number);
                            }}
                          >
                            {expanded ? (
                              <ChevronDown className="h-3.5 w-3.5 inline" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 inline" />
                            )}
                          </TableCell>
                        </TableRow>
                        {expanded && (
                          <TableRow key={`detail-${cut.cut_number}`} className="bg-muted/30">
                            <TableCell colSpan={7} className="p-3">
                              <div className="grid md:grid-cols-2 gap-3 text-xs">
                                {cut.visual_direction && (
                                  <div>
                                    <div className="font-semibold text-muted-foreground mb-0.5">
                                      映像指示
                                    </div>
                                    <div>{cut.visual_direction}</div>
                                  </div>
                                )}
                                {cut.narration && (
                                  <div>
                                    <div className="font-semibold text-muted-foreground mb-0.5">
                                      ナレーション (全文)
                                    </div>
                                    <div>{cut.narration}</div>
                                  </div>
                                )}
                                <div className="flex flex-wrap gap-1.5">
                                  {cut.text_position && (
                                    <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                      位置: {cut.text_position}
                                    </span>
                                  )}
                                  {cut.text_size && (
                                    <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                      サイズ: {cut.text_size}
                                    </span>
                                  )}
                                  {cut.transition && (
                                    <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                      遷移: {cut.transition}
                                    </span>
                                  )}
                                </div>
                                {cut.annotations && cut.annotations.length > 0 && (
                                  <div className="md:col-span-2">
                                    <div className="font-semibold text-warning mb-0.5">
                                      ⚠️ 注釈 (薬機法等)
                                    </div>
                                    <ul className="list-disc list-inside space-y-0.5">
                                      {cut.annotations.map((a, i) => (
                                        <li key={i}>{a}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default VConResult;
