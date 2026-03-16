import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Type, Palette, Image, Film, FileText, Mic, Music,
  Play, PenTool, Monitor, Smartphone, LayoutTemplate, Check,
  Sparkles, ChevronDown, ChevronUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
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
}

export const makeBannerPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      icon: Target, label: '訴求軸作成', demoSeconds: 2, stepType: 'text',
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 着圧効果で美脚を実現', '② 履くだけで-3cm細見え', '③ 24時間快適な着用感'],
    },
    {
      icon: Type, label: 'コピー作成', demoSeconds: 3, stepType: 'text',
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました（${s.appealAxis}訴求軸 × ${s.copyPatterns}コピー）`,
      details: ['「美脚革命、始めませんか？」', '「-3cmの自信、履くだけで。」', '「24時間、美しいラインをキープ」'],
    },
    {
      icon: LayoutTemplate, label: '構成案作成', demoSeconds: 3, stepType: 'text',
      runningText: 'バナーの構成案を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案を作成しました`,
    },
    {
      icon: Palette, label: 'トンマナ作成', demoSeconds: 2, stepType: 'visual',
      runningText: 'トーン＆マナーのバリエーションを生成しています...',
      completedText: `${s.tonePatterns}パターンのトンマナを生成しました`,
      details: ['① クール・モダン（ダークネイビー × ホワイト）', '② ナチュラル・フェミニン（ピンクベージュ × ライトグレー）'],
    },
    {
      icon: Image, label: '静止画バナー作成', demoSeconds: 5, countUp: true, stepType: 'visual',
      runningText: `最終バナーを生成しています... (0/${total})`,
      completedText: `${total}本のバナーを生成しました ✓`,
    },
  ];
};

export const makeVideoPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      icon: Target, label: '訴求軸作成', demoSeconds: 2, stepType: 'text',
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 未経験からエンジニア転職を実現', '② 年収400万→600万のキャリアアップ', '③ 最短3ヶ月でIT業界デビュー'],
    },
    {
      icon: Type, label: 'コピー作成', demoSeconds: 3, stepType: 'text',
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました`,
    },
    {
      icon: Film, label: '構成案・字コンテ作成', demoSeconds: 4, stepType: 'text',
      runningText: '動画の構成案と字コンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案・字コンテを作成しました`,
      extra: '構成: 4シーン（Hook → Problem → Solution → CTA）',
    },
    {
      icon: FileText, label: 'NA原稿作成', demoSeconds: 3, stepType: 'text',
      runningText: 'ナレーション原稿を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのNA原稿を作成しました`,
      extra: `平均文字数: ${s.videoDuration === 15 ? 60 : s.videoDuration === 30 ? 120 : 240}文字（${s.videoDuration}秒尺）`,
    },
    {
      icon: Mic, label: 'ナレーション作成', demoSeconds: 4, stepType: 'audio',
      runningText: 'AI音声でナレーションを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのナレーション音声を生成しました`,
      extra: '音声タイプ: 女性ナチュラル',
    },
    {
      icon: Music, label: 'BGM提案', demoSeconds: 2, stepType: 'audio',
      runningText: '有料素材ライブラリからBGMを自動抽出しています...',
      completedText: '3曲のBGM候補を抽出しました',
      details: ['① アップテンポ・ポジティブ（BPM 120）', '② エモーショナル・ドラマティック（BPM 90）', '③ クール・テクノ（BPM 130）'],
    },
    {
      icon: Play, label: 'Vコン作成', demoSeconds: 5, stepType: 'visual',
      runningText: 'ビデオコンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのVコンを作成しました`,
      extra: '字コンテ + NA + BGMの統合',
    },
    {
      icon: Palette, label: 'スタイルフレーム作成', demoSeconds: 3, stepType: 'visual',
      runningText: 'スタイルフレーム（トンマナデザイン）を生成しています...',
      completedText: `${s.tonePatterns}パターンのスタイルフレームを生成しました`,
      details: ['① クリーン・コーポレート', '② カジュアル・ポップ'],
    },
    {
      icon: PenTool, label: '絵コンテ作成', demoSeconds: 4, stepType: 'visual',
      runningText: '絵コンテ（トンマナデザイン適用）を作成しています...',
      completedText: `${total}パターンの絵コンテを作成しました`,
    },
    {
      icon: Monitor, label: '横動画作成', demoSeconds: 6, countUp: true, stepType: 'visual',
      runningText: `横動画（16:9）を生成しています... (0/${total})`,
      completedText: `${total}本の横動画を生成しました`,
      extra: `解像度: 1920 × 1080 / ${s.videoDuration}秒`,
    },
    {
      icon: Smartphone, label: '縦動画・リサイズ', demoSeconds: 4, countUp: true, stepType: 'visual',
      runningText: `縦動画（9:16）にリサイズしています... (0/${total})`,
      completedText: `${total}本の縦動画を生成しました`,
      extra: `解像度: 1080 × 1920 / ${s.videoDuration}秒`,
    },
  ];
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

/* ─── Main Component ─── */

const GenerateProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const wizardState = (location.state as { wizardState: WizardState } | null)?.wizardState;

  const state: WizardState = wizardState ?? {
    creativeType: 'video', videoDuration: 30, clientId: 'leverages', productId: 'levtech-rookie',
    projectId: 'expo-2026', referenceIds: [], referenceUrls: [], productionPattern: 'new',
    baseCreativeId: null, productionCount: 18, appealAxis: 3, copyPatterns: 3, tonePatterns: 2,
    generationMode: 'auto',
  };

  const total = state.appealAxis * state.copyPatterns * state.tonePatterns;
  const pipeline = state.creativeType === 'video' ? makeVideoPipeline(state) : makeBannerPipeline(state);
  const isAutoMode = state.generationMode === 'auto';

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
  const [mobileTimelineOpen, setMobileTimelineOpen] = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval>>();

  const effectiveAutoMode = isAutoMode || switchedToAuto;

  // Elapsed timer
  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(Date.now() - startTime), 1000);
    return () => clearInterval(timerRef.current);
  }, [startTime]);

  // Start first step
  useEffect(() => {
    const t = setTimeout(() => setActiveIndex(0), 500);
    return () => clearTimeout(t);
  }, []);

  // Run current step
  useEffect(() => {
    if (activeIndex < 0 || activeIndex >= pipeline.length) return;
    if (completedIndexes.has(activeIndex)) return;

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

      // Auto-select completed step for preview
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
  }, [activeIndex, effectiveAutoMode, completedIndexes]);

  const handleApprove = useCallback((idx: number) => {
    setWaitingForApproval(-1);
    if (idx + 1 < pipeline.length) {
      setTimeout(() => setActiveIndex(idx + 1), 300);
    } else {
      setAllDone(true);
      setShowConfetti(true);
      clearInterval(timerRef.current);
      setTimeout(() => setShowConfetti(false), 3500);
    }
  }, [pipeline.length]);

  const handleRegenerate = useCallback((idx: number) => {
    setCompletedIndexes(prev => { const s = new Set(prev); s.delete(idx); return s; });
    setWaitingForApproval(-1);
    setCountUpValues(prev => { const n = { ...prev }; delete n[idx]; return n; });
    setActiveIndex(-1);
    setTimeout(() => setActiveIndex(idx), 100);
  }, []);

  const switchToAuto = () => {
    setSwitchedToAuto(true);
    if (waitingForApproval >= 0) {
      handleApprove(waitingForApproval);
    }
  };

  const handleStepClick = (idx: number) => {
    if (completedIndexes.has(idx)) {
      setSelectedStepIndex(idx);
      // On mobile, collapse timeline when selecting a step
      setMobileTimelineOpen(false);
    }
  };

  // Summary line
  // These are display-only labels for the progress page summary line
  const client = { name: state.clientId ?? '—' };
  const product = { name: state.productId ?? '—' };
  const project = { name: state.projectId ?? '—' };
  const typeLabel = state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー';
  const patternLabel = state.productionPattern === 'new' ? '新規制作' : 'パターン展開';
  const summaryLine = `${typeLabel} / ${client?.name ?? '—'} / ${product?.name ?? '—'} / ${project?.name ?? '—'} / ${patternLabel} / 合計${total}本`;

  const completedCount = completedIndexes.size;
  const progressPct = Math.round((completedCount / pipeline.length) * 100);
  const elapsedStr = `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`;
  const avgPerStep = completedCount > 0 ? elapsed / completedCount : 0;
  const remainingSteps = pipeline.length - completedCount;
  const estRemaining = Math.max(0, avgPerStep * remainingSteps);
  const remainStr = `${Math.floor(estRemaining / 60000)}:${String(Math.floor((estRemaining % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="h-[calc(100vh-56px)] flex flex-col">
      {showConfetti && <Confetti />}

      {/* Summary header */}
      <div className="shrink-0 border-b border-border px-4 py-2">
        <p className="text-sm text-muted-foreground truncate">{summaryLine}</p>
      </div>

      {/* Mobile layout */}
      <div className="lg:hidden flex flex-col h-full overflow-hidden">
        {/* Collapsible timeline */}
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
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: 'auto' }}
                exit={{ height: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 max-h-[40vh] overflow-y-auto">
                  <PipelineTimeline
                    pipeline={pipeline}
                    activeIndex={activeIndex}
                    completedIndexes={completedIndexes}
                    selectedStepIndex={selectedStepIndex}
                    countUpValues={countUpValues}
                    total={total}
                    progressPct={progressPct}
                    completedCount={completedCount}
                    elapsedStr={elapsedStr}
                    remainStr={remainStr}
                    allDone={allDone}
                    effectiveAutoMode={effectiveAutoMode}
                    onStepClick={handleStepClick}
                    onSwitchToAuto={switchToAuto}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Preview */}
        <div className="flex-1 overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline}
            selectedStepIndex={selectedStepIndex}
            completedIndexes={completedIndexes}
            allDone={allDone}
            total={total}
            state={state}
            waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode}
            onApprove={handleApprove}
            onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto}
            onNavigateDashboard={() => navigate('/')}
          />
        </div>
      </div>

      {/* Desktop layout */}
      <div className="hidden lg:flex flex-1 overflow-hidden">
        {/* Left panel - 40% */}
        <div className="w-[40%] border-r border-border overflow-y-auto p-4">
          <PipelineTimeline
            pipeline={pipeline}
            activeIndex={activeIndex}
            completedIndexes={completedIndexes}
            selectedStepIndex={selectedStepIndex}
            countUpValues={countUpValues}
            total={total}
            progressPct={progressPct}
            completedCount={completedCount}
            elapsedStr={elapsedStr}
            remainStr={remainStr}
            allDone={allDone}
            effectiveAutoMode={effectiveAutoMode}
            onStepClick={handleStepClick}
            onSwitchToAuto={switchToAuto}
          />
        </div>

        {/* Right panel - 60% */}
        <div className="w-[60%] overflow-y-auto">
          <PreviewPanel
            pipeline={pipeline}
            selectedStepIndex={selectedStepIndex}
            completedIndexes={completedIndexes}
            allDone={allDone}
            total={total}
            state={state}
            waitingForApproval={waitingForApproval}
            effectiveAutoMode={effectiveAutoMode}
            onApprove={handleApprove}
            onRegenerate={handleRegenerate}
            onSwitchToAuto={switchToAuto}
            onNavigateDashboard={() => navigate('/')}
          />
        </div>
      </div>
    </div>
  );
};

export default GenerateProgress;
