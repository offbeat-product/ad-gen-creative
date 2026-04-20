import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Mic,
  Upload,
  Play,
  Pause,
  Download,
  Loader2,
  CheckCircle2,
  AlertCircle,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: 'NA原稿・ボイス' },
];

const VOICE_OPTIONS = [
  { id: '3JDquces8E8bkmvbh6Bc', label: '男性A', description: '落ち着き・低音' },
  { id: 'j210dv0vWm7fCknyQpbA', label: '男性B', description: '明るい' },
  { id: 'T7yYq3WpB94yAuOXraRi', label: '女性A', description: '柔らか' },
  { id: 'WQz3clzUdMqvBf0jswZQ', label: '女性B', description: 'クール' },
];

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-narration-audio';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
}

const NarrationAudioTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [script, setScript] = useState('');
  const [selectedVoice, setSelectedVoice] = useState(VOICE_OPTIONS[0].id);
  const [speed, setSpeed] = useState(1.0);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<SpotAsset[]>([]);
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);

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
        return script.trim().length > 0;
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
      setScript(text);
      toast.success('テキストを読み込みました');
      return;
    }

    if (file.name.endsWith('.docx')) {
      try {
        const mammoth = await import('mammoth');
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setScript(result.value);
        toast.success('docxからテキストを読み込みました');
      } catch (err) {
        toast.error('docxの読み込みに失敗しました');
        console.error(err);
      }
      return;
    }

    toast.error('対応形式: .txt, .docx');
  };

  const handleGenerate = async () => {
    if (!state.projectId || !user || !script.trim()) return;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert({
        project_id: state.projectId,
        tool_type: 'narration_audio',
        input_data: { script, voice_id: selectedVoice, speed },
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

    const narrationRules =
      context?.rules.filter((r) =>
        ['narration', 'na_script', 'script'].includes(r.process_type)
      ) ?? [];

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_job_id: newJob.id,
        project_id: state.projectId,
        script,
        voice_id: selectedVoice,
        speed,
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        rules: narrationRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
        })),
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success('音声生成を開始しました');
  };

  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase.from('gen_spot_assets').select('*').eq('job_id', jobId).order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as SpotAsset[]);
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

  const handlePlay = (asset: SpotAsset) => {
    if (playingAssetId === asset.id && audioRef) {
      audioRef.pause();
      setPlayingAssetId(null);
      return;
    }
    if (audioRef) audioRef.pause();
    const audio = new Audio(asset.file_url);
    audio.onended = () => setPlayingAssetId(null);
    audio.play().catch(() => toast.error('再生できませんでした'));
    setAudioRef(audio);
    setPlayingAssetId(asset.id);
  };

  const narrationRulesCount =
    context?.rules.filter((r) =>
      ['narration', 'na_script', 'script'].includes(r.process_type)
    ).length ?? 0;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">🎙 ナレーション音声生成</h1>
        <p className="text-sm text-muted-foreground">
          NA原稿から ElevenLabs を使って音声ファイルを生成します
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
                NA原稿・ボイスを設定
              </h2>

              {/* Ad Brain 参照情報 */}
              {context && (
                <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
                  <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                    Ad Brain 参照
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs">
                    <span className="text-foreground">
                      📋 関連ルール {narrationRulesCount}件
                    </span>
                    {context.project.copyright_text && (
                      <span className="text-muted-foreground">© {context.project.copyright_text}</span>
                    )}
                  </div>
                </div>
              )}

              {/* NA原稿 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>NA原稿</Label>
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
                  value={script}
                  onChange={(e) => setScript(e.target.value)}
                  rows={8}
                  className="font-mono text-sm"
                  placeholder="ここにNA原稿を入力してください..."
                />
                <p className="text-xs text-muted-foreground">
                  ※ 1行 = 1ボイス分割単位(無音でポーズ)
                </p>
              </div>

              {/* ボイス選択 */}
              <div className="space-y-2">
                <Label>ボイス選択</Label>
                <RadioGroup value={selectedVoice} onValueChange={setSelectedVoice}>
                  {VOICE_OPTIONS.map((v) => (
                    <div
                      key={v.id}
                      className="flex items-center space-x-2 p-3 rounded border hover:bg-accent/30 cursor-pointer"
                    >
                      <RadioGroupItem value={v.id} id={`voice-${v.id}`} />
                      <Label htmlFor={`voice-${v.id}`} className="flex-1 cursor-pointer">
                        <span className="font-medium">{v.label}</span>
                        <span className="text-xs text-muted-foreground ml-2">{v.description}</span>
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              {/* 読み上げ速度 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>読み上げ速度</Label>
                  <span className="text-sm font-mono text-muted-foreground">
                    {speed.toFixed(2)}x
                  </span>
                </div>
                <Slider
                  value={[speed]}
                  onValueChange={([v]) => setSpeed(v)}
                  min={0.7}
                  max={1.3}
                  step={0.05}
                  className="py-4"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0.7x (ゆっくり)</span>
                  <span>1.0x (標準)</span>
                  <span>1.3x (はやい)</span>
                </div>
              </div>

              {/* 実行ボタン */}
              <Button
                onClick={handleGenerate}
                disabled={
                  !script.trim() || job?.status === 'pending' || job?.status === 'running'
                }
                className="w-full h-12"
                size="lg"
              >
                {job?.status === 'pending' || job?.status === 'running' ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
                  </>
                ) : (
                  <>
                    <Mic className="h-4 w-4 mr-2" /> 音声を生成
                  </>
                )}
              </Button>

              {/* 生成結果 */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-3">
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

                  {(job.status === 'pending' || job.status === 'running') && (
                    <Progress value={job.status === 'running' ? 60 : 20} />
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {assets.length > 0 && (
                    <div className="space-y-2">
                      {assets.map((asset) => (
                        <div
                          key={asset.id}
                          className="flex items-center gap-3 p-3 rounded border bg-accent/30"
                        >
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handlePlay(asset)}
                          >
                            {playingAssetId === asset.id ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                          <div className="flex-1 min-w-0 text-sm truncate">
                            {asset.file_name ?? 'narration.mp3'}
                          </div>
                          <a
                            href={asset.file_url}
                            download
                            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                          >
                            <Download className="h-3 w-3" /> DL
                          </a>
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
          <Button onClick={goNext} disabled={!canProceed()} variant="default">
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

export default NarrationAudioTool;
