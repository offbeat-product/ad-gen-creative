import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Download,
  RefreshCw,
  ListChecks,
  Camera,
  Layers,
  Sparkles,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SpotStepClient from '@/components/spot/SpotStepClient';
import SpotStepProduct from '@/components/spot/SpotStepProduct';
import SpotStepProject from '@/components/spot/SpotStepProject';
import SpotStepDataCollection from '@/components/spot/SpotStepDataCollection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: '画像生成設定' },
];

const DURATION_OPTIONS = [15, 30, 60] as const;

const STYLE_OPTIONS = [
  { value: 'photographic', label: '実写・リアル', icon: Camera, description: '写真のような表現' },
  { value: 'motion_graphics', label: 'フラットデザイン', icon: Layers, description: 'モーショングラフィックス' },
  { value: 'hybrid', label: 'ハイブリッド', icon: Sparkles, description: '実写×グラフィックス' },
] as const;

const ASPECT_OPTIONS = [
  { value: 'landscape_16_9', label: '横長 16:9', preview: 'aspect-video' },
  { value: 'portrait_9_16', label: '縦長 9:16', preview: 'aspect-[9/16]' },
  { value: 'square_1_1', label: '正方形 1:1', preview: 'aspect-square' },
] as const;

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-image-generation';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface SceneAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    section?: string;
    duration_seconds?: number;
    telop?: string;
    time_range?: string;
    visual?: string;
    scene_index?: number;
  } | null;
}

interface CompositionJobRow {
  id: string;
  created_at: string | null;
  input_data: Record<string, unknown> | null;
}

interface CompositionScene {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

const ImageGenerationTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [composition, setComposition] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [creativeStyle, setCreativeStyle] = useState<string>('photographic');
  const [aspectRatio, setAspectRatio] = useState<string>('landscape_16_9');

  // 構成案ピッカー
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pastJobs, setPastJobs] = useState<Array<CompositionJobRow & { scenes: CompositionScene[] }>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // 画像拡大
  const [zoomedAsset, setZoomedAsset] = useState<SceneAsset | null>(null);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SceneAsset[]>([]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return state.clientId !== null;
      case 1:
        return state.productId !== null;
      case 2:
        return state.projectId !== null;
      case 3:
        return true;
      case 4:
        return composition.trim().length > 0;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const imageRules =
    context?.rules.filter((r) =>
      ['styleframe', 'storyboard', 'video_horizontal', 'video_vertical'].includes(r.process_type)
    ) ?? [];

  // 過去の構成案ジョブを取得
  const loadPastCompositions = async () => {
    if (!state.projectId) return;
    setPickerLoading(true);
    try {
      const { data: jobs, error: jobsErr } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, input_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'composition')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (jobsErr || !jobs) {
        toast.error('過去の構成案の取得に失敗しました');
        return;
      }

      if (jobs.length === 0) {
        setPastJobs([]);
        return;
      }

      const jobIds = jobs.map((j) => j.id);
      const { data: assetRows } = await supabase
        .from('gen_spot_assets')
        .select('job_id, metadata')
        .in('job_id', jobIds);

      const scenesByJob = new Map<string, CompositionScene[]>();
      (assetRows ?? []).forEach((row: any) => {
        const scenes = row.metadata?.scenes as CompositionScene[] | undefined;
        if (scenes && Array.isArray(scenes)) {
          scenesByJob.set(row.job_id, scenes);
        }
      });

      setPastJobs(
        jobs.map((j) => ({
          ...(j as CompositionJobRow),
          scenes: scenesByJob.get(j.id) ?? [],
        }))
      );
    } finally {
      setPickerLoading(false);
    }
  };

  const formatScenesAsText = (scenes: CompositionScene[]): string => {
    return scenes
      .map((s) => {
        const head = `${s.part}${s.time_range ? ` (${s.time_range})` : ''}:`;
        const lines = [head];
        if (s.telop) lines.push(`  テロップ: ${s.telop}`);
        if (s.visual) lines.push(`  映像: ${s.visual}`);
        if (s.narration) lines.push(`  ナレーション: ${s.narration}`);
        return lines.join('\n');
      })
      .join('\n\n');
  };

  const handlePickComposition = (scenes: CompositionScene[]) => {
    setComposition(formatScenesAsText(scenes));
    setPickerOpen(false);
    toast.success('字コンテを読み込みました');
  };

  const handleGenerate = async () => {
    if (!state.projectId || !user || !composition.trim()) return;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert({
        project_id: state.projectId,
        tool_type: 'image_generation',
        input_data: {
          composition,
          duration_seconds: duration,
          creative_style: creativeStyle,
          aspect_ratio: aspectRatio,
        },
        status: 'pending',
        created_by: user.id,
      })
      .select()
      .single();

    if (jobError || !newJob) {
      toast.error(`生成開始に失敗: ${jobError?.message ?? 'unknown'}`);
      return;
    }

    setJobId(newJob.id);
    setJob(newJob as SpotJob);
    setAssets([]);

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_job_id: newJob.id,
        project_id: state.projectId,
        composition,
        duration_seconds: duration,
        creative_style: creativeStyle,
        aspect_ratio: aspectRatio,
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: imageRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('画像生成を開始しました');
  };

  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase.from('gen_spot_assets').select('*').eq('job_id', jobId).order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as SceneAsset[]);
    };

    refetch();

    const channel = supabase
      .channel(`spot-job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gen_spot_jobs', filter: `id=eq.${jobId}` },
        refetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gen_spot_assets', filter: `job_id=eq.${jobId}` },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';
  const totalDuration = assets.reduce(
    (sum, a) => sum + (a.metadata?.duration_seconds ?? 0),
    0
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">🎨 絵コンテ用画像生成</h1>
        <p className="text-sm text-muted-foreground">
          字コンテからシーンごとに絵コンテ用画像を一括生成します
        </p>
      </div>

      {/* ステップインジケータ */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => goToStep(i)}
                disabled={i > currentStep}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                  i < currentStep && 'bg-secondary text-secondary-foreground cursor-pointer hover:opacity-80',
                  i === currentStep && 'bg-secondary text-secondary-foreground ring-4 ring-secondary-wash scale-110',
                  i > currentStep && 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 -mt-6',
                  i < currentStep ? 'bg-secondary' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">
          ステップ {currentStep + 1}/{STEPS.length}
        </span>
        <span className="text-sm font-medium">{STEPS[currentStep].label}</span>
      </div>

      {/* ステップコンテンツ */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && <SpotStepClient state={state} updateState={updateState} />}
          {currentStep === 1 && (
            <SpotStepProduct state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 2 && (
            <SpotStepProject state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 3 && <SpotStepDataCollection state={state} onComplete={goNext} />}
          {currentStep === 4 && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold font-display tracking-tight">画像生成を設定</h2>

              {/* Ad Brain 参照情報 */}
              {context && (
                <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Ad Brain 参照
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">
                      🎨 画像関連ルール {imageRules.length}件
                    </span>
                    {context.corrections && context.corrections.length > 0 && (
                      <span className="text-foreground">
                        🔁 修正パターン {context.corrections.length}件
                      </span>
                    )}
                    {context.project.copyright_text && (
                      <span className="text-muted-foreground">
                        © {context.project.copyright_text}
                      </span>
                    )}
                  </div>
                </div>
              )}

              {/* 字コンテ */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="composition">字コンテ</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setPickerOpen(true);
                      loadPastCompositions();
                    }}
                  >
                    <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                    構成案生成の結果から選択
                  </Button>
                </div>
                <Textarea
                  id="composition"
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  placeholder={`冒頭 (0:00-0:05):\n  テロップ: 今すぐ読める話題作\n  映像: 主人公が驚く表情\n前半 (0:05-0:15):\n  ...`}
                  className="min-h-[180px] font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  映像業界の1シーン最大3秒・12文字ルールに従って自動でシーン分割されます
                </p>
              </div>

              {/* 動画尺 */}
              <div className="space-y-3">
                <Label>動画尺</Label>
                <RadioGroup
                  value={String(duration)}
                  onValueChange={(v) => setDuration(Number(v))}
                  className="grid grid-cols-3 gap-3"
                >
                  {DURATION_OPTIONS.map((sec) => (
                    <Label
                      key={sec}
                      htmlFor={`dur-${sec}`}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                        duration === sec && 'border-secondary ring-2 ring-secondary/30'
                      )}
                    >
                      <RadioGroupItem value={String(sec)} id={`dur-${sec}`} className="sr-only" />
                      <Clock className="h-4 w-4 text-secondary" />
                      <span className="font-semibold">{sec}秒</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* ビジュアルスタイル */}
              <div className="space-y-3">
                <Label>ビジュアルスタイル</Label>
                <RadioGroup
                  value={creativeStyle}
                  onValueChange={setCreativeStyle}
                  className="grid grid-cols-1 md:grid-cols-3 gap-3"
                >
                  {STYLE_OPTIONS.map((s) => (
                    <Label
                      key={s.value}
                      htmlFor={`style-${s.value}`}
                      className={cn(
                        'flex flex-col items-start gap-1.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                        creativeStyle === s.value && 'border-secondary ring-2 ring-secondary/30'
                      )}
                    >
                      <RadioGroupItem value={s.value} id={`style-${s.value}`} className="sr-only" />
                      <div className="flex items-center gap-2">
                        <s.icon className="h-4 w-4 text-secondary" />
                        <span className="font-semibold text-sm">{s.label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{s.description}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* 画像サイズ */}
              <div className="space-y-3">
                <Label>画像サイズ</Label>
                <RadioGroup
                  value={aspectRatio}
                  onValueChange={setAspectRatio}
                  className="grid grid-cols-3 gap-3"
                >
                  {ASPECT_OPTIONS.map((a) => (
                    <Label
                      key={a.value}
                      htmlFor={`ar-${a.value}`}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                        aspectRatio === a.value && 'border-secondary ring-2 ring-secondary/30'
                      )}
                    >
                      <RadioGroupItem value={a.value} id={`ar-${a.value}`} className="sr-only" />
                      <div
                        className={cn(
                          'w-12 bg-secondary/30 border border-secondary/50 rounded',
                          a.preview
                        )}
                      />
                      <span className="text-xs font-semibold">{a.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* 実行ボタン */}
              <Button
                onClick={handleGenerate}
                disabled={!composition.trim() || isRunning}
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-4 w-4 mr-2" /> 画像を生成
                  </>
                )}
              </Button>

              {/* 生成結果 */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">生成結果</h3>
                    <span className="text-xs">
                      {job.status === 'pending' && (
                        <span className="text-muted-foreground">待機中...</span>
                      )}
                      {job.status === 'running' && <span className="text-warning">処理中...</span>}
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
                  </div>

                  {isRunning && <Progress value={job.status === 'running' ? 60 : 20} />}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {assets.length > 0 && (
                    <>
                      <div className="text-xs text-muted-foreground">
                        合計 {assets.length} シーン / 合計 {totalDuration.toFixed(1)} 秒
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                        {assets.map((asset, idx) => {
                          const meta = asset.metadata ?? {};
                          return (
                            <div
                              key={asset.id}
                              className="rounded-lg border bg-background overflow-hidden flex flex-col"
                            >
                              <button
                                type="button"
                                onClick={() => setZoomedAsset(asset)}
                                className="block w-full aspect-video bg-muted relative group"
                              >
                                <img
                                  src={asset.file_url}
                                  alt={meta.telop ?? `シーン${idx + 1}`}
                                  className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                                  loading="lazy"
                                />
                                <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded">
                                  #{idx + 1}
                                </div>
                              </button>
                              <div className="p-2.5 space-y-1.5 text-xs flex-1 flex flex-col">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold truncate">
                                    {meta.section ?? `シーン${idx + 1}`}
                                  </span>
                                  {meta.duration_seconds != null && (
                                    <span className="text-muted-foreground tabular-nums shrink-0">
                                      {meta.duration_seconds}秒
                                    </span>
                                  )}
                                </div>
                                {meta.time_range && (
                                  <div className="text-muted-foreground text-[10px]">
                                    {meta.time_range}
                                  </div>
                                )}
                                {meta.telop && (
                                  <div className="text-foreground line-clamp-2 flex-1">
                                    「{meta.telop}」
                                  </div>
                                )}
                                <div className="flex gap-1 pt-1">
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs flex-1"
                                    onClick={() =>
                                      console.log('[regenerate] asset:', asset.id)
                                    }
                                  >
                                    <RefreshCw className="h-3 w-3" />
                                  </Button>
                                  <a
                                    href={asset.file_url}
                                    download={asset.file_name ?? `scene-${idx + 1}.png`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center justify-center h-7 px-2 text-xs flex-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                                  >
                                    <Download className="h-3 w-3" />
                                  </a>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* 構成案ピッカーモーダル */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>過去の構成案から選択</DialogTitle>
            <DialogDescription>
              この案件で過去に生成された構成案を読み込みます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {pickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : pastJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みの構成案がありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {pastJobs.map((j) => {
                  const inputAxis = (j.input_data as any)?.appeal_axis as string | undefined;
                  const inputCopy = (j.input_data as any)?.copy_text as string | undefined;
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickComposition(j.scenes)}
                      disabled={j.scenes.length === 0}
                      className={cn(
                        'w-full text-left rounded-lg border bg-card p-3 transition-all',
                        j.scenes.length > 0
                          ? 'hover:border-secondary hover:shadow-sm cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{created}</span>
                        <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                          {j.scenes.length}シーン
                        </span>
                      </div>
                      {inputAxis && (
                        <div className="text-sm font-medium truncate">
                          訴求軸: {inputAxis}
                        </div>
                      )}
                      {inputCopy && (
                        <div className="text-xs text-muted-foreground truncate">
                          コピー: {inputCopy}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* 画像拡大モーダル */}
      <Dialog open={!!zoomedAsset} onOpenChange={(o) => !o && setZoomedAsset(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setZoomedAsset(null)}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground/90"
          >
            <X className="h-4 w-4" />
          </button>
          {zoomedAsset && (
            <div className="space-y-0">
              <img
                src={zoomedAsset.file_url}
                alt={zoomedAsset.metadata?.telop ?? ''}
                className="w-full max-h-[75vh] object-contain bg-muted"
              />
              <div className="p-4 space-y-1.5 text-sm border-t">
                {zoomedAsset.metadata?.section && (
                  <div className="font-semibold">{zoomedAsset.metadata.section}</div>
                )}
                {zoomedAsset.metadata?.time_range && (
                  <div className="text-xs text-muted-foreground">
                    {zoomedAsset.metadata.time_range}
                    {zoomedAsset.metadata.duration_seconds != null &&
                      ` / ${zoomedAsset.metadata.duration_seconds}秒`}
                  </div>
                )}
                {zoomedAsset.metadata?.telop && (
                  <div className="text-sm">テロップ: 「{zoomedAsset.metadata.telop}」</div>
                )}
                {zoomedAsset.metadata?.visual && (
                  <div className="text-xs text-muted-foreground">
                    映像: {zoomedAsset.metadata.visual}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageGenerationTool;
