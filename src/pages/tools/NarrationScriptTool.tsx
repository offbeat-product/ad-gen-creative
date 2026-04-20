import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  FileText,
  Upload,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: '構成案・尺' },
];

const DURATION_OPTIONS = [15, 30, 60] as const;

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-narration-script';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface ScriptSection {
  part: string;
  time_range?: string;
  text: string;
}

interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    full_script?: string;
    char_count?: number;
    duration_seconds?: number;
    sections?: ScriptSection[];
  } | null;
}

const NarrationScriptTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [composition, setComposition] = useState('');
  const [duration, setDuration] = useState<number>(30);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);

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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith('.txt')) {
      const text = await file.text();
      setComposition(text);
      toast.success('テキストを読み込みました');
      return;
    }

    if (file.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setComposition(result.value);
        toast.success('docxからテキストを読み込みました');
      } catch (err) {
        toast.error('docxの読み込みに失敗しました');
        console.error(err);
      }
      return;
    }

    toast.error('対応形式: .txt, .docx');
  };

  const scriptRules =
    context?.rules.filter((r) =>
      ['script', 'na_script', 'narration'].includes(r.process_type)
    ) ?? [];

  const handleGenerate = async () => {
    if (!state.projectId || !user || !composition.trim()) return;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert({
        project_id: state.projectId,
        tool_type: 'narration_script',
        input_data: { composition, duration_seconds: duration },
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
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: scriptRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('NA原稿の生成を開始しました');
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

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">📝 NA原稿生成</h1>
        <p className="text-sm text-muted-foreground">
          構成案・字コンテからナレーション原稿を生成します
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
                構成案・動画尺を設定
              </h2>

              {/* Ad Brain 参照情報 */}
              {context && (
                <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Ad Brain 参照
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">
                      📋 NA関連ルール {scriptRules.length}件
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

              {/* 構成案 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>構成案・字コンテ</Label>
                  <label className="inline-flex items-center gap-1 text-xs text-secondary hover:underline cursor-pointer">
                    <Upload className="h-3 w-3" />
                    ファイルから読込(.txt / .docx)
                    <input
                      type="file"
                      accept=".txt,.docx"
                      className="hidden"
                      onChange={handleFileUpload}
                    />
                  </label>
                </div>
                <Textarea
                  value={composition}
                  onChange={(e) => setComposition(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                  placeholder={`例:\n冒頭 (0:00-0:05): テロップ: 今すぐ読みたくなる / 映像: 主人公が驚く表情\n前半 (0:05-0:15): ...`}
                />
                <p className="text-xs text-muted-foreground">
                  ※ パート(冒頭/前半/後半/締め)と時間レンジ、テロップ・映像の情報を含めてください
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
                    <FileText className="h-4 w-4 mr-2" /> NA原稿を生成
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
                      const fullScript = asset.metadata?.full_script ?? '';
                      const charCount = asset.metadata?.char_count ?? fullScript.length;
                      const sections = asset.metadata?.sections ?? [];
                      const assetDuration = asset.metadata?.duration_seconds ?? duration;

                      return (
                        <div key={asset.id} className="space-y-4">
                          {/* 全体スクリプト */}
                          <div className="rounded-lg border bg-accent/20 p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="inline-flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {assetDuration}秒
                                </span>
                                <span>文字数: {charCount}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(fullScript, '全体をコピーしました')}
                                disabled={!fullScript}
                              >
                                <Copy className="h-3 w-3 mr-1" /> 全体コピー
                              </Button>
                            </div>
                            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed">
                              {fullScript || '(原稿なし)'}
                            </pre>
                          </div>

                          {/* セクション別 */}
                          {sections.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                パート別
                              </div>
                              <div className="grid gap-2">
                                {sections.map((sec, idx) => (
                                  <div
                                    key={idx}
                                    className="rounded-lg border bg-card p-3 space-y-2"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="font-semibold text-foreground">
                                          {sec.part}
                                        </span>
                                        {sec.time_range && (
                                          <span className="text-muted-foreground">
                                            {sec.time_range}
                                          </span>
                                        )}
                                      </div>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() =>
                                          handleCopy(sec.text, `${sec.part}をコピーしました`)
                                        }
                                      >
                                        <Copy className="h-3 w-3" />
                                      </Button>
                                    </div>
                                    <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                      {sec.text}
                                    </p>
                                  </div>
                                ))}
                              </div>
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

export default NarrationScriptTool;
