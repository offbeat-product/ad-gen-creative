import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Film,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: '構成案設定' },
];

const DURATION_OPTIONS = [15, 30, 60] as const;
const CREATIVE_TYPES = [
  { value: 'video', label: '動画' },
  { value: 'banner', label: 'バナー' },
] as const;

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-composition';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface Scene {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    scenes?: Scene[];
    appeal_axis?: string;
    copy_text?: string;
    duration_seconds?: number;
    creative_type?: string;
  } | null;
}

const CompositionTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [duration, setDuration] = useState<number>(30);
  const [creativeType, setCreativeType] = useState<string>('video');
  const [seedInfo, setSeedInfo] = useState<{
    pattern_id?: string;
    hook?: string;
  } | null>(null);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

  // 訴求軸・コピー生成ツールから渡された seed を消費
  useEffect(() => {
    const seedJson = sessionStorage.getItem('composition_seed');
    if (!seedJson) return;
    try {
      const seed = JSON.parse(seedJson);
      if (seed.client_id || seed.product_id || seed.project_id) {
        updateState({
          clientId: seed.client_id ?? null,
          productId: seed.product_id ?? null,
          projectId: seed.project_id ?? null,
        });
      }
      if (seed.appeal_axis_text) setAppealAxis(seed.appeal_axis_text);
      if (seed.copy_text) setCopyText(seed.copy_text);
      setSeedInfo({
        pattern_id: seed.pattern_id,
        hook: seed.copy_hook,
      });
      sessionStorage.removeItem('composition_seed');
      setCurrentStep(STEPS.length - 1);
      toast.info(
        `訴求軸「${seed.appeal_axis_text}」とコピー「${seed.copy_text}」を引き継ぎました`
      );
    } catch (e) {
      console.error('failed to parse composition_seed', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        return appealAxis.trim().length > 0 && copyText.trim().length > 0;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const compositionRules =
    context?.rules.filter((r) =>
      ['storyboard', 'script', 'video_horizontal', 'video_vertical'].includes(r.process_type)
    ) ?? [];

  const handleGenerate = async () => {
    if (!state.projectId || !user || !appealAxis.trim() || !copyText.trim()) return;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert({
        project_id: state.projectId,
        tool_type: 'composition',
        input_data: {
          appeal_axis: appealAxis,
          copy_text: copyText,
          duration_seconds: duration,
          creative_type: creativeType,
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
        appeal_axis: appealAxis,
        copy_text: copyText,
        duration_seconds: duration,
        creative_type: creativeType,
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: compositionRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('構成案の生成を開始しました');
  };

  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase.from('gen_spot_assets').select('*').eq('job_id', jobId).order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as SpotAsset[]);
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

  const handleCopy = async (text: string, label = 'コピーしました') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const formatScenesAsText = (scenes: Scene[]): string => {
    return scenes
      .map((s) => {
        const head = `${s.part}${s.time_range ? ` (${s.time_range})` : ''}`;
        const lines = [head];
        if (s.telop) lines.push(`テロップ: ${s.telop}`);
        if (s.visual) lines.push(`映像: ${s.visual}`);
        if (s.narration) lines.push(`ナレーション: ${s.narration}`);
        return lines.join('\n');
      })
      .join('\n\n');
  };

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">🎬 構成案・字コンテ生成</h1>
        <p className="text-sm text-muted-foreground">
          訴求軸とコピーから動画の構成案・字コンテを生成します
        </p>
      </div>

      {/* ステップインジケータ (デスクトップ) */}
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

      {/* モバイル用 */}
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
              <h2 className="text-xl font-bold font-display tracking-tight">
                訴求軸・コピー・尺を設定
              </h2>

              {/* Ad Brain 参照情報 */}
              {context && (
                <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Ad Brain 参照
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">
                      📋 構成案関連ルール {compositionRules.length}件
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

              {/* 引き継ぎ情報 */}
              {seedInfo && (
                <div className="rounded-xl border border-secondary/30 bg-secondary-wash/40 p-4 space-y-1">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    🔗 訴求軸・コピー生成ツールから引き継ぎ
                  </div>
                  {seedInfo.pattern_id && (
                    <div className="text-xs text-muted-foreground">
                      パターン: {seedInfo.pattern_id}
                    </div>
                  )}
                  {seedInfo.hook && (
                    <div className="text-xs text-muted-foreground">
                      💡 狙い: {seedInfo.hook}
                    </div>
                  )}
                </div>
              )}

              {/* 訴求軸 */}
              <div className="space-y-2">
                <Label htmlFor="appeal-axis">訴求軸</Label>
                <Input
                  id="appeal-axis"
                  value={appealAxis}
                  onChange={(e) => setAppealAxis(e.target.value)}
                  placeholder="例: 読み放題の圧倒的お得感"
                />
              </div>

              {/* コピー */}
              <div className="space-y-2">
                <Label htmlFor="copy-text">コピー</Label>
                <Input
                  id="copy-text"
                  value={copyText}
                  onChange={(e) => setCopyText(e.target.value)}
                  placeholder="例: 毎月お得に新しい物語と出会える"
                />
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

              {/* クリエイティブタイプ */}
              <div className="space-y-3">
                <Label>クリエイティブタイプ</Label>
                <RadioGroup
                  value={creativeType}
                  onValueChange={setCreativeType}
                  className="grid grid-cols-2 gap-3"
                >
                  {CREATIVE_TYPES.map((t) => (
                    <Label
                      key={t.value}
                      htmlFor={`type-${t.value}`}
                      className={cn(
                        'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                        creativeType === t.value && 'border-secondary ring-2 ring-secondary/30'
                      )}
                    >
                      <RadioGroupItem value={t.value} id={`type-${t.value}`} className="sr-only" />
                      <Film className="h-4 w-4 text-secondary" />
                      <span className="font-semibold">{t.label}</span>
                    </Label>
                  ))}
                </RadioGroup>
              </div>

              {/* 実行ボタン */}
              <Button
                onClick={handleGenerate}
                disabled={!appealAxis.trim() || !copyText.trim() || isRunning}
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <Film className="h-4 w-4 mr-2" /> 構成案を生成
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

                  {assets.length > 0 &&
                    assets.map((asset) => {
                      const scenes = asset.metadata?.scenes ?? [];
                      const assetDuration = asset.metadata?.duration_seconds ?? duration;

                      return (
                        <div key={asset.id} className="space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {assetDuration}秒
                              </span>
                              <span>シーン数: {scenes.length}</span>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleCopy(formatScenesAsText(scenes), '構成案をコピーしました')
                                }
                                disabled={scenes.length === 0}
                              >
                                <Copy className="h-3 w-3 mr-1" /> 全体コピー
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled
                                title="将来実装予定"
                              >
                                <ArrowRight className="h-3 w-3 mr-1" /> NA原稿生成へ
                              </Button>
                            </div>
                          </div>

                          {/* デスクトップ: テーブル */}
                          {scenes.length > 0 && (
                            <div className="hidden md:block rounded-lg border overflow-hidden">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead className="w-20">パート</TableHead>
                                    <TableHead className="w-24">時間</TableHead>
                                    <TableHead>テロップ</TableHead>
                                    <TableHead>映像指示</TableHead>
                                    <TableHead>ナレーション</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {scenes.map((s, idx) => (
                                    <TableRow key={idx}>
                                      <TableCell className="font-semibold align-top">
                                        {s.part}
                                      </TableCell>
                                      <TableCell className="text-xs text-muted-foreground align-top whitespace-nowrap">
                                        {s.time_range ?? '-'}
                                      </TableCell>
                                      <TableCell className="text-sm align-top whitespace-pre-wrap">
                                        {s.telop ?? '-'}
                                      </TableCell>
                                      <TableCell className="text-sm align-top whitespace-pre-wrap">
                                        {s.visual ?? '-'}
                                      </TableCell>
                                      <TableCell className="text-sm align-top whitespace-pre-wrap">
                                        {s.narration ?? '-'}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          )}

                          {/* モバイル: カード */}
                          {scenes.length > 0 && (
                            <div className="md:hidden grid gap-2">
                              {scenes.map((s, idx) => (
                                <div
                                  key={idx}
                                  className="rounded-lg border bg-card p-3 space-y-2"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-sm">{s.part}</span>
                                    {s.time_range && (
                                      <span className="text-xs text-muted-foreground">
                                        {s.time_range}
                                      </span>
                                    )}
                                  </div>
                                  {s.telop && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-muted-foreground">
                                        テロップ:{' '}
                                      </span>
                                      <span className="whitespace-pre-wrap">{s.telop}</span>
                                    </div>
                                  )}
                                  {s.visual && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-muted-foreground">
                                        映像:{' '}
                                      </span>
                                      <span className="whitespace-pre-wrap">{s.visual}</span>
                                    </div>
                                  )}
                                  {s.narration && (
                                    <div className="text-xs">
                                      <span className="font-semibold text-muted-foreground">
                                        ナレーション:{' '}
                                      </span>
                                      <span className="whitespace-pre-wrap">{s.narration}</span>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Next/Back ボタン */}
      {currentStep !== 3 && currentStep !== 4 && (
        <div className="flex justify-between pt-4">
          {currentStep > 0 ? (
            <Button variant="outline" onClick={goBack}>
              戻る
            </Button>
          ) : (
            <div />
          )}
          <Button onClick={goNext} disabled={!canProceed()} variant="brand">
            次へ
          </Button>
        </div>
      )}

      {currentStep === 4 && (
        <div className="flex justify-start pt-4">
          <Button variant="outline" onClick={goBack}>
            戻る
          </Button>
        </div>
      )}
    </div>
  );
};

export default CompositionTool;
