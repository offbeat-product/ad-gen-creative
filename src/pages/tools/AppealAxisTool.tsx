import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Sparkles,
  Copy,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Code,
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
import BriefSection, { type BriefData, EMPTY_BRIEF } from '@/components/spot/BriefSection';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
  { label: '訴求軸・コピー設定' },
];

const COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

const N8N_WEBHOOK_URL =
  'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-appeal-axis-copy';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface CopyItem {
  appeal_axis_index: number;
  copy_index: number;
  text: string;
  hook?: string;
}

interface AppealAxisObj {
  text: string;
  reasoning?: string;
}

interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    appeal_axes?: (string | AppealAxisObj)[];
    copies?: CopyItem[];
    hint?: string;
  } | null;
}

const letterFor = (n: number) => String.fromCharCode(65 + n); // 0->A

const AppealAxisTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [numAppealAxes, setNumAppealAxes] = useState<number>(3);
  const [numCopies, setNumCopies] = useState<number>(3);
  const [hint, setHint] = useState('');
  const [briefData, setBriefData] = useState<BriefData>(EMPTY_BRIEF);
  const [lpScrapedContent, setLpScrapedContent] = useState<string | null>(null);

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
        return true;
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

  const relevantRules =
    context?.rules.filter((r) =>
      ['script', 'banner_draft', 'banner_design'].includes(r.process_type)
    ) ?? [];

  const handleGenerate = async () => {
    if (!state.projectId || !user) return;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert({
        project_id: state.projectId,
        tool_type: 'appeal_axis_copy',
        input_data: {
          num_appeal_axes: numAppealAxes,
          num_copies: numCopies,
          hint,
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
        num_appeal_axes: numAppealAxes,
        num_copies: numCopies,
        hint,
        brief: {
          ...briefData,
          lp_scraped_content: lpScrapedContent,
        },
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: relevantRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('訴求軸・コピーの生成を開始しました');
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
  const totalPatterns = numAppealAxes * numCopies;

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">✨ 訴求軸・コピー生成</h1>
        <p className="text-sm text-muted-foreground">
          訴求軸とそれに紐づく台本コピーを複数パターン生成します
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
                訴求軸・コピー数を設定
              </h2>

              {/* Ad Brain 参照情報 */}
              {context && (
                <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Ad Brain 参照
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">
                      📋 関連ルール {relevantRules.length}件
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

              {/* 広告ブリーフ */}
              {state.projectId && (
                <BriefSection
                  projectId={state.projectId}
                  value={briefData}
                  onChange={setBriefData}
                  onLpScrapedContentLoaded={setLpScrapedContent}
                />
              )}

              <Separator className="my-2" />

              {/* 訴求軸 / コピー数 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>訴求軸の数</Label>
                  <Select
                    value={String(numAppealAxes)}
                    onValueChange={(v) => setNumAppealAxes(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>各訴求軸あたりのコピー数</Label>
                  <Select
                    value={String(numCopies)}
                    onValueChange={(v) => setNumCopies(Number(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNT_OPTIONS.map((n) => (
                        <SelectItem key={n} value={String(n)}>
                          {n}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* プレビュー */}
              <Alert>
                <AlertDescription>
                  <span className="font-semibold text-foreground">
                    {numAppealAxes} × {numCopies} = 合計{totalPatterns}パターン
                  </span>
                  <span className="text-muted-foreground"> 生成されます</span>
                </AlertDescription>
              </Alert>

              {/* ヒント */}
              <div className="space-y-2">
                <Label htmlFor="hint">ヒント (任意)</Label>
                <Textarea
                  id="hint"
                  value={hint}
                  onChange={(e) => setHint(e.target.value)}
                  rows={3}
                  placeholder="特に意識してほしいターゲット・トーン・要素など"
                />
                <p className="text-xs text-muted-foreground">
                  ブリーフに書き切れない細かい指示を追加で書けます
                </p>
              </div>

              {/* 必須項目チェック */}
              {(!briefData.ad_objective || !briefData.target_audience) && (
                <Alert variant="destructive">
                  <AlertDescription className="text-xs">
                    広告ブリーフの「広告の目的」と「ターゲット」は必須です
                  </AlertDescription>
                </Alert>
              )}

              {/* 実行ボタン */}
              <Button
                onClick={handleGenerate}
                disabled={
                  isRunning || !briefData.ad_objective || !briefData.target_audience
                }
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 mr-2" /> 訴求軸・コピーを生成
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
                      const appealAxesRaw = asset.metadata?.appeal_axes ?? [];
                      const copies = asset.metadata?.copies ?? [];

                      // 文字列/オブジェクト両対応に正規化
                      const appealAxes = appealAxesRaw.map((a) =>
                        typeof a === 'string' ? { text: a } : a
                      );

                      // 訴求軸ごとにコピーをグループ化
                      const grouped = appealAxes.map((_, axisIdx) =>
                        copies.filter((c) => c.appeal_axis_index === axisIdx)
                      );

                      // 通し番号 (A,B,C...) を発番
                      let runningIdx = 0;

                      return (
                        <div key={asset.id} className="space-y-6">
                          {/* アクションボタン */}
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  appealAxes
                                    .map((a, i) => `${i + 1}. ${a.text}`)
                                    .join('\n'),
                                  '訴求軸をコピーしました'
                                )
                              }
                              disabled={appealAxes.length === 0}
                            >
                              <Copy className="h-3 w-3 mr-1" /> 訴求軸のみコピー
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleCopy(
                                  JSON.stringify(asset.metadata, null, 2),
                                  'JSONをコピーしました'
                                )
                              }
                            >
                              <Code className="h-3 w-3 mr-1" /> JSONコピー
                            </Button>
                          </div>

                          {/* セクションA: 訴求軸一覧 */}
                          {appealAxes.length > 0 && (
                            <div className="space-y-2">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                訴求軸 ({appealAxes.length}件)
                              </div>
                              <div className="grid gap-2">
                                {appealAxes.map((axis, i) => (
                                  <div
                                    key={i}
                                    className="rounded-lg border bg-accent/20 p-3 flex items-start gap-3"
                                  >
                                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                                      {i + 1}
                                    </span>
                                    <div className="flex-1 space-y-1 pt-0.5">
                                      <div className="text-sm leading-relaxed font-medium">
                                        {axis.text}
                                      </div>
                                      {axis.reasoning && (
                                        <div className="text-xs text-muted-foreground leading-relaxed">
                                          根拠: {axis.reasoning}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* セクションB: 台本パターン */}
                          {copies.length > 0 && (
                            <div className="space-y-4">
                              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                                台本パターン ({copies.length}件)
                              </div>
                              {grouped.map((group, axisIdx) => (
                                <div
                                  key={axisIdx}
                                  className="rounded-lg border overflow-hidden"
                                >
                                  <div className="bg-muted px-4 py-2 text-sm font-semibold">
                                    訴求軸{axisIdx + 1}:{' '}
                                    {appealAxes[axisIdx]?.text ?? '(未定義)'}
                                  </div>
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead className="w-16">No.</TableHead>
                                        <TableHead>コピー</TableHead>
                                        <TableHead className="w-44 text-right">
                                          アクション
                                        </TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {group.map((c) => {
                                        const letter = letterFor(runningIdx);
                                        runningIdx += 1;
                                        return (
                                          <TableRow key={`${axisIdx}-${c.copy_index}`}>
                                            <TableCell className="font-bold align-top">
                                              {letter}
                                            </TableCell>
                                            <TableCell className="text-sm align-top whitespace-pre-wrap">
                                              <div className="font-medium">{c.text}</div>
                                              {c.hook && (
                                                <div className="text-xs text-muted-foreground mt-1">
                                                  狙い: {c.hook}
                                                </div>
                                              )}
                                            </TableCell>
                                            <TableCell className="text-right align-top">
                                              <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => {
                                                  console.log(
                                                    '[future] generate composition for',
                                                    {
                                                      appeal_axis: appealAxes[axisIdx]?.text,
                                                      copy_text: c.text,
                                                    }
                                                  );
                                                  toast.info('構成案生成への連携は今後実装予定です');
                                                }}
                                              >
                                                <ArrowRight className="h-3 w-3 mr-1" /> 構成案生成
                                              </Button>
                                            </TableCell>
                                          </TableRow>
                                        );
                                      })}
                                    </TableBody>
                                  </Table>
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

export default AppealAxisTool;
