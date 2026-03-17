import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Type, Palette, Image, Film, FileText, Mic, Music,
  Play, PenTool, Monitor, Smartphone, LayoutTemplate, Check,
  Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
import { supabase } from '@/integrations/supabase/client';
import PipelineTimeline from '@/components/progress/PipelineTimeline';
import PreviewPanel from '@/components/progress/PreviewPanel';

/* ─── Pipeline definitions ─── */

export interface PipelineStep {
  icon: React.ElementType;
  label: string;
  runningText: string;
  completedText: string;
  details?: string[];
  extra?: string;
  demoSeconds: number;
  countUp?: boolean;
  stepType: 'text' | 'visual' | 'audio';
  stepKey: string;
}

export const makeBannerPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      stepKey: 'appeal_axis', icon: Target, label: '訴求軸作成', demoSeconds: 2, stepType: 'text',
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 着圧効果で美脚を実現', '② 履くだけで-3cm細見え', '③ 24時間快適な着用感'],
    },
    {
      stepKey: 'copy', icon: Type, label: 'コピー作成', demoSeconds: 3, stepType: 'text',
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました（${s.appealAxis}訴求軸 × ${s.copyPatterns}コピー）`,
      details: ['「美脚革命、始めませんか？」', '「-3cmの自信、履くだけで。」', '「24時間、美しいラインをキープ」'],
    },
    {
      stepKey: 'composition', icon: LayoutTemplate, label: '構成案作成', demoSeconds: 3, stepType: 'text',
      runningText: 'バナーの構成案を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案を作成しました`,
    },
    {
      stepKey: 'tonmana', icon: Palette, label: 'トンマナ作成', demoSeconds: 2, stepType: 'visual',
      runningText: 'トーン＆マナーのバリエーションを生成しています...',
      completedText: `${s.tonePatterns}パターンのトンマナを生成しました`,
      details: ['① クール・モダン（ダークネイビー × ホワイト）', '② ナチュラル・フェミニン（ピンクベージュ × ライトグレー）'],
    },
    {
      stepKey: 'banner_images', icon: Image, label: '静止画バナー作成', demoSeconds: 5, countUp: true, stepType: 'visual',
      runningText: `最終バナーを生成しています... (0/${total})`,
      completedText: `${total}本のバナーを生成しました ✓`,
    },
  ];
};

export const makeVideoPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      stepKey: 'appeal_axis', icon: Target, label: '訴求軸作成', demoSeconds: 2, stepType: 'text',
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 未経験からエンジニア転職を実現', '② 年収400万→600万のキャリアアップ', '③ 最短3ヶ月でIT業界デビュー'],
    },
    {
      stepKey: 'copy', icon: Type, label: 'コピー作成', demoSeconds: 3, stepType: 'text',
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました`,
    },
    {
      stepKey: 'composition', icon: Film, label: '構成案・字コンテ作成', demoSeconds: 4, stepType: 'text',
      runningText: '動画の構成案と字コンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案・字コンテを作成しました`,
      extra: '構成: 4シーン（Hook → Problem → Solution → CTA）',
    },
    {
      stepKey: 'narration_script', icon: FileText, label: 'NA原稿作成', demoSeconds: 3, stepType: 'text',
      runningText: 'ナレーション原稿を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのNA原稿を作成しました`,
      extra: `平均文字数: ${s.videoDuration === 15 ? 60 : s.videoDuration === 30 ? 120 : 240}文字（${s.videoDuration}秒尺）`,
    },
    {
      stepKey: 'narration', icon: Mic, label: 'ナレーション作成', demoSeconds: 4, stepType: 'audio',
      runningText: 'AI音声でナレーションを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのナレーション音声を生成しました`,
      extra: '音声タイプ: 女性ナチュラル',
    },
    {
      stepKey: 'bgm', icon: Music, label: 'BGM提案', demoSeconds: 2, stepType: 'audio',
      runningText: '有料素材ライブラリからBGMを自動抽出しています...',
      completedText: '3曲のBGM候補を抽出しました',
      details: ['① アップテンポ・ポジティブ（BPM 120）', '② エモーショナル・ドラマティック（BPM 90）', '③ クール・テクノ（BPM 130）'],
    },
    {
      stepKey: 'vcon', icon: Play, label: 'Vコン作成', demoSeconds: 5, stepType: 'visual',
      runningText: 'ビデオコンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのVコンを作成しました`,
      extra: '字コンテ + NA + BGMの統合',
    },
    {
      stepKey: 'styleframe', icon: Palette, label: 'スタイルフレーム作成', demoSeconds: 3, stepType: 'visual',
      runningText: 'スタイルフレーム（トンマナデザイン）を生成しています...',
      completedText: `${s.tonePatterns}パターンのスタイルフレームを生成しました`,
      details: ['① クリーン・コーポレート', '② カジュアル・ポップ'],
    },
    {
      stepKey: 'ekonte', icon: PenTool, label: '絵コンテ作成', demoSeconds: 4, stepType: 'visual',
      runningText: '絵コンテ（トンマナデザイン適用）を作成しています...',
      completedText: `${total}パターンの絵コンテを作成しました`,
    },
    {
      stepKey: 'horizontal_video', icon: Monitor, label: '横動画作成', demoSeconds: 6, countUp: true, stepType: 'visual',
      runningText: `横動画（16:9）を生成しています... (0/${total})`,
      completedText: `${total}本の横動画を生成しました`,
      extra: `解像度: 1920 × 1080 / ${s.videoDuration}秒`,
    },
    {
      stepKey: 'vertical_video', icon: Smartphone, label: '縦動画・リサイズ', demoSeconds: 4, countUp: true, stepType: 'visual',
      runningText: `縦動画（9:16）にリサイズしています... (0/${total})`,
      completedText: `${total}本の縦動画を生成しました`,
      extra: `解像度: 1080 × 1920 / ${s.videoDuration}秒`,
    },
  ];
};

/* ─── Webhook URLs ─── */

const WEBHOOK_URLS: Record<string, string> = {
  copy: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step2',
  composition: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step3',
  narration_script: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step4',
};

/* ─── Confetti ─── */

const Confetti = () => {
  const colors = ['hsl(241, 100%, 74%)', 'hsl(199, 89%, 48%)', 'hsl(241, 100%, 86%)', 'hsl(199, 84%, 60%)'];
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {Array.from({ length: 40 }).map((_, i) => (
        <div
          key={i}
          className="absolute animate-confetti"
          style={{
            left: `${Math.random() * 100}%`,
            top: `-5%`,
            width: `${6 + Math.random() * 6}px`,
            height: `${6 + Math.random() * 6}px`,
            backgroundColor: colors[i % colors.length],
            borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            animationDelay: `${Math.random() * 0.5}s`,
            animationDuration: `${2 + Math.random() * 2}s`,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Helper to build WizardState from gen_jobs row ─── */

const buildStateFromJob = (job: any): WizardState => ({
  creativeType: job.creative_type as 'banner' | 'video',
  videoDuration: job.duration_seconds ?? 30,
  clientId: null,
  productId: null,
  projectId: job.project_id,
  referenceIds: [],
  referenceUrls: [],
  productionPattern: job.production_pattern === '新規制作' ? 'new' : 'variation',
  baseCreativeId: null,
  productionCount: job.total_patterns ?? 18,
  appealAxis: job.num_appeal_axes ?? 3,
  copyPatterns: job.num_copies ?? 3,
  tonePatterns: job.num_tonmana ?? 2,
  generationMode: (job.generation_mode ?? 'auto') as 'auto' | 'step',
});

/* ─── Gen step type from Supabase ─── */

export interface GenStepRow {
  id: string;
  job_id: string;
  step_number: number;
  step_key: string;
  step_label: string;
  status: string;
  result: any;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

/* ─── Safe JSON parse helper (handles double-encoded strings) ─── */

const safeParse = (v: any): any => {
  if (!v) return null;
  if (typeof v === 'object') return v;
  try {
    const parsed = JSON.parse(v);
    // Handle double-encoded: if result is still a string after first parse, parse again
    if (typeof parsed === 'string') {
      try { return JSON.parse(parsed); } catch { return parsed; }
    }
    return parsed;
  } catch { return null; }
};

/* ─── Text step keys (driven by Supabase only) ─── */

const TEXT_STEP_KEYS = ['appeal_axis', 'copy', 'composition', 'narration_script'];

/* ─── Trigger a specific next step webhook ─── */

const triggerWebhook = async (
  nextStepKey: string,
  job: any,
  _steps: GenStepRow[],
  meta: { clientName: string; productName: string; projectName: string },
) => {
  const url = WEBHOOK_URLS[nextStepKey];
  if (!url) return;

  const { data: allSteps, error: stepsError } = await supabase
    .from('gen_steps')
    .select('step_key, result')
    .eq('job_id', job.id);

  console.log(`[Webhook] gen_steps query for job_id=${job.id}:`);
  console.log(`[Webhook] error:`, stepsError);
  console.log(`[Webhook] allSteps count:`, allSteps?.length ?? 0);
  console.log(`[Webhook] allSteps keys:`, allSteps?.map((s: any) => `${s.step_key}(result=${s.result !== null})`));

  const getStepResult = (stepKey: string) => {
    const stepData = allSteps?.find((s: { step_key: string; result: unknown }) => s.step_key === stepKey);
    console.log(`[Webhook] ${stepKey} raw result type=${typeof stepData?.result}:`, stepData?.result);
    const parsed = stepData?.result
      ? (typeof stepData.result === 'string' ? safeParse(stepData.result) : stepData.result)
      : null;

    console.log(`[Webhook] ${stepKey} parsed:`, JSON.stringify(parsed));
    return parsed;
  };

  let previousResults: Record<string, any> = {};
  let webhookLabel = nextStepKey;

  if (nextStepKey === 'copy') {
    const step1Result = getStepResult('appeal_axis');
    console.log('DEBUG appeal_axes:', JSON.stringify(step1Result?.appeal_axes));
    previousResults = {
      appeal_axes: step1Result?.appeal_axes || [],
    };
    webhookLabel = 'WF2';
  }

  if (nextStepKey === 'composition') {
    const step2Result = getStepResult('copy');
    console.log('DEBUG copies:', JSON.stringify(step2Result?.copies));
    previousResults = {
      copies: step2Result?.copies || [],
    };
    webhookLabel = 'WF3';
    console.log('Calling WF3 with previous_results:', {
      copies: step2Result?.copies,
    });
  }

  if (nextStepKey === 'narration_script') {
    const step1Result = getStepResult('appeal_axis');
    const step2Result = getStepResult('copy');
    const step3Result = getStepResult('composition');
    console.log('DEBUG appeal_axes:', JSON.stringify(step1Result?.appeal_axes));
    console.log('DEBUG copies:', JSON.stringify(step2Result?.copies));
    console.log('DEBUG compositions:', JSON.stringify(step3Result?.compositions));
    previousResults = {
      appeal_axes: step1Result?.appeal_axes || [],
      copies: step2Result?.copies || [],
      compositions: step3Result?.compositions || [],
    };
    webhookLabel = 'WF4';
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        job_id: job.id,
        creative_type: job.creative_type,
        duration_seconds: job.duration_seconds,
        num_appeal_axes: job.num_appeal_axes,
        num_copies: job.num_copies,
        num_tonmana: job.num_tonmana,
        client_name: meta.clientName,
        product_name: meta.productName,
        project_name: meta.projectName,
        previous_results: previousResults,
      }),
    });

    console.log(`DEBUG ${webhookLabel} response status:`, response.status);
    console.log(`[Webhook] ${webhookLabel} previous_results:`, JSON.stringify(previousResults));
  } catch (e) {
    console.error(`[Webhook] Failed to trigger ${nextStepKey}:`, e);
  }
};

/* ─── Main Component ─── */

const GenerateProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get('job_id');

  const wizardState = (location.state as { wizardState: WizardState } | null)?.wizardState;

  const [jobData, setJobData] = useState<any>(null);
  const [stateReady, setStateReady] = useState(!!wizardState);
  const [jobMeta, setJobMeta] = useState<{ clientName: string; productName: string; projectName: string }>({
    clientName: '—', productName: '—', projectName: '—',
  });

  // Fetch job with relational data
  useEffect(() => {
    if (!jobId) { setStateReady(true); return; }

    const fetchJob = async () => {
      const { data } = await supabase
        .from('gen_jobs')
        .select('*, projects(name, products(name, clients(name)))')
        .eq('id', jobId)
        .single();

      if (data) {
        setJobData(data);
        const proj = data.projects as any;
        if (proj) {
          setJobMeta({
            clientName: proj.products?.clients?.name ?? '—',
            productName: proj.products?.name ?? '—',
            projectName: proj.name ?? '—',
          });
        }
      }
      setStateReady(true);
    };
    fetchJob();
  }, [jobId]);

  const state: WizardState = wizardState ?? (jobData ? buildStateFromJob(jobData) : {
    creativeType: 'video', videoDuration: 30, clientId: null, productId: null,
    projectId: null, referenceIds: [], referenceUrls: [], productionPattern: 'new',
    baseCreativeId: null, productionCount: 18, appealAxis: 3, copyPatterns: 3, tonePatterns: 2,
    generationMode: 'auto',
  });

  const total = state.appealAxis * state.copyPatterns * state.tonePatterns;
  const pipeline = state.creativeType === 'video' ? makeVideoPipeline(state) : makeBannerPipeline(state);

  // Map pipeline step keys to indexes
  const stepKeyToIndex = new Map(pipeline.map((p, i) => [p.stepKey, i]));
  const firstDummyIndex = pipeline.findIndex(s => s.stepType !== 'text');

  const [activeIndex, setActiveIndex] = useState(-1);
  const [completedIndexes, setCompletedIndexes] = useState<Set<number>>(new Set());
  const [waitingForApproval, setWaitingForApproval] = useState(-1);
  const [countUpValues, setCountUpValues] = useState<Record<number, number>>({});
  const [allDone, setAllDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [switchedToAuto, setSwitchedToAuto] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  const userSelectedStepRef = useRef<number | null>(null);
  const lastAutoCompletedRef = useRef<number>(-1);
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  // Supabase polling state
  const [genStepsData, setGenStepsData] = useState<GenStepRow[]>([]);
  const [dummyPhaseStarted, setDummyPhaseStarted] = useState(false);
  const [errorMap, setErrorMap] = useState<Record<number, string>>({});

  // ── Webhook dedup refs (per step) ──
  const step2TriggeredRef = useRef(false);
  const step3TriggeredRef = useRef(false);
  const step4TriggeredRef = useRef(false);
  const dummyAnimationStartedRef = useRef(false);

  // Reset dedup refs and UI state on jobId change
  useEffect(() => {
    step2TriggeredRef.current = false;
    step3TriggeredRef.current = false;
    step4TriggeredRef.current = false;
    dummyAnimationStartedRef.current = false;
    setActiveIndex(-1);
    setCompletedIndexes(new Set());
    setWaitingForApproval(-1);
    setCountUpValues({});
    setAllDone(false);
    setShowConfetti(false);
    setSelectedStepIndex(null);
    setErrorMap({});
    setDummyPhaseStarted(false);
  }, [jobId]);

  const effectiveAutoMode = (jobData?.generation_mode === 'auto') || switchedToAuto;

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  // ── Supabase polling for gen_steps (text 4 steps are 100% data-driven) ──
  useEffect(() => {
    if (!jobId || !stateReady || !jobData) return;

    const isJobAutoMode = (jobData.generation_mode === 'auto') || switchedToAuto;

    const doPoll = async () => {
      const { data: steps } = await supabase
        .from('gen_steps')
        .select('*')
        .eq('job_id', jobId)
        .order('step_number', { ascending: true });

      if (!steps || steps.length === 0) return false;

      setGenStepsData(steps as GenStepRow[]);

      // ── Update pipeline UI from gen_steps data ──
      const newCompleted = new Set<number>();
      const newErrors: Record<number, string> = {};
      let latestProcessing = -1;
      let latestCompletedIdx = -1;

      steps.forEach((gs: any) => {
        const pipelineIdx = stepKeyToIndex.get(gs.step_key);
        if (pipelineIdx === undefined) return;

        if (gs.status === 'completed') {
          newCompleted.add(pipelineIdx);
          if (pipelineIdx > latestCompletedIdx) latestCompletedIdx = pipelineIdx;
        }
        if (gs.status === 'processing') {
          latestProcessing = pipelineIdx;
        }
        if (gs.status === 'error' && gs.error_message) {
          newErrors[pipelineIdx] = gs.error_message;
        }
      });

      // Text 4 steps are always rebuilt from DB only; only dummy-step completions are preserved locally
      setCompletedIndexes(prev => {
        const next = new Set<number>();
        prev.forEach(idx => {
          const step = pipeline[idx];
          if (step && !TEXT_STEP_KEYS.includes(step.stepKey)) next.add(idx);
        });
        newCompleted.forEach(idx => next.add(idx));
        return next;
      });
      setErrorMap(newErrors);
      if (latestProcessing >= 0) {
        setActiveIndex(latestProcessing);
      } else if (!dummyAnimationStartedRef.current) {
        setActiveIndex(-1);
      }
      if (latestCompletedIdx >= 0) setSelectedStepIndex(latestCompletedIdx);

      // ── Auto mode: trigger next webhook when a step completes ──
      if (isJobAutoMode) {
        const step1 = steps.find((s: any) => s.step_key === 'appeal_axis');
        const step2 = steps.find((s: any) => s.step_key === 'copy');
        const step3 = steps.find((s: any) => s.step_key === 'composition');
        const step4 = steps.find((s: any) => s.step_key === 'narration_script');

        // Step1 completed & Step2 pending → trigger Step2
        if (step1?.status === 'completed' && step2?.status === 'pending' && !step2TriggeredRef.current) {
          step2TriggeredRef.current = true;
          triggerWebhook('copy', jobData, steps as GenStepRow[], jobMeta);
        }

        // Step2 completed & Step3 pending → trigger Step3
        if (step2?.status === 'completed' && step3?.status === 'pending' && !step3TriggeredRef.current) {
          step3TriggeredRef.current = true;
          triggerWebhook('composition', jobData, steps as GenStepRow[], jobMeta);
        }

        // Step3 completed & Step4 pending → trigger Step4
        if (step3?.status === 'completed' && step4?.status === 'pending' && !step4TriggeredRef.current) {
          step4TriggeredRef.current = true;
          triggerWebhook('narration_script', jobData, steps as GenStepRow[], jobMeta);
        }
      }

      // ── Step mode: detect newly completed step → set waitingForApproval ──
      if (!isJobAutoMode) {
        let foundApproval = false;
        // Iterate forward to find the first completed step whose next step is pending
        for (let i = 0; i < TEXT_STEP_KEYS.length; i++) {
          const key = TEXT_STEP_KEYS[i];
          const gs = steps.find((s: any) => s.step_key === key);
          const pIdx = stepKeyToIndex.get(key);
          if (gs?.status === 'completed' && pIdx !== undefined) {
            const nextKey = TEXT_STEP_KEYS[i + 1];
            if (nextKey) {
              const nextGs = steps.find((s: any) => s.step_key === nextKey);
              if (nextGs?.status === 'pending') {
                setWaitingForApproval(pIdx);
                setSelectedStepIndex(pIdx); // Ensure selected matches waiting
                foundApproval = true;
                break;
              }
            } else {
              // Last text step (narration_script) completed → wait for approval to start dummy phase
              if (!dummyAnimationStartedRef.current) {
                setWaitingForApproval(pIdx);
                setSelectedStepIndex(pIdx);
                foundApproval = true;
              }
              break;
            }
          }
          // If this step is still processing or pending, stop looking
          if (gs?.status === 'processing' || gs?.status === 'pending') break;
        }
        // If no approval needed (all triggered already), clear it
        if (!foundApproval) {
          setWaitingForApproval(-1);
        }
      }

      // ── Check if all text steps completed ──
      const allTextDone = TEXT_STEP_KEYS.every(key => {
        const gs = steps.find((s: any) => s.step_key === key);
        return gs?.status === 'completed';
      });

      return allTextDone;
    };

    doPoll();

    const interval = setInterval(async () => {
      const allTextDone = await doPoll();
      if (allTextDone && !dummyAnimationStartedRef.current) {
        // In auto mode, start dummy animations immediately
        if (isJobAutoMode) {
          dummyAnimationStartedRef.current = true;
          setDummyPhaseStarted(true);
          clearInterval(interval);
          if (firstDummyIndex >= 0 && firstDummyIndex < pipeline.length) {
            setTimeout(() => setActiveIndex(firstDummyIndex), 500);
          } else {
            setAllDone(true);
            setShowConfetti(true);
            clearInterval(timerRef.current);
            setTimeout(() => setShowConfetti(false), 3500);
          }
        }
        // In step mode, keep polling but don't start dummy yet (wait for approval)
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [jobId, stateReady, jobData, switchedToAuto, jobMeta]);

  // ── Mode B: Full dummy animation (no jobId, legacy/demo mode) ──
  useEffect(() => {
    if (jobId) return;
    if (!stateReady) return;
    const t = setTimeout(() => setActiveIndex(0), 500);
    return () => clearTimeout(t);
  }, [jobId, stateReady]);

  // ── Run dummy animation for current step (NON-TEXT steps only when jobId exists) ──
  useEffect(() => {
    if (!stateReady) return;
    if (activeIndex < 0 || activeIndex >= pipeline.length) return;
    if (completedIndexes.has(activeIndex)) return;

    // If we have a jobId, NEVER animate text steps — they are driven by Supabase data only
    if (jobId && pipeline[activeIndex].stepType === 'text') return;
    // Also guard by stepKey for text 4 steps (belt-and-suspenders)
    if (jobId && TEXT_STEP_KEYS.includes(pipeline[activeIndex].stepKey)) return;

    const step = pipeline[activeIndex];

    if (step.countUp) {
      const intervals = 4;
      const perInterval = step.demoSeconds * 1000 / intervals;
      let count = 0;
      const iv = setInterval(() => {
        count++;
        setCountUpValues(prev => ({ ...prev, [activeIndex]: Math.min(Math.round(total * count / intervals), total) }));
        if (count >= intervals) clearInterval(iv);
      }, perInterval);
    }

    const t = setTimeout(() => {
      setCompletedIndexes(prev => new Set(prev).add(activeIndex));
      if (step.countUp) setCountUpValues(prev => ({ ...prev, [activeIndex]: total }));
      setSelectedStepIndex(activeIndex);

      if (effectiveAutoMode) {
        if (activeIndex + 1 < pipeline.length) {
          setTimeout(() => setActiveIndex(activeIndex + 1), 300);
        } else {
          setAllDone(true);
          setShowConfetti(true);
          clearInterval(timerRef.current);
          setTimeout(() => setShowConfetti(false), 3500);
        }
      } else {
        setWaitingForApproval(activeIndex);
      }
    }, step.demoSeconds * 1000);

    return () => clearTimeout(t);
  }, [activeIndex, effectiveAutoMode, completedIndexes, stateReady, jobId]);

  // ── Handle approve: trigger next webhook (step mode) or advance dummy ──
  const handleApprove = useCallback(async (idx: number) => {
    setWaitingForApproval(-1);

    const currentStepKey = pipeline[idx]?.stepKey;
    const isTextStep = TEXT_STEP_KEYS.includes(currentStepKey);

    if (jobId && jobData && isTextStep) {
      const currentOrderIdx = TEXT_STEP_KEYS.indexOf(currentStepKey);

      if (currentOrderIdx >= 0 && currentOrderIdx < TEXT_STEP_KEYS.length - 1) {
        // Trigger the next text step webhook
        const nextKey = TEXT_STEP_KEYS[currentOrderIdx + 1];
        const refMap: Record<string, React.MutableRefObject<boolean>> = {
          copy: step2TriggeredRef,
          composition: step3TriggeredRef,
          narration_script: step4TriggeredRef,
        };
        const ref = refMap[nextKey];
        if (ref && !ref.current) {
          ref.current = true;
          await triggerWebhook(nextKey, jobData, genStepsData, jobMeta);
        }
        // Don't advance activeIndex — polling will detect the next step's processing/completed status
        return;
      }

      if (currentOrderIdx === TEXT_STEP_KEYS.length - 1) {
        // Last text step approved → start dummy animations
        dummyAnimationStartedRef.current = true;
        setDummyPhaseStarted(true);
        if (firstDummyIndex >= 0 && firstDummyIndex < pipeline.length) {
          setTimeout(() => setActiveIndex(firstDummyIndex), 300);
        } else {
          setAllDone(true);
          setShowConfetti(true);
          clearInterval(timerRef.current);
          setTimeout(() => setShowConfetti(false), 3500);
        }
        return;
      }
    }

    // Non-text step: advance to next dummy step
    if (idx + 1 < pipeline.length) {
      setTimeout(() => setActiveIndex(idx + 1), 300);
    } else {
      setAllDone(true);
      setShowConfetti(true);
      clearInterval(timerRef.current);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [pipeline, jobId, jobData, genStepsData, jobMeta, firstDummyIndex]);

  const handleRegenerate = useCallback((idx: number) => {
    setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
    setWaitingForApproval(-1);
    setCountUpValues(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setActiveIndex(-1);
    setTimeout(() => setActiveIndex(idx), 100);
  }, []);

  const switchToAuto = useCallback(() => {
    setSwitchedToAuto(true);
    if (waitingForApproval >= 0) {
      handleApprove(waitingForApproval);
    }
  }, [waitingForApproval, handleApprove]);

  const handleStepClick = (idx: number) => {
    if (completedIndexes.has(idx)) {
      setSelectedStepIndex(idx);
      setMobileTimelineOpen(false);
    }
  };

  // Get gen_step result for selected step
  const selectedGenStepResult = (() => {
    if (selectedStepIndex === null) return null;
    const pipelineStep = pipeline[selectedStepIndex];
    if (!pipelineStep) return null;
    const genStep = genStepsData.find(gs => gs.step_key === pipelineStep.stepKey);
    return genStep?.result ?? null;
  })();

  // Summary line with real names
  const typeLabel = state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー';
  const patternLabel = state.productionPattern === 'new' ? '新規制作' : 'パターン展開';
  const summaryLine = `${typeLabel} / ${jobMeta.clientName} / ${jobMeta.productName} / ${jobMeta.projectName} / ${patternLabel} / 合計${total}本`;

  const completedCount = completedIndexes.size;
  const progressPct = Math.round((completedCount / pipeline.length) * 100);
  const elapsedStr = `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`;
  const avgPerStep = completedCount > 0 ? elapsed / completedCount : 0;
  const remainingSteps = pipeline.length - completedCount;
  const estRemaining = Math.max(0, avgPerStep * remainingSteps);
  const remainStr = `${Math.floor(estRemaining / 60000)}:${String(Math.floor((estRemaining % 60000) / 1000)).padStart(2, '0')}`;

  if (!stateReady) {
    return (
      <div className="h-[calc(100vh-56px)] flex items-center justify-center">
        <Sparkles className="h-8 w-8 text-secondary animate-pulse" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {showConfetti && <Confetti />}

      {/* Summary header */}
      <div className="shrink-0 border-b border-border px-4 py-2">
        <p className="text-sm text-muted-foreground truncate">{summaryLine}</p>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden">
        <div className="shrink-0 border-b border-border">
          <button
            onClick={() => setMobileTimelineOpen(!mobileTimelineOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-sm font-medium"
          >
            <span>パイプライン（{completedCount}/{pipeline.length}工程完了）</span>
            {mobileTimelineOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
          <AnimatePresence>
            {mobileTimelineOpen && (
              <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
                  <PipelineTimeline
                    pipeline={pipeline} activeIndex={activeIndex} completedIndexes={completedIndexes}
                    selectedStepIndex={selectedStepIndex} countUpValues={countUpValues} total={total}
                    progressPct={progressPct} completedCount={completedCount} elapsedStr={elapsedStr}
                    remainStr={remainStr} allDone={allDone} effectiveAutoMode={effectiveAutoMode}
                    errorMap={errorMap} onStepClick={handleStepClick} onSwitchToAuto={switchToAuto}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline} selectedStepIndex={selectedStepIndex} completedIndexes={completedIndexes}
            allDone={allDone} total={total} state={state} waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode} genStepResult={selectedGenStepResult}
            jobId={jobId} onApprove={handleApprove} onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto} onNavigateDashboard={() => navigate('/')}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-border overflow-y-auto p-4">
          <PipelineTimeline
            pipeline={pipeline} activeIndex={activeIndex} completedIndexes={completedIndexes}
            selectedStepIndex={selectedStepIndex} countUpValues={countUpValues} total={total}
            progressPct={progressPct} completedCount={completedCount} elapsedStr={elapsedStr}
            remainStr={remainStr} allDone={allDone} effectiveAutoMode={effectiveAutoMode}
            errorMap={errorMap} onStepClick={handleStepClick} onSwitchToAuto={switchToAuto}
          />
        </div>
        <div className="w-[60%] overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline} selectedStepIndex={selectedStepIndex} completedIndexes={completedIndexes}
            allDone={allDone} total={total} state={state} waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode} genStepResult={selectedGenStepResult}
            jobId={jobId} onApprove={handleApprove} onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto} onNavigateDashboard={() => navigate('/')}
          />
        </div>
      </div>
    </div>
  );
};

export default GenerateProgress;
