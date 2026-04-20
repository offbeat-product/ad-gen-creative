import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Music,
  ExternalLink,
  Sparkles,
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
  { label: 'BGM提案' },
];

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-bgm-suggestion';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
}

interface BgmAsset {
  id: string;
  asset_type: string;
  metadata: Record<string, any> | null;
}

interface BgmSuggestion {
  rank: number;
  mood?: string;
  genre?: string;
  theme?: string;
  tempo?: string;
  vocals?: string;
  description?: string;
  reason?: string;
  search_url?: string;
}

interface JobRow {
  id: string;
  created_at: string | null;
  output_data: Record<string, unknown> | null;
}

const BgmSuggestionTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5
  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [composition, setComposition] = useState('');
  const [narrationScript, setNarrationScript] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 60>(30);
  const [creativeType, setCreativeType] = useState<'video' | 'banner'>('video');
  const [numSuggestions, setNumSuggestions] = useState(3);

  // Pickers
  const [axisPickerOpen, setAxisPickerOpen] = useState(false);
  const [axisJobs, setAxisJobs] = useState<JobRow[]>([]);
  const [axisPickerLoading, setAxisPickerLoading] = useState(false);

  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [compJobs, setCompJobs] = useState<JobRow[]>([]);
  const [compPickerLoading, setCompPickerLoading] = useState(false);

  const [naPickerOpen, setNaPickerOpen] = useState(false);
  const [naJobs, setNaJobs] = useState<JobRow[]>([]);
  const [naPickerLoading, setNaPickerLoading] = useState(false);

  // Job
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<BgmAsset[]>([]);

  const hasInput =
    appealAxis.trim().length > 0 ||
    copyText.trim().length > 0 ||
    composition.trim().length > 0 ||
    narrationScript.trim().length > 0;

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
        return hasInput;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  }, []);
  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  // ---- Picker loaders ----
  const loadJobsByType = async (
    toolType: string,
    setter: (rows: JobRow[]) => void,
    setLoading: (b: boolean) => void
  ) => {
    if (!state.projectId) return;
    setLoading(true);
    try {
      const { data } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', toolType)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setter((data ?? []) as JobRow[]);
    } finally {
      setLoading(false);
    }
  };

  const handlePickAxis = (j: JobRow, idx: number) => {
    const out = j.output_data as any;
    const patterns = out?.patterns ?? out?.axes ?? [];
    if (Array.isArray(patterns) && patterns[idx]) {
      const p = patterns[idx];
      setAppealAxis(p.appeal_axis ?? p.axis ?? p.title ?? '');
      setCopyText(p.copy ?? p.copy_text ?? p.headline ?? '');
    }
    setAxisPickerOpen(false);
    toast.success('訴求軸・コピーを読み込みました');
  };

  const handlePickComp = (j: JobRow) => {
    const out = j.output_data as any;
    const text =
      typeof out?.composition === 'string'
        ? out.composition
        : typeof out?.text === 'string'
        ? out.text
        : JSON.stringify(out, null, 2);
    setComposition(text);
    setCompPickerOpen(false);
    toast.success('構成案を読み込みました');
  };

  const handlePickNa = (j: JobRow) => {
    const out = j.output_data as any;
    const text =
      typeof out?.narration_script === 'string'
        ? out.narration_script
        : typeof out?.script === 'string'
        ? out.script
        : JSON.stringify(out, null, 2);
    setNarrationScript(text);
    setNaPickerOpen(false);
    toast.success('NA原稿を読み込みました');
  };

  // ---- Generate ----
  const handleGenerate = async () => {
    if (!state.projectId || !user || !hasInput) return;

    const relevantRules =
      context?.rules.filter((r) => r.process_type.includes('bgm')) ?? [];

    const payload = {
      project_id: state.projectId,
      tool_type: 'bgm_suggestion',
      input_data: {
        appeal_axis: appealAxis || null,
        copy_text: copyText || null,
        composition: composition || null,
        narration_script: narrationScript || null,
        duration_seconds: durationSeconds,
        creative_type: creativeType,
        num_suggestions: numSuggestions,
      },
      status: 'pending',
      created_by: user.id,
    } as any;

    const { data: newJob, error } = await supabase
      .from('gen_spot_jobs')
      .insert(payload)
      .select()
      .single();

    if (error || !newJob) {
      toast.error(`生成開始に失敗: ${error?.message ?? 'unknown'}`);
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
        appeal_axis: appealAxis || null,
        copy_text: copyText || null,
        composition: composition || null,
        narration_script: narrationScript || null,
        duration_seconds: durationSeconds,
        creative_type: creativeType,
        num_suggestions: numSuggestions,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: relevantRules.map((r) => ({
          rule_id: r.rule_id,
          title: r.title,
          description: r.description,
          severity: r.severity,
          category: r.category,
        })),
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('BGM提案の生成を開始しました');
  };

  // ---- Realtime ----
  useEffect(() => {
    if (!jobId) return;
    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .eq('asset_type', 'bgm_suggestion'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as BgmAsset[]);
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

  const suggestions: BgmSuggestion[] =
    (assets[0]?.metadata as any)?.bgm_suggestions ??
    (job?.output_data as any)?.bgm_suggestions ??
    [];

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Music className="h-6 w-6 text-secondary" /> BGM提案
        </h1>
        <p className="text-sm text-muted-foreground">
          広告内容に合うBGMの方向性を提案し、Envato Elements で楽曲を検索できます
        </p>
      </div>

      {/* Stepper */}
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
                BGM提案を生成
              </h2>

              {/* === 広告内容 === */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div>
                  <Label className="text-sm font-bold">広告内容 (最低1つ必須)</Label>
                  <div className="text-[11px] text-muted-foreground">
                    入力が多いほど精度が上がります
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">訴求軸</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={() => {
                          setAxisPickerOpen(true);
                          loadJobsByType('appeal_axis', setAxisJobs, setAxisPickerLoading);
                        }}
                      >
                        <ListChecks className="h-3 w-3 mr-1" /> 訴求軸生成から
                      </Button>
                    </div>
                    <Input
                      value={appealAxis}
                      onChange={(e) => setAppealAxis(e.target.value)}
                      placeholder="例: 時短×安心"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">コピー</Label>
                    <Input
                      value={copyText}
                      onChange={(e) => setCopyText(e.target.value)}
                      placeholder="例: 家族の予定を犠牲にしない働き方へ"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">構成案</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setCompPickerOpen(true);
                        loadJobsByType('composition', setCompJobs, setCompPickerLoading);
                      }}
                    >
                      <ListChecks className="h-3 w-3 mr-1" /> 構成案生成から
                    </Button>
                  </div>
                  <Textarea
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    placeholder="構成案・字コンテ"
                    className="min-h-[80px] text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs">NA原稿</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => {
                        setNaPickerOpen(true);
                        loadJobsByType('narration_script', setNaJobs, setNaPickerLoading);
                      }}
                    >
                      <ListChecks className="h-3 w-3 mr-1" /> NA原稿生成から
                    </Button>
                  </div>
                  <Textarea
                    value={narrationScript}
                    onChange={(e) => setNarrationScript(e.target.value)}
                    placeholder="ナレーション原稿"
                    className="min-h-[80px] text-sm"
                  />
                </div>
              </div>

              {/* === 設定 === */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <Label className="text-sm font-bold">設定</Label>
                <div className="grid md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">動画尺</Label>
                    <RadioGroup
                      value={String(durationSeconds)}
                      onValueChange={(v) => setDurationSeconds(Number(v) as 15 | 30 | 60)}
                      className="flex gap-2"
                    >
                      {[15, 30, 60].map((d) => (
                        <Label
                          key={d}
                          className={cn(
                            'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-2.5 py-1.5',
                            durationSeconds === d && 'border-secondary bg-secondary-wash/40'
                          )}
                        >
                          <RadioGroupItem value={String(d)} /> {d}秒
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">クリエイティブタイプ</Label>
                    <RadioGroup
                      value={creativeType}
                      onValueChange={(v) => setCreativeType(v as 'video' | 'banner')}
                      className="flex gap-2"
                    >
                      {(['video', 'banner'] as const).map((t) => (
                        <Label
                          key={t}
                          className={cn(
                            'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-2.5 py-1.5',
                            creativeType === t && 'border-secondary bg-secondary-wash/40'
                          )}
                        >
                          <RadioGroupItem value={t} /> {t === 'video' ? '動画' : 'バナー'}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">候補数</Label>
                    <Select
                      value={String(numSuggestions)}
                      onValueChange={(v) => setNumSuggestions(Number(v))}
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[1, 2, 3, 4, 5].map((n) => (
                          <SelectItem key={n} value={String(n)}>
                            {n}件
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* === 実行 === */}
              <Button
                onClick={handleGenerate}
                disabled={!canProceed() || isRunning}
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> BGM提案を生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> BGM提案を生成 ({numSuggestions}候補)
                  </>
                )}
              </Button>

              {/* === 結果 === */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">BGM候補</h3>
                    <span className="text-xs">
                      {job.status === 'pending' && (
                        <span className="text-muted-foreground">待機中...</span>
                      )}
                      {job.status === 'running' && (
                        <span className="text-warning">生成中</span>
                      )}
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

                  {isRunning && (
                    <div className="space-y-2">
                      <Progress value={undefined} className="animate-pulse" />
                      <div className="text-xs text-muted-foreground text-center">
                        🎵 BGM候補を生成中... 30秒ほどお待ちください
                      </div>
                    </div>
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {suggestions.length > 0 && (
                    <div className="space-y-3">
                      {suggestions.map((s, i) => (
                        <div
                          key={i}
                          className="rounded-lg border bg-background p-4 space-y-3 hover:shadow-sm transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                              {s.rank ?? i + 1}
                            </div>
                            <div className="text-xs font-semibold text-muted-foreground">
                              BGM候補
                            </div>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {s.mood && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-wash text-primary font-medium">
                                Mood: {s.mood}
                              </span>
                            )}
                            {s.genre && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary-wash text-secondary font-medium">
                                Genre: {s.genre}
                              </span>
                            )}
                            {s.theme && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                                Theme: {s.theme}
                              </span>
                            )}
                            {s.tempo && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                                Tempo: {s.tempo}
                              </span>
                            )}
                            {s.vocals && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                                Vocals: {s.vocals}
                              </span>
                            )}
                          </div>

                          {s.description && (
                            <div className="text-sm font-medium">「{s.description}」</div>
                          )}

                          {s.reason && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-semibold text-foreground">選定理由: </span>
                              {s.reason}
                            </div>
                          )}

                          {s.search_url && (
                            <a
                              href={s.search_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
                            >
                              <Music className="h-3.5 w-3.5 mr-1.5" /> Envato Elementsで曲を探す
                              <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {currentStep < 4 && (
        <div className="flex justify-end">
          <Button onClick={goNext} disabled={!canProceed()} size="lg">
            次へ <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      {/* === Pickers === */}
      <Dialog open={axisPickerOpen} onOpenChange={setAxisPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>訴求軸・コピーを選択</DialogTitle>
            <DialogDescription>パターンを1つ選んで読み込みます</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {axisPickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : axisJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みの訴求軸生成がありません
              </div>
            ) : (
              <div className="space-y-3 py-2">
                {axisJobs.map((j) => {
                  const out = j.output_data as any;
                  const patterns = out?.patterns ?? out?.axes ?? [];
                  if (!Array.isArray(patterns) || patterns.length === 0) return null;
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  return (
                    <div key={j.id} className="rounded-lg border bg-card p-3 space-y-2">
                      <div className="text-xs text-muted-foreground">{created}</div>
                      {patterns.map((p: any, idx: number) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handlePickAxis(j, idx)}
                          className="w-full text-left rounded border bg-background p-2 hover:border-secondary transition-all"
                        >
                          <div className="text-xs font-semibold text-secondary">
                            {p.appeal_axis ?? p.axis ?? p.title ?? `パターン ${idx + 1}`}
                          </div>
                          {(p.copy ?? p.copy_text ?? p.headline) && (
                            <div className="text-xs mt-0.5">
                              「{p.copy ?? p.copy_text ?? p.headline}」
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={compPickerOpen} onOpenChange={setCompPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>構成案から読み込み</DialogTitle>
            <DialogDescription>過去に生成された構成案を読み込みます</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {compPickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : compJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みの構成案がありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {compJobs.map((j) => {
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  const out = j.output_data as any;
                  const preview =
                    typeof out?.composition === 'string' ? out.composition.slice(0, 80) : '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickComp(j)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all"
                    >
                      <div className="text-xs text-muted-foreground">{created}</div>
                      {preview && (
                        <div className="text-xs mt-1 line-clamp-2">{preview}...</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={naPickerOpen} onOpenChange={setNaPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>NA原稿から読み込み</DialogTitle>
            <DialogDescription>過去に生成されたナレーション原稿を読み込みます</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {naPickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : naJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みのNA原稿がありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {naJobs.map((j) => {
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  const out = j.output_data as any;
                  const preview =
                    (typeof out?.narration_script === 'string' && out.narration_script.slice(0, 80)) ||
                    (typeof out?.script === 'string' && out.script.slice(0, 80)) ||
                    '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickNa(j)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all"
                    >
                      <div className="text-xs text-muted-foreground">{created}</div>
                      {preview && (
                        <div className="text-xs mt-1 line-clamp-2">{preview}...</div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BgmSuggestionTool;
