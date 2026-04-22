import { useEffect, useRef, useState } from 'react';
import { Loader2, Clapperboard, ListChecks, Upload, X, Music, Mic } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import CompositionPickerDialog, {
  type CompositionScene,
  type CompositionJobRow,
} from '@/components/spot/CompositionPickerDialog';

export type DurationSec = 15 | 30 | 60;

export interface NarrationSourceOption {
  job_id: string;
  audio_url: string;
  label: string;
}

export interface BgmSourceOption {
  asset_id: string;
  audio_url: string;
  label: string;
}

export type AudioSourceMode = 'existing' | 'upload' | 'none';

const VOICE_ID_MAP: Record<string, string> = {
  '3JDquces8E8bkmvbh6Bc': '男性voice1',
  j210dv0vWm7fCknyQpbA: '男性voice2',
  T7yYq3WpB94yAuOXraRi: '女性voice1',
  WQz3clzUdMqvBf0jswZQ: '女性voice2',
};

const ALLOWED_AUDIO_TYPES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/x-wav',
  'audio/x-m4a',
  'audio/mp4',
];

const formatNarrationLabel = (input: any, createdAt: string) => {
  const voiceId = input?.voice_id ?? input?.selected_voice ?? '';
  const voiceName = VOICE_ID_MAP[voiceId] ?? voiceId ?? '不明ボイス';
  const speed = input?.speed ?? 1.0;
  const date = new Date(createdAt).toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  return `${voiceName} (速度${speed}) - ${date}`;
};

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  composition: string;
  setComposition: (v: string) => void;
  compositionJobId: string | null;
  setCompositionJobId: (v: string | null) => void;
  durationSeconds: DurationSec;
  setDurationSeconds: (v: DurationSec) => void;
  narrationAudioUrl: string | null;
  setNarrationAudioUrl: (v: string | null) => void;
  bgmUrl: string | null;
  setBgmUrl: (v: string | null) => void;
  onGenerate: () => void;
  isRunning: boolean;
}

const VConSettings = ({
  context,
  projectId,
  composition,
  setComposition,
  compositionJobId,
  setCompositionJobId,
  durationSeconds,
  setDurationSeconds,
  narrationAudioUrl,
  setNarrationAudioUrl,
  bgmUrl,
  setBgmUrl,
  onGenerate,
  isRunning,
}: Props) => {
  const [compPickerOpen, setCompPickerOpen] = useState(false);

  /* ── Narration sources ── */
  const [narrationMode, setNarrationMode] = useState<AudioSourceMode>('none');
  const [narrationOptions, setNarrationOptions] = useState<NarrationSourceOption[]>([]);
  const [selectedNarrationJobId, setSelectedNarrationJobId] = useState<string>('');
  const [uploadedNarration, setUploadedNarration] = useState<{ name: string; url: string } | null>(
    null
  );
  const [narrationUploading, setNarrationUploading] = useState(false);
  const narrationInputRef = useRef<HTMLInputElement>(null);

  /* ── BGM sources ── */
  const [bgmMode, setBgmMode] = useState<AudioSourceMode>('none');
  const [bgmOptions, setBgmOptions] = useState<BgmSourceOption[]>([]);
  const [selectedBgmAssetId, setSelectedBgmAssetId] = useState<string>('');
  const [uploadedBgm, setUploadedBgm] = useState<{ name: string; url: string } | null>(null);
  const [bgmUploading, setBgmUploading] = useState(false);
  const bgmInputRef = useRef<HTMLInputElement>(null);

  const canGenerate = composition.trim().length > 0;

  /* ── Fetch narration audio options ── */
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    (async () => {
      const { data: jobs } = await supabase
        .from('gen_spot_jobs')
        .select('id, input_data, created_at')
        .eq('project_id', projectId)
        .eq('tool_type', 'narration_audio')
        .eq('status', 'completed')
        .order('created_at', { ascending: false });
      if (!jobs || jobs.length === 0 || cancelled) {
        setNarrationOptions([]);
        return;
      }
      const jobIds = jobs.map((j) => j.id);
      const { data: assetRows } = await supabase
        .from('gen_spot_assets')
        .select('job_id, file_url, asset_type')
        .in('job_id', jobIds);
      if (cancelled) return;
      const byJob = new Map<string, string>();
      (assetRows ?? []).forEach((a: any) => {
        if (byJob.has(a.job_id)) return;
        const url = String(a.file_url ?? '');
        if (!url) return;
        if (
          a.asset_type === 'mp3' ||
          a.asset_type === 'audio' ||
          a.asset_type === 'narration_audio' ||
          /\.(mp3|wav|m4a|ogg)(\?|$)/i.test(url)
        ) {
          byJob.set(a.job_id, url);
        }
      });
      const opts = jobs
        .filter((j) => byJob.has(j.id))
        .map((j) => ({
          job_id: j.id,
          audio_url: byJob.get(j.id)!,
          label: formatNarrationLabel(j.input_data, j.created_at as string),
        }));
      setNarrationOptions(opts);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ── Fetch BGM upload options ── */
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
      const ids = bgmJobs.map((j) => j.id);
      const { data: rows } = await supabase
        .from('gen_spot_assets')
        .select('id, file_url, file_name, created_at')
        .in('job_id', ids)
        .eq('asset_type', 'bgm_upload')
        .order('created_at', { ascending: false });
      if (cancelled) return;
      setBgmOptions(
        (rows ?? [])
          .filter((a: any) => a.file_url)
          .map((a: any) => {
            const date = new Date(a.created_at as string).toLocaleString('ja-JP', {
              month: '2-digit',
              day: '2-digit',
              hour: '2-digit',
              minute: '2-digit',
            });
            return {
              asset_id: a.id,
              audio_url: String(a.file_url),
              label: `${a.file_name ?? 'BGM'} (${date})`,
            };
          })
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  /* ── Resolve URL for parent based on mode ── */
  useEffect(() => {
    if (narrationMode === 'none') {
      setNarrationAudioUrl(null);
    } else if (narrationMode === 'existing') {
      const sel = narrationOptions.find((o) => o.job_id === selectedNarrationJobId);
      setNarrationAudioUrl(sel?.audio_url ?? null);
    } else if (narrationMode === 'upload') {
      setNarrationAudioUrl(uploadedNarration?.url ?? null);
    }
  }, [narrationMode, selectedNarrationJobId, uploadedNarration, narrationOptions, setNarrationAudioUrl]);

  useEffect(() => {
    if (bgmMode === 'none') {
      setBgmUrl(null);
    } else if (bgmMode === 'existing') {
      const sel = bgmOptions.find((o) => o.asset_id === selectedBgmAssetId);
      setBgmUrl(sel?.audio_url ?? null);
    } else if (bgmMode === 'upload') {
      setBgmUrl(uploadedBgm?.url ?? null);
    }
  }, [bgmMode, selectedBgmAssetId, uploadedBgm, bgmOptions, setBgmUrl]);

  /* ── Audio upload helper ── */
  const validateAudio = (file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast.error('ファイルサイズは20MB以下にしてください');
      return false;
    }
    if (!ALLOWED_AUDIO_TYPES.includes(file.type)) {
      toast.error('MP3 / WAV / M4A のみ対応しています');
      return false;
    }
    return true;
  };

  const uploadAudio = async (file: File, kind: 'narration_upload' | 'bgm_manual') => {
    if (!projectId) {
      toast.error('案件を選択してください');
      return null;
    }
    const ts = Date.now();
    const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const folder = kind === 'narration_upload' ? 'spot/narration_upload' : 'bgm/manual';
    const path = `${folder}/${projectId}/${ts}_${safe}`;
    const { error } = await supabase.storage.from('audios').upload(path, file, { upsert: false });
    if (error) {
      toast.error(`アップロード失敗: ${error.message}`);
      return null;
    }
    const { data } = supabase.storage.from('audios').getPublicUrl(path);
    return data.publicUrl;
  };

  const handleNarrationUpload = async (file: File) => {
    if (!validateAudio(file)) return;
    setNarrationUploading(true);
    const url = await uploadAudio(file, 'narration_upload');
    setNarrationUploading(false);
    if (url) {
      setUploadedNarration({ name: file.name, url });
      toast.success('ナレーション音声をアップロードしました');
    }
  };

  const handleBgmUpload = async (file: File) => {
    if (!validateAudio(file)) return;
    setBgmUploading(true);
    const url = await uploadAudio(file, 'bgm_manual');
    setBgmUploading(false);
    if (url) {
      setUploadedBgm({ name: file.name, url });
      toast.success('BGMをアップロードしました');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold font-display tracking-tight">Vコンを設計</h2>
        <p className="text-xs text-muted-foreground mt-1">
          構成案とナレーション/BGMを組み合わせて、動画として再生確認できるVコンを生成します
        </p>
      </div>

      {/* === 構成案 === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-bold">📝 構成案 (必須)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCompPickerOpen(true)}
          >
            <ListChecks className="h-3.5 w-3.5 mr-1" /> 構成案生成から読み込み
          </Button>
        </div>
        <Textarea
          value={composition}
          onChange={(e) => {
            setComposition(e.target.value);
            // ユーザーが手で編集したらjob_id紐付けを解除
            if (compositionJobId) setCompositionJobId(null);
          }}
          placeholder={`例:\n冒頭：市販品で効果なし？\n冒頭：もう限界だ...\n前半：91%が実感した\n前半：医師監修の本格治療\n...`}
          className="min-h-[180px] text-sm"
        />
        <p className="text-[11px] text-muted-foreground">
          ※ 構成案生成ツールで作成したものを読み込むと、秒配分・映像指示も反映されます
          {compositionJobId && (
            <span className="ml-2 text-success">✓ 構成案ジョブ紐付け中</span>
          )}
        </p>
      </div>

      {/* === 動画尺 === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-bold">⏱ 動画尺</Label>
        <RadioGroup
          value={String(durationSeconds)}
          onValueChange={(v) => setDurationSeconds(Number(v) as DurationSec)}
          className="flex gap-3"
        >
          {[15, 30, 60].map((d) => (
            <Label
              key={d}
              className={cn(
                'flex items-center gap-1.5 text-sm cursor-pointer rounded-md border px-4 py-2',
                durationSeconds === d && 'border-secondary bg-secondary-wash/40'
              )}
            >
              <RadioGroupItem value={String(d)} /> {d}秒
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* === ナレーション音声 === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-bold flex items-center gap-1.5">
          <Mic className="h-4 w-4" /> ナレーション音声 (任意)
        </Label>

        <RadioGroup
          value={narrationMode}
          onValueChange={(v) => setNarrationMode(v as AudioSourceMode)}
          className="space-y-3"
        >
          {/* existing */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="existing" disabled={narrationOptions.length === 0} />
              生成済みナレーションから選択
              {narrationOptions.length === 0 && (
                <span className="text-[11px] text-muted-foreground">(まだありません)</span>
              )}
            </Label>
            {narrationMode === 'existing' && narrationOptions.length > 0 && (
              <Select
                value={selectedNarrationJobId}
                onValueChange={setSelectedNarrationJobId}
              >
                <SelectTrigger className="ml-6 w-[calc(100%-1.5rem)]">
                  <SelectValue placeholder="ナレーションを選択" />
                </SelectTrigger>
                <SelectContent>
                  {narrationOptions.map((opt) => (
                    <SelectItem key={opt.job_id} value={opt.job_id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* upload */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="upload" />
              ファイルをアップロード
            </Label>
            {narrationMode === 'upload' && (
              <div className="ml-6 space-y-2">
                {!uploadedNarration ? (
                  <div
                    onClick={() => narrationInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground cursor-pointer hover:border-secondary hover:bg-secondary-wash/20 transition-colors"
                  >
                    {narrationUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> アップロード中...
                      </span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mx-auto mb-1" />
                        MP3 / WAV / M4A をクリックして選択 (最大20MB)
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <Mic className="h-3.5 w-3.5 text-primary" />
                    <span className="flex-1 truncate">{uploadedNarration.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedNarration(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <input
                  ref={narrationInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/x-m4a,audio/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleNarrationUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>

          {/* none */}
          <Label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="none" />
            ナレーションなし
          </Label>
        </RadioGroup>
      </div>

      {/* === BGM === */}
      <div className="rounded-xl border bg-card p-4 space-y-3">
        <Label className="text-sm font-bold flex items-center gap-1.5">
          <Music className="h-4 w-4" /> BGM (任意)
        </Label>

        <RadioGroup
          value={bgmMode}
          onValueChange={(v) => setBgmMode(v as AudioSourceMode)}
          className="space-y-3"
        >
          <div className="space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="existing" disabled={bgmOptions.length === 0} />
              アップロード済みBGMから選択
              {bgmOptions.length === 0 && (
                <span className="text-[11px] text-muted-foreground">
                  (BGM提案ツールでアップロード可能)
                </span>
              )}
            </Label>
            {bgmMode === 'existing' && bgmOptions.length > 0 && (
              <Select value={selectedBgmAssetId} onValueChange={setSelectedBgmAssetId}>
                <SelectTrigger className="ml-6 w-[calc(100%-1.5rem)]">
                  <SelectValue placeholder="BGMを選択" />
                </SelectTrigger>
                <SelectContent>
                  {bgmOptions.map((opt) => (
                    <SelectItem key={opt.asset_id} value={opt.asset_id}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 cursor-pointer text-sm">
              <RadioGroupItem value="upload" />
              ファイルをアップロード
            </Label>
            {bgmMode === 'upload' && (
              <div className="ml-6 space-y-2">
                {!uploadedBgm ? (
                  <div
                    onClick={() => bgmInputRef.current?.click()}
                    className="rounded-lg border-2 border-dashed p-4 text-center text-xs text-muted-foreground cursor-pointer hover:border-secondary hover:bg-secondary-wash/20 transition-colors"
                  >
                    {bgmUploading ? (
                      <span className="flex items-center justify-center gap-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> アップロード中...
                      </span>
                    ) : (
                      <>
                        <Upload className="h-4 w-4 mx-auto mb-1" />
                        MP3 / WAV / M4A をクリックして選択 (最大20MB)
                      </>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 rounded-md border bg-muted/30 px-3 py-2 text-xs">
                    <Music className="h-3.5 w-3.5 text-secondary" />
                    <span className="flex-1 truncate">{uploadedBgm.name}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setUploadedBgm(null)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
                <input
                  ref={bgmInputRef}
                  type="file"
                  accept="audio/mpeg,audio/mp3,audio/wav,audio/x-wav,audio/x-m4a,audio/mp4"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleBgmUpload(f);
                    e.target.value = '';
                  }}
                />
              </div>
            )}
          </div>

          <Label className="flex items-center gap-2 cursor-pointer text-sm">
            <RadioGroupItem value="none" />
            BGMなし
          </Label>
        </RadioGroup>
      </div>

      {/* === 実行 === */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isRunning || narrationUploading || bgmUploading}
        className="w-full h-12"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Vコン生成中...
          </>
        ) : (
          <>
            <Clapperboard className="h-4 w-4 mr-2" /> Vコンを生成
          </>
        )}
      </Button>

      {/* === Picker === */}
      <CompositionPickerDialog
        projectId={projectId}
        open={compPickerOpen}
        onOpenChange={setCompPickerOpen}
        onPick={(scenes: CompositionScene[], jobInfo: CompositionJobRow) => {
          const text = scenes
            .map((s) => {
              const head = `${s.part ?? ''}${s.time_range ? ` (${s.time_range})` : ''}:`;
              const lines = [head];
              if (s.telop) lines.push(`  テロップ: ${s.telop}`);
              if (s.visual) lines.push(`  映像: ${s.visual}`);
              if (s.narration) lines.push(`  ナレーション: ${s.narration}`);
              return lines.join('\n');
            })
            .join('\n\n');
          setComposition(text);
          setCompositionJobId(jobInfo.id);
          setCompPickerOpen(false);
          toast.success('構成案を読み込みました');
        }}
      />
    </div>
  );
};

export default VConSettings;
