import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ListChecks,
  Clapperboard,
  Download,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Film,
} from 'lucide-react';
import { Link } from 'react-router-dom';
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  { label: 'Vコン設計' },
];

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-vcon';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
}

interface VconAsset {
  id: string;
  asset_type: string;
  file_url: string;
  metadata: Record<string, any> | null;
}

interface CompositionJobRow {
  id: string;
  created_at: string | null;
  output_data: Record<string, unknown> | null;
}

interface NarrationScriptJobRow {
  id: string;
  created_at: string | null;
  output_data: Record<string, unknown> | null;
}

interface AppealAxisJobRow {
  id: string;
  created_at: string | null;
  output_data: Record<string, unknown> | null;
}

interface VconCut {
  cut_number: number;
  start_seconds: number;
  end_seconds: number;
  duration_seconds: number;
  section?: string;
  text_overlay?: string;
  narration?: string;
  visual_direction?: string;
  text_position?: string;
  text_size?: string;
  transition?: string;
  annotations?: string[];
}

const formatTimeRange = (start: number, end: number) =>
  `${start.toFixed(1)}-${end.toFixed(1)}s`;

const VConTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5
  const [composition, setComposition] = useState('');
  const [narrationScript, setNarrationScript] = useState('');
  const [appealAxis, setAppealAxis] = useState('');
  const [copyText, setCopyText] = useState('');
  const [durationSeconds, setDurationSeconds] = useState<15 | 30 | 60>(30);
  const [creativeType, setCreativeType] = useState<'video' | 'banner'>('video');

  // Pickers
  const [compPickerOpen, setCompPickerOpen] = useState(false);
  const [compJobs, setCompJobs] = useState<CompositionJobRow[]>([]);
  const [compPickerLoading, setCompPickerLoading] = useState(false);

  const [naPickerOpen, setNaPickerOpen] = useState(false);
  const [naJobs, setNaJobs] = useState<NarrationScriptJobRow[]>([]);
  const [naPickerLoading, setNaPickerLoading] = useState(false);

  const [axisPickerOpen, setAxisPickerOpen] = useState(false);
  const [axisJobs, setAxisJobs] = useState<AppealAxisJobRow[]>([]);
  const [axisPickerLoading, setAxisPickerLoading] = useState(false);

  // Job
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<VconAsset[]>([]);
  const [expandedCuts, setExpandedCuts] = useState<Set<number>>(new Set());

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
        return composition.trim().length > 0 || narrationScript.trim().length > 0;
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

  // ---- Pickers loaders ----
  const loadCompositionJobs = async () => {
    if (!state.projectId) return;
    setCompPickerLoading(true);
    try {
      const { data } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'composition')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setCompJobs((data ?? []) as CompositionJobRow[]);
    } finally {
      setCompPickerLoading(false);
    }
  };

  const loadNarrationScriptJobs = async () => {
    if (!state.projectId) return;
    setNaPickerLoading(true);
    try {
      const { data } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'narration_script')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setNaJobs((data ?? []) as NarrationScriptJobRow[]);
    } finally {
      setNaPickerLoading(false);
    }
  };

  const loadAxisJobs = async () => {
    if (!state.projectId) return;
    setAxisPickerLoading(true);
    try {
      const { data } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'appeal_axis')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);
      setAxisJobs((data ?? []) as AppealAxisJobRow[]);
    } finally {
      setAxisPickerLoading(false);
    }
  };

  const handlePickComposition = (j: CompositionJobRow) => {
    const out = j.output_data as any;
    const text =
      typeof out?.composition === 'string'
        ? out.composition
        : typeof out?.text === 'string'
        ? out.text
        : typeof out?.script === 'string'
        ? out.script
        : JSON.stringify(out, null, 2);
    setComposition(text);
    setCompPickerOpen(false);
    toast.success('構成案を読み込みました');
  };

  const handlePickNarrationScript = (j: NarrationScriptJobRow) => {
    const out = j.output_data as any;
    const text =
      typeof out?.narration_script === 'string'
        ? out.narration_script
        : typeof out?.script === 'string'
        ? out.script
        : typeof out?.text === 'string'
        ? out.text
        : JSON.stringify(out, null, 2);
    setNarrationScript(text);
    setNaPickerOpen(false);
    toast.success('NA原稿を読み込みました');
  };

  const handlePickAxis = (j: AppealAxisJobRow, idx: number) => {
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

  // ---- Generate ----
  const handleGenerate = async () => {
    if (!state.projectId || !user || !canProceed()) return;

    const relevantRules =
      context?.rules.filter((r) =>
        ['vcon', 'script', 'storyboard'].some((t) => r.process_type.includes(t))
      ) ?? [];

    const payload = {
      project_id: state.projectId,
      tool_type: 'vcon',
      input_data: {
        composition: composition || null,
        narration_script: narrationScript || null,
        appeal_axis: appealAxis || null,
        copy_text: copyText || null,
        duration_seconds: durationSeconds,
        creative_type: creativeType,
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
    setExpandedCuts(new Set());

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_job_id: newJob.id,
        project_id: state.projectId,
        composition: composition || null,
        narration_script: narrationScript || null,
        appeal_axis: appealAxis || null,
        copy_text: copyText || null,
        duration_seconds: durationSeconds,
        creative_type: creativeType,
        copyright_text: context?.project.copyright_text ?? null,
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

    toast.success('Vコン生成を開始しました');
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
          .eq('asset_type', 'vcon'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as VconAsset[]);
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

  const cuts: VconCut[] =
    (assets[0]?.metadata as any)?.cuts ??
    (job?.output_data as any)?.cuts ??
    [];

  const totalCuts = cuts.length;

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

  // Ad Brain reference rule counts
  const scriptRules = context?.rules.filter((r) =>
    ['vcon', 'script', 'storyboard'].some((t) => r.process_type.includes(t))
  );

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display flex items-center gap-2">
          <Clapperboard className="h-6 w-6 text-secondary" /> Vコン作成
        </h1>
        <p className="text-sm text-muted-foreground">
          構成案・NA原稿からカット単位のテロップ設計書(Vコン)を生成します
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
              <h2 className="text-xl font-bold font-display tracking-tight">Vコンを設計</h2>

              {/* === 入力ソース === */}
              <div className="rounded-xl border bg-card p-4 space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-bold">構成案</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCompPickerOpen(true);
                        loadCompositionJobs();
                      }}
                    >
                      <ListChecks className="h-3.5 w-3.5 mr-1" /> 構成案生成から読み込み
                    </Button>
                  </div>
                  <Textarea
                    value={composition}
                    onChange={(e) => setComposition(e.target.value)}
                    placeholder="構成案・字コンテをここに貼り付け（または上のボタンから読み込み）"
                    className="min-h-[120px] text-sm"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-sm font-bold">NA原稿</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setNaPickerOpen(true);
                        loadNarrationScriptJobs();
                      }}
                    >
                      <ListChecks className="h-3.5 w-3.5 mr-1" /> NA原稿生成から読み込み
                    </Button>
                  </div>
                  <Textarea
                    value={narrationScript}
                    onChange={(e) => setNarrationScript(e.target.value)}
                    placeholder="ナレーション原稿をここに貼り付け"
                    className="min-h-[100px] text-sm"
                  />
                </div>

                <div className="text-[11px] text-muted-foreground">
                  ※ 構成案 / NA原稿のいずれか1つは必須。両方あると精度UP
                </div>
              </div>

              {/* === 訴求軸/コピー === */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-bold">訴求軸・コピー (任意)</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setAxisPickerOpen(true);
                      loadAxisJobs();
                    }}
                  >
                    <ListChecks className="h-3.5 w-3.5 mr-1" /> 訴求軸生成から1パターン選ぶ
                  </Button>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs">訴求軸</Label>
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
              </div>

              {/* === 動画設定 === */}
              <div className="rounded-xl border bg-card p-4 space-y-3">
                <Label className="text-sm font-bold">動画設定</Label>
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-xs">動画尺</Label>
                    <RadioGroup
                      value={String(durationSeconds)}
                      onValueChange={(v) => setDurationSeconds(Number(v) as 15 | 30 | 60)}
                      className="flex gap-3"
                    >
                      {[15, 30, 60].map((d) => (
                        <Label
                          key={d}
                          className={cn(
                            'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
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
                      className="flex gap-3"
                    >
                      {(['video', 'banner'] as const).map((t) => (
                        <Label
                          key={t}
                          className={cn(
                            'flex items-center gap-1.5 text-xs cursor-pointer rounded-md border px-3 py-1.5',
                            creativeType === t && 'border-secondary bg-secondary-wash/40'
                          )}
                        >
                          <RadioGroupItem value={t} /> {t === 'video' ? '動画' : 'バナー'}
                        </Label>
                      ))}
                    </RadioGroup>
                  </div>
                </div>
              </div>

              {/* === Ad Brain 参照 === */}
              {context && (
                <div className="rounded-xl border border-secondary/30 bg-secondary-wash/30 p-3">
                  <div className="text-[11px] font-semibold text-secondary mb-1">
                    📚 Ad Brain 参照情報
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>
                      関連ルール: <strong className="text-foreground">{scriptRules?.length ?? 0}件</strong>{' '}
                      (vcon/script/storyboard)
                    </span>
                    <span>
                      参考資料: <strong className="text-foreground">{context.materials.length}件</strong>
                    </span>
                  </div>
                </div>
              )}

              {/* === 実行 === */}
              <Button
                onClick={handleGenerate}
                disabled={!canProceed() || isRunning}
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

              {/* === 結果 === */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-sm">生成結果</h3>
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
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>
                          動画尺: <strong className="text-foreground">{durationSeconds}秒</strong> / 合計{' '}
                          <strong className="text-foreground">{totalCuts}カット</strong>
                        </span>
                        <div className="flex gap-1.5">
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
                      </div>

                      <div className="rounded-lg border overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12 text-center">#</TableHead>
                              <TableHead className="w-24">時間</TableHead>
                              <TableHead className="w-16 text-center">秒</TableHead>
                              <TableHead className="w-28">セクション</TableHead>
                              <TableHead>テロップ</TableHead>
                              <TableHead>ナレーション</TableHead>
                              <TableHead className="w-8"></TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {cuts.map((cut) => {
                              const expanded = expandedCuts.has(cut.cut_number);
                              return (
                                <>
                                  <TableRow
                                    key={`row-${cut.cut_number}`}
                                    className="cursor-pointer"
                                    onClick={() => toggleCut(cut.cut_number)}
                                  >
                                    <TableCell className="text-center font-bold tabular-nums text-secondary">
                                      {cut.cut_number}
                                    </TableCell>
                                    <TableCell className="text-xs tabular-nums">
                                      {formatTimeRange(cut.start_seconds, cut.end_seconds)}
                                    </TableCell>
                                    <TableCell className="text-center text-xs tabular-nums">
                                      {cut.duration_seconds.toFixed(1)}s
                                    </TableCell>
                                    <TableCell className="text-xs">
                                      {cut.section ?? '-'}
                                    </TableCell>
                                    <TableCell className="text-xs font-medium">
                                      {cut.text_overlay || (
                                        <span className="text-muted-foreground/60">(なし)</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-xs text-muted-foreground">
                                      {cut.narration ? (
                                        cut.narration.length > 30
                                          ? cut.narration.slice(0, 30) + '...'
                                          : cut.narration
                                      ) : (
                                        <span className="text-muted-foreground/60">(なし)</span>
                                      )}
                                    </TableCell>
                                    <TableCell className="text-center">
                                      {expanded ? (
                                        <ChevronDown className="h-3.5 w-3.5 inline" />
                                      ) : (
                                        <ChevronRight className="h-3.5 w-3.5 inline" />
                                      )}
                                    </TableCell>
                                  </TableRow>
                                  {expanded && (
                                    <TableRow
                                      key={`detail-${cut.cut_number}`}
                                      className="bg-muted/30"
                                    >
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
                    </>
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
                  const preview =
                    typeof (j.output_data as any)?.composition === 'string'
                      ? (j.output_data as any).composition.slice(0, 80)
                      : '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickComposition(j)}
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
                      onClick={() => handlePickNarrationScript(j)}
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
    </div>
  );
};

export default VConTool;
