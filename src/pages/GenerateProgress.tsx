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
      stepKey: 'bgm_suggestion', icon: Music, label: 'BGM提案', demoSeconds: 2, stepType: 'text',
      runningText: 'AIが最適なBGMを選定しています...',
      completedText: 'BGM候補を提案しました',
    },
    {
      stepKey: 'vcon', icon: Play, label: 'Vコン作成', demoSeconds: 5, stepType: 'visual',
      runningText: 'ビデオコンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのVコンを作成しました`,
      extra: '字コンテ + NA + BGMの統合',
    },
    {
      stepKey: 'styleframe', icon: Palette,
      label: s.creativeStyle === 'motion_graphics' ? 'スタイルフレーム作成（モーショングラフィックス）'
           : s.creativeStyle === 'hybrid' ? 'スタイルフレーム作成（ハイブリッド）'
           : 'スタイルフレーム作成（実写素材）',
      demoSeconds: 3, stepType: 'visual',
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
  appeal_axis: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step1',
  copy: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step2',
  composition: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step3',
  narration_script: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step4',
  narration_audio: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step5',
  bgm_suggestion: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step6',
  vcon: 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step7',
};

const WF5_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step5';
const WF6_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step6';
const WF7_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-step7';

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
  referenceFileNames: {},
  referenceUrls: [],
  productionPattern: job.production_pattern === '新規制作' ? 'new' : 'variation',
  baseCreativeId: null,
  productionCount: job.total_patterns ?? 18,
  appealAxis: job.num_appeal_axes ?? 3,
  copyPatterns: job.num_copies ?? 3,
  tonePatterns: job.num_tonmana ?? 2,
  generationMode: (job.generation_mode ?? 'auto') as 'auto' | 'step',
  creativeStyle: job.settings?.creative_style ?? null,
  styleOptions: job.settings?.style_options ?? {
    colorPalette: { primary: '#1E40AF', secondary: '#3B82F6', background: '#DBEAFE' },
    fontStyle: 'bold_gothic',
    illustrationStyle: 'flat_design',
    taste: [],
  },
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
const DATA_DRIVEN_STEP_KEYS = [...TEXT_STEP_KEYS, 'bgm_suggestion', 'vcon', 'styleframe'];

/* Map pipeline stepKey to DB step_key (narration ↔ narration_audio) */
const pipelineKeyToDbKey = (k: string) => k === 'narration' ? 'narration_audio' : k;
const dbKeyToPipelineKey = (k: string) => k === 'narration_audio' ? 'narration' : k;

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

  // Step1 result is always needed for _rules_text, _refs_text, _patterns_text
  const step1Result = getStepResult('appeal_axis');
  const knowledgeFields = {
    _rules_text: step1Result?._rules_text || '',
    _refs_text: step1Result?._refs_text || '',
    _patterns_text: step1Result?._patterns_text || '',
  };

  if (nextStepKey === 'copy') {
    previousResults = {
      appeal_axes: step1Result?.appeal_axes || [],
      ...knowledgeFields,
    };
    webhookLabel = 'WF2';
  }

  if (nextStepKey === 'composition') {
    const step2Result = getStepResult('copy');
    previousResults = {
      copies: step2Result?.copies || [],
      ...knowledgeFields,
    };
    webhookLabel = 'WF3';
  }

  if (nextStepKey === 'narration_script') {
    const step2Result = getStepResult('copy');
    const step3Result = getStepResult('composition');
    previousResults = {
      appeal_axes: step1Result?.appeal_axes || [],
      copies: step2Result?.copies || [],
      compositions: step3Result?.compositions || [],
      ...knowledgeFields,
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
    projectId: null, referenceIds: [], referenceFileNames: {}, referenceUrls: [], productionPattern: 'new',
    baseCreativeId: null, productionCount: 18, appealAxis: 3, copyPatterns: 3, tonePatterns: 2,
    generationMode: 'auto', creativeStyle: null,
    styleOptions: { colorPalette: { primary: '#1E40AF', secondary: '#3B82F6', background: '#DBEAFE' }, fontStyle: 'bold_gothic' as const, illustrationStyle: 'flat_design' as const, taste: [] },
  });

  const total = state.appealAxis * state.copyPatterns * state.tonePatterns;
  const pipeline = state.creativeType === 'video' ? makeVideoPipeline(state) : makeBannerPipeline(state);

  // Map pipeline step keys to indexes
  const stepKeyToIndex = new Map(pipeline.map((p, i) => [p.stepKey, i]));
  const firstDummyIndex = pipeline.findIndex(s => !DATA_DRIVEN_STEP_KEYS.includes(s.stepKey) && s.stepKey !== 'narration');

  const [activeIndex, setActiveIndex] = useState(-1);
  const [completedIndexes, setCompletedIndexes] = useState<Set<number>>(new Set());
  const [skippedIndexes, setSkippedIndexes] = useState<Set<number>>(new Set());
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

  // Voice selection + WF5 state
  const [voiceSelectionPending, setVoiceSelectionPending] = useState(false);
  const [voiceGenerating, setVoiceGenerating] = useState(false);
  const [narrationAudioMap, setNarrationAudioMap] = useState<Record<string, string | null>>({});
  const [narrationAudioMapB, setNarrationAudioMapB] = useState<Record<string, string | null>>({});
  const [selectedGender, setSelectedGender] = useState<'male' | 'female'>('male');
  const [styleSelectionPending, setStyleSelectionPending] = useState(false);

  // ── Webhook dedup refs (per step) ──
  const step2TriggeredRef = useRef(false);
  const step3TriggeredRef = useRef(false);
  const step4TriggeredRef = useRef(false);
  const wf6TriggeredRef = useRef(false);
  const wf7TriggeredRef = useRef(false);
  const dummyAnimationStartedRef = useRef(false);

  // Reset dedup refs and UI state on jobId change
  useEffect(() => {
    step2TriggeredRef.current = false;
    step3TriggeredRef.current = false;
    step4TriggeredRef.current = false;
    wf6TriggeredRef.current = false;
    wf7TriggeredRef.current = false;
    dummyAnimationStartedRef.current = false;
    setActiveIndex(-1);
    setSkippedIndexes(new Set());
    setCompletedIndexes(new Set());
    setWaitingForApproval(-1);
    setCountUpValues({});
    setAllDone(false);
    setShowConfetti(false);
    setSelectedStepIndex(null);
    setErrorMap({});
    setDummyPhaseStarted(false);
    setVoiceSelectionPending(false);
    setVoiceGenerating(false);
    setNarrationAudioMap({});
    setNarrationAudioMapB({});
    setSelectedGender('male');
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
      const newSkipped = new Set<number>();
      const newErrors: Record<number, string> = {};
      let latestProcessing = -1;
      let latestCompletedIdx = -1;

      steps.forEach((gs: any) => {
        // Map DB step_key 'narration_audio' to pipeline stepKey 'narration'
        const mappedKey = gs.step_key === 'narration_audio' ? 'narration' : gs.step_key;
        const pipelineIdx = stepKeyToIndex.get(mappedKey);
        if (pipelineIdx === undefined) return;

        if (gs.status === 'completed') {
          newCompleted.add(pipelineIdx);
          if (pipelineIdx > latestCompletedIdx) latestCompletedIdx = pipelineIdx;
        }
        if (gs.status === 'skipped') {
          newSkipped.add(pipelineIdx);
          if (pipelineIdx > latestCompletedIdx) latestCompletedIdx = pipelineIdx;
        }
        if (gs.status === 'processing' || gs.status === 'in_progress') {
          latestProcessing = pipelineIdx;
        }
        if ((gs.status === 'error' || gs.status === 'failed') && gs.error_message) {
          newErrors[pipelineIdx] = gs.error_message;
        }
        // Also show a generic error for failed steps without error_message
        if ((gs.status === 'error' || gs.status === 'failed') && !gs.error_message) {
          newErrors[pipelineIdx] = 'ステップが失敗しました';
        }
        // Timeout detection: if processing/pending for more than 5 minutes, show warning
        if (gs.status === 'processing' || gs.status === 'in_progress' || (gs.status === 'pending' && gs.started_at)) {
          const startedAt = gs.started_at ? new Date(gs.started_at).getTime() : null;
          if (startedAt) {
            const elapsed = Date.now() - startedAt;
            const TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
            if (elapsed > TIMEOUT_MS) {
              const mins = Math.floor(elapsed / 60000);
              newErrors[pipelineIdx] = `${mins}分以上応答がありません。n8nワークフローが失敗した可能性があります。`;
            }
          }
        }
      });

      // Data-driven steps (text 4 + bgm_suggestion) are always rebuilt from DB; only dummy-step completions are preserved locally
      setCompletedIndexes(prev => {
        const next = new Set<number>();
        prev.forEach(idx => {
          const step = pipeline[idx];
          if (step && !DATA_DRIVEN_STEP_KEYS.includes(step.stepKey)) next.add(idx);
        });
        newCompleted.forEach(idx => next.add(idx));
        return next;
      });
      setSkippedIndexes(newSkipped);
      setErrorMap(newErrors);
      if (latestProcessing >= 0) {
        setActiveIndex(latestProcessing);
        // Auto-select in-progress step in preview panel if user hasn't manually selected
        if (userSelectedStepRef.current === null) {
          setSelectedStepIndex(latestProcessing);
        }
      } else if (!dummyAnimationStartedRef.current) {
        setActiveIndex(-1);
      }
      // Only auto-update selected step if user hasn't manually selected one,
      // or if a NEW step just completed (reset user selection on new completion)
      if (latestCompletedIdx >= 0) {
        if (latestCompletedIdx > lastAutoCompletedRef.current) {
          // A new step just completed — auto-navigate and clear user selection
          lastAutoCompletedRef.current = latestCompletedIdx;
          userSelectedStepRef.current = null;
          setSelectedStepIndex(latestCompletedIdx);
        } else if (userSelectedStepRef.current === null && latestProcessing < 0) {
          // No user selection active and nothing processing — follow auto
          setSelectedStepIndex(latestCompletedIdx);
        }
      }

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

        // BGM completed & Vcon pending → trigger WF7
        const bgmStep = steps.find((s: any) => s.step_key === 'bgm_suggestion');
        const vconStep = steps.find((s: any) => s.step_key === 'vcon');
        if (bgmStep?.status === 'completed' && vconStep?.status === 'pending' && !wf7TriggeredRef.current) {
          wf7TriggeredRef.current = true;
          triggerVcon();
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
                if (userSelectedStepRef.current === null) setSelectedStepIndex(pIdx);
                foundApproval = true;
                break;
              }
            } else {
              // Last text step (narration_script) completed → wait for approval to start voice selection
              // But only if narration audio hasn't already been handled
              const narrationAudioGs = steps.find((s: any) => s.step_key === 'narration_audio');
              const narrationAlreadyHandled = narrationAudioGs && ['completed', 'skipped', 'failed'].includes(narrationAudioGs.status);
              if (!dummyAnimationStartedRef.current && !voiceSelectionPending && !voiceGenerating && !narrationAlreadyHandled) {
                setWaitingForApproval(pIdx);
                if (userSelectedStepRef.current === null) setSelectedStepIndex(pIdx);
                foundApproval = true;
              }
              break;
            }
          }
          if (gs?.status === 'processing' || gs?.status === 'pending') break;
        }

        // Also check bgm_suggestion and vcon steps for approval
        if (!foundApproval) {
          for (const extraKey of ['bgm_suggestion', 'vcon', 'styleframe']) {
            const gs = steps.find((s: any) => s.step_key === extraKey);
            const pIdx = stepKeyToIndex.get(extraKey);
            if (gs?.status === 'completed' && pIdx !== undefined && !dummyAnimationStartedRef.current) {
              // Only show approval if the next data-driven step is pending or doesn't exist
              const nextKeys = DATA_DRIVEN_STEP_KEYS.slice(DATA_DRIVEN_STEP_KEYS.indexOf(extraKey) + 1);
              const nextPending = nextKeys.find(nk => {
                const ngs = steps.find((s: any) => s.step_key === nk);
                return !ngs || ngs.status === 'pending';
              });
              if (nextPending || nextKeys.length === 0) {
                setWaitingForApproval(pIdx);
                if (userSelectedStepRef.current === null) setSelectedStepIndex(pIdx);
                foundApproval = true;
                break;
              }
            }
          }
        }

        if (!foundApproval) {
          setWaitingForApproval(-1);
        }
      }

      // ── Check if all text steps completed ──
      const allTextDone = TEXT_STEP_KEYS.every(key => {
        const gs = steps.find((s: any) => s.step_key === key);
        return gs?.status === 'completed' || gs?.status === 'skipped';
      });

      // ── Check if all data-driven steps (including bgm_suggestion) completed ──
      const allDataDone = DATA_DRIVEN_STEP_KEYS.every(key => {
        const gs = steps.find((s: any) => s.step_key === key);
        if (!gs && (key === 'bgm_suggestion' || key === 'vcon') && state.creativeType !== 'video') return true;
        return gs?.status === 'completed' || gs?.status === 'skipped';
      });

      return { allTextDone, allDataDone };
    };

    doPoll();

    const interval = setInterval(async () => {
      const result = await doPoll();
      if (!result) return;
      const { allTextDone, allDataDone } = result;

      // For video: after all text steps done, show voice selection
      if (allTextDone && !dummyAnimationStartedRef.current) {
        if (isJobAutoMode) {
          if (state.creativeType === 'video' && !voiceSelectionPending && !voiceGenerating && Object.keys(narrationAudioMap).length === 0) {
            setVoiceSelectionPending(true);
            setWaitingForApproval(-1);
          }
        }
      }

      // After all data-driven steps done (text + bgm), start dummy animations
      if (allDataDone && !dummyAnimationStartedRef.current) {
        // Check narration audio is also done for video
        const narrationDone = state.creativeType !== 'video' || Object.values(narrationAudioMap).some(v => v);
        if (narrationDone && isJobAutoMode) {
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

    // If we have a jobId, NEVER animate data-driven steps — they are driven by Supabase data only
    if (jobId && DATA_DRIVEN_STEP_KEYS.includes(pipeline[activeIndex].stepKey)) return;
    // Never dummy-animate the narration step when voice is generating — it's driven by polling
    if (jobId && pipeline[activeIndex].stepKey === 'narration' && voiceGenerating) return;

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
  }, [activeIndex, effectiveAutoMode, completedIndexes, stateReady, jobId, voiceGenerating]);

  // ── WF6: Trigger BGM suggestion ──
  const triggerBgmSuggestion = useCallback(async () => {
    if (!jobId || !jobData) return;

    const bgmIdx = stepKeyToIndex.get('bgm_suggestion');
    if (bgmIdx !== undefined) {
      setActiveIndex(bgmIdx);
    }

    try {
      const { data: patterns } = await supabase
        .from('gen_patterns')
        .select('pattern_id, appeal_axis_text, copy_text, composition, narration_script')
        .eq('job_id', jobId)
        .order('pattern_id', { ascending: true });

      const step1 = genStepsData.find(s => s.step_key === 'appeal_axis');
      const step1Result = step1?.result
        ? (typeof step1.result === 'string' ? safeParse(step1.result) : step1.result)
        : {};
      const rulesText = step1Result?._rules_text || '';

      const response = await fetch(WF6_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          creative_type: jobData.creative_type,
          duration_seconds: jobData.duration_seconds,
          client_name: jobMeta.clientName,
          product_name: jobMeta.productName,
          project_name: jobMeta.projectName,
          patterns: patterns || [],
          _rules_text: rulesText,
        }),
      });
      console.log('[WF6] Response status:', response.status);
    } catch (e) {
      console.error('[WF6] Failed:', e);
    }
  }, [jobId, jobData, jobMeta, genStepsData, stepKeyToIndex]);

  // ── WF7: Trigger Vcon generation ──
  const triggerVcon = useCallback(async () => {
    if (!jobId || !jobData) return;

    const vconIdx = stepKeyToIndex.get('vcon');
    if (vconIdx !== undefined) {
      setActiveIndex(vconIdx);
    }

    try {
      const { data: patterns } = await supabase
        .from('gen_patterns')
        .select('pattern_id, appeal_axis_text, copy_text, composition, narration_script')
        .eq('job_id', jobId)
        .order('pattern_id', { ascending: true });

      const step1 = genStepsData.find(s => s.step_key === 'appeal_axis');
      const step1Result = step1?.result
        ? (typeof step1.result === 'string' ? safeParse(step1.result) : step1.result)
        : {};
      const rulesText = step1Result?._rules_text || '';

      const response = await fetch(WF7_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_id: jobId,
          creative_type: jobData.creative_type,
          duration_seconds: jobData.duration_seconds,
          client_name: jobMeta.clientName,
          product_name: jobMeta.productName,
          project_name: jobMeta.projectName,
          patterns: patterns || [],
          _rules_text: rulesText,
        }),
      });
      console.log('[WF7] Response status:', response.status);
    } catch (e) {
      console.error('[WF7] Failed:', e);
    }
  }, [jobId, jobData, jobMeta, genStepsData, stepKeyToIndex]);

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
        // Last text step (narration_script) approved → show voice selection
        if (state.creativeType === 'video') {
          setVoiceSelectionPending(true);
          return;
        }
        // Banner: no voice needed, start dummy animations
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

    // Non-text step (including narration audio step): advance
    const narrationStepKey = pipeline[idx]?.stepKey;
    if (narrationStepKey === 'narration') {
      // Narration audio approved → trigger WF6 if not already, then wait for bgm_suggestion
      if (state.creativeType === 'video' && !wf6TriggeredRef.current) {
        wf6TriggeredRef.current = true;
        triggerBgmSuggestion();
      }
      // Polling will detect bgm_suggestion completion and advance
      return;
    }

    // BGM suggestion approved → trigger WF7 (Vcon)
    if (narrationStepKey === 'bgm_suggestion') {
      if (state.creativeType === 'video' && !wf7TriggeredRef.current) {
        wf7TriggeredRef.current = true;
        triggerVcon();
      }
      // Polling will detect vcon completion and advance
      return;
    }

    // Vcon approved → show style selection (step mode) or auto-proceed
    if (narrationStepKey === 'vcon') {
      if (!effectiveAutoMode) {
        // Step mode: show style selection UI
        setStyleSelectionPending(true);
        setWaitingForApproval(-1);
        return;
      }
      // Auto mode: skip style selection, proceed with dummy animations
      dummyAnimationStartedRef.current = true;
      setDummyPhaseStarted(true);
      const nextDummyIdx = pipeline.findIndex((s, i) => i > idx && !DATA_DRIVEN_STEP_KEYS.includes(s.stepKey) && s.stepKey !== 'narration');
      if (nextDummyIdx >= 0) {
        setTimeout(() => setActiveIndex(nextDummyIdx), 300);
      } else {
        setAllDone(true);
        setShowConfetti(true);
        clearInterval(timerRef.current);
        setTimeout(() => setShowConfetti(false), 3500);
      }
      return;
    }

    if (idx + 1 < pipeline.length) {
      setTimeout(() => setActiveIndex(idx + 1), 300);
    } else {
      setAllDone(true);
      setShowConfetti(true);
      clearInterval(timerRef.current);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [pipeline, jobId, jobData, genStepsData, jobMeta, firstDummyIndex, state.creativeType, triggerBgmSuggestion, triggerVcon]);

  const handleRegenerate = useCallback(async (idx: number) => {
    if (!jobId || !jobData) {
      // Legacy demo mode: just re-run dummy animation
      setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
      setWaitingForApproval(-1);
      setCountUpValues(prev => { const n = { ...prev }; delete n[idx]; return n; });
      setActiveIndex(-1);
      setTimeout(() => setActiveIndex(idx), 100);
      return;
    }

    const stepKey = pipeline[idx]?.stepKey;
    if (!stepKey || !TEXT_STEP_KEYS.includes(stepKey)) {
      // Non-text step: just re-run dummy animation
      setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
      setWaitingForApproval(-1);
      setActiveIndex(-1);
      setTimeout(() => setActiveIndex(idx), 100);
      return;
    }

    const confirmed = window.confirm('この工程を再生成しますか？現在の結果は上書きされます。');
    if (!confirmed) return;

    // 1. Reset gen_step status
    await supabase
      .from('gen_steps')
      .update({
        status: 'pending',
        result: null,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('job_id', jobId)
      .eq('step_key', stepKey);

    // 2. Reset local UI
    setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
    setWaitingForApproval(-1);
    setErrorMap(prev => { const n = { ...prev }; delete n[idx]; return n; });

    // Reset webhook dedup refs so this step can be re-triggered
    const refMap: Record<string, React.MutableRefObject<boolean>> = {
      copy: step2TriggeredRef,
      composition: step3TriggeredRef,
      narration_script: step4TriggeredRef,
    };
    if (refMap[stepKey]) refMap[stepKey].current = false;

    // 3. Get previous completed steps' results for building the request body
    const { data: allCompletedSteps } = await supabase
      .from('gen_steps')
      .select('step_key, result')
      .eq('job_id', jobId)
      .eq('status', 'completed');

    const previousResults: Record<string, any> = {};
    allCompletedSteps?.forEach((s: any) => {
      previousResults[s.step_key] = typeof s.result === 'string' ? safeParse(s.result) : s.result;
    });

    const step1Result = previousResults['appeal_axis'] || {};
    const knowledgeFields = {
      _rules_text: step1Result._rules_text || '',
      _refs_text: step1Result._refs_text || '',
      _patterns_text: step1Result._patterns_text || '',
    };

    // 4. Build webhook body
    const webhookUrl = WEBHOOK_URLS[stepKey];
    if (!webhookUrl) return;

    let body: any = { job_id: jobId };

    if (stepKey === 'appeal_axis') {
      body = {
        job_id: jobId,
        creative_type: jobData.creative_type,
        duration_seconds: jobData.duration_seconds,
        num_appeal_axes: jobData.num_appeal_axes,
        client_name: jobMeta.clientName,
        product_name: jobMeta.productName,
        project_name: jobMeta.projectName,
      };
    } else if (stepKey === 'copy') {
      body = {
        job_id: jobId,
        creative_type: jobData.creative_type,
        duration_seconds: jobData.duration_seconds,
        num_copies: jobData.num_copies,
        client_name: jobMeta.clientName,
        product_name: jobMeta.productName,
        project_name: jobMeta.projectName,
        previous_results: {
          appeal_axes: step1Result?.appeal_axes || [],
          ...knowledgeFields,
        },
      };
    } else if (stepKey === 'composition') {
      const step2Result = previousResults['copy'] || {};
      body = {
        job_id: jobId,
        creative_type: jobData.creative_type,
        duration_seconds: jobData.duration_seconds,
        client_name: jobMeta.clientName,
        product_name: jobMeta.productName,
        project_name: jobMeta.projectName,
        previous_results: {
          copies: step2Result?.copies || [],
          ...knowledgeFields,
        },
      };
    } else if (stepKey === 'narration_script') {
      const step2Result = previousResults['copy'] || {};
      const step3Result = previousResults['composition'] || {};
      body = {
        job_id: jobId,
        creative_type: jobData.creative_type,
        duration_seconds: jobData.duration_seconds,
        client_name: jobMeta.clientName,
        product_name: jobMeta.productName,
        project_name: jobMeta.projectName,
        previous_results: {
          appeal_axes: step1Result?.appeal_axes || [],
          copies: step2Result?.copies || [],
          compositions: step3Result?.compositions || [],
          ...knowledgeFields,
        },
      };
    }

    // 5. Call webhook
    try {
      console.log(`[Regenerate] Calling ${stepKey} webhook...`);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      console.log(`[Regenerate] ${stepKey} webhook called successfully`);
    } catch (e) {
      console.error(`[Regenerate] Failed to call ${stepKey} webhook:`, e);
    }

    // 6. Polling will automatically pick up the new status from gen_steps
  }, [jobId, jobData, pipeline, jobMeta]);

  const switchToAuto = useCallback(() => {
    setSwitchedToAuto(true);
    if (waitingForApproval >= 0) {
      handleApprove(waitingForApproval);
    }
  }, [waitingForApproval, handleApprove]);

  // ── Handle skip: mark step as skipped and trigger next step ──
  const handleSkipStep = useCallback(async (idx: number) => {
    if (!jobId || !jobData) return;

    const stepKey = pipeline[idx]?.stepKey;
    if (!stepKey) return;

    const dbKey = pipelineKeyToDbKey(stepKey);
    const genStep = genStepsData.find(gs => gs.step_key === dbKey);
    if (!genStep) return;

    // 1. Update gen_step status to skipped
    await supabase
      .from('gen_steps')
      .update({
        status: 'skipped',
        completed_at: new Date().toISOString(),
      })
      .eq('id', genStep.id);

    // 2. Update local UI
    setSkippedIndexes(prev => new Set(prev).add(idx));
    setErrorMap(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setActiveIndex(-1);

    // 3. Determine and trigger next step
    const ALL_STEP_KEYS = [...DATA_DRIVEN_STEP_KEYS];
    if (stepKey === 'narration') ALL_STEP_KEYS.splice(ALL_STEP_KEYS.indexOf('bgm_suggestion'), 0, 'narration');
    
    const currentOrderIdx = DATA_DRIVEN_STEP_KEYS.indexOf(stepKey);
    
    // For text steps, trigger next webhook
    if (TEXT_STEP_KEYS.includes(stepKey)) {
      const textIdx = TEXT_STEP_KEYS.indexOf(stepKey);
      if (textIdx < TEXT_STEP_KEYS.length - 1) {
        const nextKey = TEXT_STEP_KEYS[textIdx + 1];
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
      } else {
        // Last text step skipped → show voice selection for video, or start dummy for banner
        if (state.creativeType === 'video') {
          setVoiceSelectionPending(true);
        } else {
          dummyAnimationStartedRef.current = true;
          setDummyPhaseStarted(true);
          if (firstDummyIndex >= 0) setTimeout(() => setActiveIndex(firstDummyIndex), 300);
        }
      }
    } else if (stepKey === 'narration') {
      // Narration skipped → trigger BGM
      if (state.creativeType === 'video' && !wf6TriggeredRef.current) {
        wf6TriggeredRef.current = true;
        triggerBgmSuggestion();
      }
    } else if (stepKey === 'bgm_suggestion') {
      // BGM skipped → trigger Vcon
      if (state.creativeType === 'video' && !wf7TriggeredRef.current) {
        wf7TriggeredRef.current = true;
        triggerVcon();
      }
    } else if (stepKey === 'vcon') {
      // Vcon skipped → start dummy animations
      dummyAnimationStartedRef.current = true;
      setDummyPhaseStarted(true);
      const nextDummyIdx = pipeline.findIndex((s, i) => i > idx && !DATA_DRIVEN_STEP_KEYS.includes(s.stepKey) && s.stepKey !== 'narration');
      if (nextDummyIdx >= 0) setTimeout(() => setActiveIndex(nextDummyIdx), 300);
    }

    console.log(`[Skip] Skipped step ${stepKey}, triggering next step`);
  }, [jobId, jobData, pipeline, genStepsData, jobMeta, state.creativeType, firstDummyIndex, triggerBgmSuggestion, triggerVcon]);

  // ── Handle retry: reset failed step and re-trigger webhook ──
  const handleRetryStep = useCallback(async (idx: number) => {
    if (!jobId || !jobData) return;

    const stepKey = pipeline[idx]?.stepKey;
    if (!stepKey) return;

    // 1. Reset gen_step status
    await supabase
      .from('gen_steps')
      .update({
        status: 'pending',
        result: null,
        error_message: null,
        started_at: null,
        completed_at: null,
      })
      .eq('job_id', jobId)
      .eq('step_key', pipelineKeyToDbKey(stepKey));

    // 2. Reset local UI
    setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
    setSkippedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
    setErrorMap(prev => { const n = { ...prev }; delete n[idx]; return n; });

    // Reset webhook dedup refs
    const refMap: Record<string, React.MutableRefObject<boolean>> = {
      copy: step2TriggeredRef,
      composition: step3TriggeredRef,
      narration_script: step4TriggeredRef,
      bgm_suggestion: wf6TriggeredRef,
      vcon: wf7TriggeredRef,
    };
    if (refMap[stepKey]) refMap[stepKey].current = false;

    // 3. Build and call webhook
    const webhookUrl = WEBHOOK_URLS[pipelineKeyToDbKey(stepKey)];
    if (!webhookUrl) return;

    try {
      // For bgm_suggestion and vcon, use dedicated trigger functions
      if (stepKey === 'bgm_suggestion') {
        wf6TriggeredRef.current = true;
        await triggerBgmSuggestion();
        return;
      }
      if (stepKey === 'vcon') {
        wf7TriggeredRef.current = true;
        await triggerVcon();
        return;
      }

      // For text steps, build body with previous results
      const { data: allSteps } = await supabase
        .from('gen_steps')
        .select('step_key, result')
        .eq('job_id', jobId)
        .eq('status', 'completed');

      const previousResults: Record<string, any> = {};
      allSteps?.forEach((s: any) => {
        previousResults[s.step_key] = typeof s.result === 'string' ? safeParse(s.result) : s.result;
      });

      const step1Result = previousResults['appeal_axis'] || {};
      const knowledgeFields = {
        _rules_text: step1Result._rules_text || '',
        _refs_text: step1Result._refs_text || '',
        _patterns_text: step1Result._patterns_text || '',
      };

      let body: any = {
        job_id: jobId,
        creative_type: jobData.creative_type,
        duration_seconds: jobData.duration_seconds,
        num_appeal_axes: jobData.num_appeal_axes,
        num_copies: jobData.num_copies,
        num_tonmana: jobData.num_tonmana,
        client_name: jobMeta.clientName,
        product_name: jobMeta.productName,
        project_name: jobMeta.projectName,
      };

      if (stepKey === 'copy') {
        body.previous_results = { appeal_axes: step1Result?.appeal_axes || [], ...knowledgeFields };
      } else if (stepKey === 'composition') {
        body.previous_results = { copies: (previousResults['copy'] || {})?.copies || [], ...knowledgeFields };
      } else if (stepKey === 'narration_script') {
        body.previous_results = {
          appeal_axes: step1Result?.appeal_axes || [],
          copies: (previousResults['copy'] || {})?.copies || [],
          compositions: (previousResults['composition'] || {})?.compositions || [],
          ...knowledgeFields,
        };
      } else if (stepKey === 'narration_audio') {
        // For narration_audio, use the WF5 format
        body = { job_id: jobId, voice_id_a: '', voice_id_b: '' };
      }

      console.log(`[Retry] Calling ${stepKey} webhook...`);
      await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      console.log(`[Retry] ${stepKey} webhook called successfully`);
    } catch (e) {
      console.error(`[Retry] Failed to call ${stepKey} webhook:`, e);
    }
  }, [jobId, jobData, pipeline, jobMeta, triggerBgmSuggestion, triggerVcon]);

  // ── Handle style selection for styleframe ──
  const handleStyleSelected = useCallback((style: string) => {
    setStyleSelectionPending(false);
    console.log(`[StyleFrame] Selected style: ${style}`);
    // Start dummy animations for styleframe and beyond
    dummyAnimationStartedRef.current = true;
    setDummyPhaseStarted(true);
    const vconIdx = stepKeyToIndex.get('vcon') ?? -1;
    const nextDummyIdx = pipeline.findIndex((s, i) => i > vconIdx && !DATA_DRIVEN_STEP_KEYS.includes(s.stepKey) && s.stepKey !== 'narration');
    if (nextDummyIdx >= 0) {
      setTimeout(() => setActiveIndex(nextDummyIdx), 300);
    } else {
      setAllDone(true);
      setShowConfetti(true);
      clearInterval(timerRef.current);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [pipeline, stepKeyToIndex]);

  const refreshGenSteps = useCallback(async () => {
    if (!jobId) return;
    const { data: steps } = await supabase
      .from('gen_steps')
      .select('*')
      .eq('job_id', jobId)
      .order('step_number', { ascending: true });
    if (steps) setGenStepsData(steps as GenStepRow[]);
  }, [jobId]);

  // ── WF5: Trigger narration audio generation ──
  const triggerNarrationAudio = useCallback(async (voiceIdA: string, voiceIdB: string, gender: 'male' | 'female') => {
    if (!jobId) return;
    setVoiceGenerating(true);
    setVoiceSelectionPending(false);
    setSelectedGender(gender);

    // Set narration step as active
    const narrationIdx = stepKeyToIndex.get('narration');
    if (narrationIdx !== undefined) {
      setActiveIndex(narrationIdx);
    }

    try {
      const response = await fetch(WF5_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_id: jobId, voice_id_a: voiceIdA, voice_id_b: voiceIdB }),
      });
      console.log('[WF5] Response status:', response.status);

      // Start polling gen_patterns for narration_audio_url and narration_audio_url_b
      const pollAudio = async () => {
        const { data: patterns } = await supabase
          .from('gen_patterns')
          .select('id, pattern_id, narration_audio_url, narration_audio_url_b')
          .eq('job_id', jobId)
          .order('pattern_id', { ascending: true });

        if (!patterns) return false;

        const audioMapA: Record<string, string | null> = {};
        const audioMapB: Record<string, string | null> = {};
        let allDone = true;
        for (const p of patterns) {
          audioMapA[p.pattern_id] = p.narration_audio_url;
          audioMapB[p.pattern_id] = p.narration_audio_url_b;
          if (!p.narration_audio_url || !p.narration_audio_url_b) allDone = false;
        }
        setNarrationAudioMap(audioMapA);
        setNarrationAudioMapB(audioMapB);
        return allDone;
      };

      // Poll every 3 seconds
      const audioInterval = setInterval(async () => {
        const done = await pollAudio();
        if (done) {
          clearInterval(audioInterval);
          setVoiceGenerating(false);
          // Mark narration step as completed
          if (narrationIdx !== undefined) {
            setCompletedIndexes(prev => new Set(prev).add(narrationIdx));
            setSelectedStepIndex(narrationIdx);
            setActiveIndex(-1);

            // Trigger WF6 (BGM suggestion) for video jobs
            if (state.creativeType === 'video' && !wf6TriggeredRef.current) {
              wf6TriggeredRef.current = true;
              triggerBgmSuggestion();
            }

            // Wait for approval before proceeding
            if (!effectiveAutoMode) {
              setWaitingForApproval(narrationIdx);
            }
            // In auto mode, polling will detect bgm_suggestion completion and start dummy phase
          }
        }
      }, 3000);

      // Also do an immediate check
      await pollAudio();
    } catch (e) {
      console.error('[WF5] Failed:', e);
      setVoiceGenerating(false);
    }
  }, [jobId, pipeline, stepKeyToIndex, effectiveAutoMode]);

  const handleStepClick = (idx: number) => {
    // Allow clicking on completed, skipped, errored, or in-progress steps
    const pipelineStep = pipeline[idx];
    const genStep = pipelineStep ? genStepsData.find(gs => gs.step_key === pipelineStep.stepKey) : null;
    const hasStatus = completedIndexes.has(idx) || skippedIndexes.has(idx) || !!errorMap[idx] ||
      (genStep && (genStep.status === 'processing' || genStep.status === 'in_progress'));
    if (hasStatus || completedIndexes.has(idx)) {
      userSelectedStepRef.current = idx;
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

  // Get appeal_axis step result for cross-referencing in copy display
  const appealAxesStepResult = (() => {
    const genStep = genStepsData.find(gs => gs.step_key === 'appeal_axis');
    if (!genStep?.result) return null;
    try {
      const r = typeof genStep.result === 'string' ? JSON.parse(genStep.result as string) : genStep.result;
      return r;
    } catch { return null; }
  })();

  // Get copy step result for cross-referencing in storyboard/NA display
  const copyStepResult = (() => {
    const genStep = genStepsData.find(gs => gs.step_key === 'copy');
    if (!genStep?.result) return null;
    try {
      const r = typeof genStep.result === 'string' ? JSON.parse(genStep.result as string) : genStep.result;
      return r;
    } catch { return null; }
  })();

  // Get composition step result for cross-referencing in NA script display
  const compositionStepResult = (() => {
    const genStep = genStepsData.find(gs => gs.step_key === 'composition');
    if (!genStep?.result) return null;
    try {
      const r = typeof genStep.result === 'string' ? JSON.parse(genStep.result as string) : genStep.result;
      return r;
    } catch { return null; }
  })();

  // Get narration_script step result for narration audio preview
  const narrationScriptStepResult = (() => {
    const genStep = genStepsData.find(gs => gs.step_key === 'narration_script');
    if (!genStep?.result) return null;
    try {
      const r = typeof genStep.result === 'string' ? JSON.parse(genStep.result as string) : genStep.result;
      return r;
    } catch { return null; }
  })();

  // Summary line with real names
  const typeLabel = state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー';
  const patternLabel = state.productionPattern === 'new' ? '新規制作' : 'パターン展開';
  const summaryLine = `${typeLabel} / ${jobMeta.clientName} / ${jobMeta.productName} / ${jobMeta.projectName} / ${patternLabel} / 合計${total}本`;

  const completedCount = completedIndexes.size + skippedIndexes.size;
  const progressPct = Math.round((completedCount / pipeline.length) * 100);
  const elapsedStr = `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`;
  const avgPerStep = completedCount > 0 ? elapsed / completedCount : 0;
  const remainingSteps = pipeline.length - completedCount;
  const estRemaining = Math.max(0, avgPerStep * remainingSteps);
  const remainStr = `${Math.floor(estRemaining / 60000)}:${String(Math.floor((estRemaining % 60000) / 1000)).padStart(2, '0')}`;

  // Narration progress from polling data
  const narrationProgress = (() => {
    const entries = Object.entries(narrationAudioMap);
    if (entries.length === 0 && !voiceGenerating) return null;
    const totalPatterns = entries.length || total;
    const completedPatterns = entries.filter(([, url]) => !!url).length;
    return { completed: completedPatterns, total: totalPatterns };
  })();

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
                    skippedIndexes={skippedIndexes}
                    selectedStepIndex={selectedStepIndex} countUpValues={countUpValues} total={total}
                    progressPct={progressPct} completedCount={completedCount} elapsedStr={elapsedStr}
                    remainStr={remainStr} allDone={allDone} effectiveAutoMode={effectiveAutoMode}
                    errorMap={errorMap} narrationProgress={narrationProgress} onStepClick={handleStepClick} onSwitchToAuto={switchToAuto}
                    onSkipStep={handleSkipStep}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        <div className="flex-1 overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline} selectedStepIndex={selectedStepIndex} completedIndexes={completedIndexes}
            skippedIndexes={skippedIndexes}
            allDone={allDone} total={total} state={state} waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode} genStepResult={selectedGenStepResult} appealAxesResult={appealAxesStepResult}
            copyStepResult={copyStepResult} compositionStepResult={compositionStepResult} narrationScriptResult={narrationScriptStepResult}
            jobId={jobId} onApprove={handleApprove} onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto} onNavigateDashboard={() => navigate('/')}
            onResultUpdated={refreshGenSteps}
            voiceSelectionPending={voiceSelectionPending} voiceGenerating={voiceGenerating}
            narrationAudioMap={narrationAudioMap} narrationAudioMapB={narrationAudioMapB} selectedGender={selectedGender}
            onTriggerNarrationAudio={triggerNarrationAudio}
            errorMap={errorMap} genStepsData={genStepsData}
            onSkipStep={handleSkipStep} onRetryStep={handleRetryStep}
            styleSelectionPending={styleSelectionPending} onStyleSelected={handleStyleSelected}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        <div className="w-[40%] border-r border-border overflow-y-auto p-4">
          <PipelineTimeline
            pipeline={pipeline} activeIndex={activeIndex} completedIndexes={completedIndexes}
            skippedIndexes={skippedIndexes}
            selectedStepIndex={selectedStepIndex} countUpValues={countUpValues} total={total}
            progressPct={progressPct} completedCount={completedCount} elapsedStr={elapsedStr}
            remainStr={remainStr} allDone={allDone} effectiveAutoMode={effectiveAutoMode}
            errorMap={errorMap} narrationProgress={narrationProgress} onStepClick={handleStepClick} onSwitchToAuto={switchToAuto}
            onSkipStep={handleSkipStep}
          />
        </div>
        <div className="w-[60%] overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline} selectedStepIndex={selectedStepIndex} completedIndexes={completedIndexes}
            skippedIndexes={skippedIndexes}
            allDone={allDone} total={total} state={state} waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode} genStepResult={selectedGenStepResult} appealAxesResult={appealAxesStepResult}
            copyStepResult={copyStepResult} compositionStepResult={compositionStepResult} narrationScriptResult={narrationScriptStepResult}
            jobId={jobId} onApprove={handleApprove} onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto} onNavigateDashboard={() => navigate('/')}
            onResultUpdated={refreshGenSteps}
            voiceSelectionPending={voiceSelectionPending} voiceGenerating={voiceGenerating}
            narrationAudioMap={narrationAudioMap} narrationAudioMapB={narrationAudioMapB} selectedGender={selectedGender}
            onTriggerNarrationAudio={triggerNarrationAudio}
            errorMap={errorMap} genStepsData={genStepsData}
            onSkipStep={handleSkipStep} onRetryStep={handleRetryStep}
            styleSelectionPending={styleSelectionPending} onStyleSelected={handleStyleSelected}
          />
        </div>
      </div>
    </div>
  );
};

export default GenerateProgress;
