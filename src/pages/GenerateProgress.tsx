import { useState, useEffect, useCallback, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Target, Type, Palette, Image, Film, FileText, Mic, Music,
  Play, PenTool, Monitor, Smartphone, LayoutTemplate, Check,
  Sparkles, RefreshCw, X, Pencil, Frame,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { type WizardState, clients, products, projects } from '@/data/wizard-data';

/* ─── Pipeline definitions ─── */

interface PipelineStep {
  icon: React.ElementType;
  label: string;
  runningText: string;
  completedText: string;
  details?: string[];
  extra?: string;
  demoSeconds: number;
  countUp?: boolean;
}

const makeBannerPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      icon: Target, label: '訴求軸作成', demoSeconds: 2,
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 着圧効果で美脚を実現', '② 履くだけで-3cm細見え', '③ 24時間快適な着用感'],
    },
    {
      icon: Type, label: 'コピー作成', demoSeconds: 3,
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました（${s.appealAxis}訴求軸 × ${s.copyPatterns}コピー）`,
      details: ['「美脚革命、始めませんか？」', '「-3cmの自信、履くだけで。」', '「24時間、美しいラインをキープ」'],
    },
    {
      icon: LayoutTemplate, label: '構成案作成', demoSeconds: 3,
      runningText: 'バナーの構成案を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案を作成しました`,
    },
    {
      icon: Palette, label: 'トンマナ作成', demoSeconds: 2,
      runningText: 'トーン＆マナーのバリエーションを生成しています...',
      completedText: `${s.tonePatterns}パターンのトンマナを生成しました`,
      details: ['① クール・モダン（ダークネイビー × ホワイト）', '② ナチュラル・フェミニン（ピンクベージュ × ライトグレー）'],
    },
    {
      icon: Image, label: '静止画バナー作成', demoSeconds: 5, countUp: true,
      runningText: `最終バナーを生成しています... (0/${total})`,
      completedText: `${total}本のバナーを生成しました ✓`,
    },
  ];
};

const makeVideoPipeline = (s: WizardState): PipelineStep[] => {
  const total = s.appealAxis * s.copyPatterns * s.tonePatterns;
  return [
    {
      icon: Target, label: '訴求軸作成', demoSeconds: 2,
      runningText: 'AIが訴求軸を生成しています...',
      completedText: `${s.appealAxis}つの訴求軸を生成しました`,
      details: ['① 未経験からエンジニア転職を実現', '② 年収400万→600万のキャリアアップ', '③ 最短3ヶ月でIT業界デビュー'],
    },
    {
      icon: Type, label: 'コピー作成', demoSeconds: 3,
      runningText: '各訴求軸に対するコピーを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのコピーを生成しました`,
    },
    {
      icon: Film, label: '構成案・字コンテ作成', demoSeconds: 4,
      runningText: '動画の構成案と字コンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンの構成案・字コンテを作成しました`,
      extra: '構成: 4シーン（Hook → Problem → Solution → CTA）',
    },
    {
      icon: FileText, label: 'NA原稿作成', demoSeconds: 3,
      runningText: 'ナレーション原稿を作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのNA原稿を作成しました`,
      extra: `平均文字数: ${s.videoDuration === 15 ? 60 : s.videoDuration === 30 ? 120 : 240}文字（${s.videoDuration}秒尺）`,
    },
    {
      icon: Mic, label: 'ナレーション作成', demoSeconds: 4,
      runningText: 'AI音声でナレーションを生成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのナレーション音声を生成しました`,
      extra: '音声タイプ: 女性ナチュラル',
    },
    {
      icon: Music, label: 'BGM提案', demoSeconds: 2,
      runningText: '有料素材ライブラリからBGMを自動抽出しています...',
      completedText: '3曲のBGM候補を抽出しました',
      details: ['① アップテンポ・ポジティブ（BPM 120）', '② エモーショナル・ドラマティック（BPM 90）', '③ クール・テクノ（BPM 130）'],
    },
    {
      icon: Play, label: 'Vコン作成', demoSeconds: 5,
      runningText: 'ビデオコンテを作成しています...',
      completedText: `${s.appealAxis * s.copyPatterns}パターンのVコンを作成しました`,
      extra: '字コンテ + NA + BGMの統合',
    },
    {
      icon: Frame, label: 'スタイルフレーム作成', demoSeconds: 3,
      runningText: 'スタイルフレーム（トンマナデザイン）を生成しています...',
      completedText: `${s.tonePatterns}パターンのスタイルフレームを生成しました`,
      details: ['① クリーン・コーポレート', '② カジュアル・ポップ'],
    },
    {
      icon: PenTool, label: '絵コンテ作成', demoSeconds: 4,
      runningText: '絵コンテ（トンマナデザイン適用）を作成しています...',
      completedText: `${total}パターンの絵コンテを作成しました`,
    },
    {
      icon: Monitor, label: '横動画作成', demoSeconds: 6, countUp: true,
      runningText: `横動画（16:9）を生成しています... (0/${total})`,
      completedText: `${total}本の横動画を生成しました`,
      extra: `解像度: 1920 × 1080 / ${s.videoDuration}秒`,
    },
    {
      icon: Smartphone, label: '縦動画・リサイズ', demoSeconds: 4, countUp: true,
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

/* ─── Step Card for Step-Confirm Mode ─── */

interface StepDetailProps {
  step: PipelineStep;
  onApprove: () => void;
  onRegenerate: () => void;
}

const StepDetailPanel = ({ step, onApprove, onRegenerate }: StepDetailProps) => {
  const [items, setItems] = useState<{ text: string; accepted: boolean; editing: boolean; editText: string }[]>(
    () => (step.details ?? []).map(d => ({ text: d, accepted: true, editing: false, editText: d }))
  );

  const toggleAccept = (i: number) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, accepted: !it.accepted } : it));
  const startEdit = (i: number) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, editing: true, editText: it.text } : it));
  const saveEdit = (i: number) => setItems(prev => prev.map((it, idx) => idx === i ? { ...it, editing: false, text: it.editText } : it));

  const hasEdits = items.some((it, i) => it.text !== (step.details?.[i] ?? ''));

  return (
    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mt-4 space-y-3">
        {items.length > 0 && (
          <div className="space-y-2">
            {items.map((it, i) => (
              <div key={i} className={cn("flex items-center gap-2 rounded-lg border p-3 text-sm transition-all", it.accepted ? 'bg-card' : 'bg-muted/50 opacity-60')}>
                <button onClick={() => toggleAccept(i)} className={cn("shrink-0 rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold", it.accepted ? 'bg-success text-success-foreground' : 'bg-destructive text-destructive-foreground')}>
                  {it.accepted ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                </button>
                {it.editing ? (
                  <input value={it.editText} onChange={e => setItems(prev => prev.map((x, idx) => idx === i ? { ...x, editText: e.target.value } : x))} onBlur={() => saveEdit(i)} onKeyDown={e => e.key === 'Enter' && saveEdit(i)} className="flex-1 bg-transparent border-b border-secondary outline-none text-sm" autoFocus />
                ) : (
                  <span className="flex-1">{it.text}</span>
                )}
                {!it.editing && (
                  <button onClick={() => startEdit(i)} className="text-muted-foreground hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>
                )}
              </div>
            ))}
          </div>
        )}
        {step.extra && <p className="text-xs text-muted-foreground">{step.extra}</p>}
        <div className="flex items-center gap-2 pt-2">
          <Button variant="brand" size="sm" onClick={onApprove}>承認して次へ進む</Button>
          <Button variant="outline" size="sm" onClick={onRegenerate}><RefreshCw className="h-3.5 w-3.5 mr-1" />この工程を再生成</Button>
          {hasEdits && <Button variant="outline" size="sm">編集内容を保存</Button>}
        </div>
      </div>
    </motion.div>
  );
};

/* ─── Main Component ─── */

const GenerateProgress = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const wizardState = (location.state as { wizardState: WizardState } | null)?.wizardState;

  // Fallback if no state
  const state: WizardState = wizardState ?? {
    creativeType: 'video', videoDuration: 30, clientId: 'leverages', productId: 'levtech-rookie',
    projectId: 'expo-2026', referenceIds: [], referenceUrls: [], productionPattern: 'new',
    baseCreativeId: null, productionCount: 18, appealAxis: 3, copyPatterns: 3, tonePatterns: 2,
    generationMode: 'auto',
  };

  const total = state.appealAxis * state.copyPatterns * state.tonePatterns;
  const pipeline = state.creativeType === 'video' ? makeVideoPipeline(state) : makeBannerPipeline(state);
  const isAutoMode = state.generationMode === 'auto';

  const [activeIndex, setActiveIndex] = useState(-1); // -1 = not started
  const [completedIndexes, setCompletedIndexes] = useState<Set<number>>(new Set());
  const [waitingForApproval, setWaitingForApproval] = useState(-1);
  const [countUpValues, setCountUpValues] = useState<Record<number, number>>({});
  const [allDone, setAllDone] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [startTime] = useState(Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [switchedToAuto, setSwitchedToAuto] = useState(false);
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

    // Count-up animation
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

      if (effectiveAutoMode) {
        // Auto: move to next
        if (activeIndex + 1 < pipeline.length) {
          setTimeout(() => setActiveIndex(activeIndex + 1), 300);
        } else {
          setAllDone(true);
          setShowConfetti(true);
          clearInterval(timerRef.current);
          setTimeout(() => setShowConfetti(false), 3500);
        }
      } else {
        // Step mode: wait for approval
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
    // Re-trigger by setting activeIndex again
    setActiveIndex(-1);
    setTimeout(() => setActiveIndex(idx), 100);
  }, []);

  const switchToAuto = () => {
    setSwitchedToAuto(true);
    if (waitingForApproval >= 0) {
      handleApprove(waitingForApproval);
    }
  };

  // Summary line
  const client = clients.find(c => c.id === state.clientId);
  const product = state.clientId ? (products[state.clientId] ?? []).find(p => p.id === state.productId) : null;
  const project = state.productId ? (projects[state.productId] ?? []).find(p => p.id === state.projectId) : null;

  const typeLabel = state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー';
  const patternLabel = state.productionPattern === 'new' ? '新規制作' : 'パターン展開';
  const summaryLine = `${typeLabel} / ${client?.name ?? '—'} / ${product?.name ?? '—'} / ${project?.name ?? '—'} / ${patternLabel} / 合計${total}本`;

  const completedCount = completedIndexes.size;
  const progressPct = Math.round((completedCount / pipeline.length) * 100);
  const elapsedStr = `${Math.floor(elapsed / 60000)}:${String(Math.floor((elapsed % 60000) / 1000)).padStart(2, '0')}`;

  // Estimate remaining
  const avgPerStep = completedCount > 0 ? elapsed / completedCount : 0;
  const remainingSteps = pipeline.length - completedCount;
  const estRemaining = Math.max(0, avgPerStep * remainingSteps);
  const remainStr = `${Math.floor(estRemaining / 60000)}:${String(Math.floor((estRemaining % 60000) / 1000)).padStart(2, '0')}`;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {showConfetti && <Confetti />}

      {/* Summary header */}
      <div className="rounded-xl border bg-card px-4 py-3">
        <p className="text-sm text-muted-foreground truncate">{summaryLine}</p>
      </div>

      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">生成進捗: <span className="text-secondary">{progressPct}%</span>（{completedCount}/{pipeline.length}工程）</span>
          <span className="text-muted-foreground">
            経過: {elapsedStr}
            {!allDone && completedCount > 0 && <> / 残り: 約{remainStr}</>}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
          <motion.div
            className="h-full rounded-full brand-gradient-bg"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 1, ease: 'easeOut' }}
          />
        </div>
      </div>

      {/* Step confirm mode: switch to auto link */}
      {!effectiveAutoMode && !allDone && (
        <div className="text-right">
          <button onClick={switchToAuto} className="text-sm text-secondary hover:underline">残りを全自動で実行</button>
        </div>
      )}

      {/* Timeline */}
      <div className="relative pl-8">
        {/* Vertical line */}
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

        {pipeline.map((step, i) => {
          const isDone = completedIndexes.has(i);
          const isRunning = activeIndex === i && !isDone;
          const isWaiting = !isDone && !isRunning;
          const isWaitingApproval = waitingForApproval === i;
          const StepIcon = step.icon;

          const runText = step.countUp && countUpValues[i] !== undefined
            ? step.runningText.replace(`(0/${total})`, `(${countUpValues[i]}/${total})`)
            : step.runningText;

          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.3 }}
              className="relative mb-4 last:mb-0"
            >
              {/* Timeline dot */}
              <div className="absolute -left-8 top-4 flex items-center justify-center">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="w-[30px] h-[30px] rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 text-success-foreground" />
                  </motion.div>
                ) : isRunning ? (
                  <div className="w-[30px] h-[30px] rounded-full bg-secondary flex items-center justify-center animate-pulse">
                    <StepIcon className="h-4 w-4 text-secondary-foreground animate-spin-slow" />
                  </div>
                ) : (
                  <div className="w-[30px] h-[30px] rounded-full bg-muted flex items-center justify-center">
                    <StepIcon className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Card */}
              <div className={cn(
                "rounded-xl border p-4 transition-all duration-300 ml-2",
                isDone && 'bg-success-wash/50 border-success/30',
                isRunning && 'bg-secondary-wash/50 border-secondary/30',
                isWaiting && 'bg-card border-border',
              )}>
                <div className="flex items-center gap-2">
                  <StepIcon className={cn("h-4 w-4", isDone ? 'text-success' : isRunning ? 'text-secondary' : 'text-muted-foreground')} />
                  <span className={cn("font-medium text-sm", isWaiting && 'text-muted-foreground')}>{step.label}</span>
                </div>

                {isRunning && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 space-y-2">
                    <p className="text-sm text-secondary">{runText}</p>
                    <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                      <motion.div
                        className="h-full rounded-full bg-secondary"
                        initial={{ width: '5%' }}
                        animate={{ width: '90%' }}
                        transition={{ duration: step.demoSeconds - 0.3, ease: 'linear' }}
                      />
                    </div>
                  </motion.div>
                )}

                {isDone && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2">
                    <p className="text-sm text-success font-medium">{step.completedText}</p>
                    {step.details && !isWaitingApproval && (
                      <ul className="mt-1 space-y-0.5">
                        {step.details.map((d, j) => (
                          <li key={j} className="text-xs text-muted-foreground">{d}</li>
                        ))}
                      </ul>
                    )}
                    {step.extra && !isWaitingApproval && (
                      <p className="text-xs text-muted-foreground mt-1">{step.extra}</p>
                    )}
                  </motion.div>
                )}

                {/* Step confirm mode: detail panel */}
                {isWaitingApproval && (
                  <StepDetailPanel
                    step={step}
                    onApprove={() => handleApprove(i)}
                    onRegenerate={() => handleRegenerate(i)}
                  />
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* All done */}
      <AnimatePresence>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center space-y-4 py-8"
          >
            <p className="text-2xl font-bold font-display">🎉 すべての生成が完了しました！</p>
            <p className="text-muted-foreground text-sm">合計 {total}本 のクリエイティブを生成しました（{elapsedStr}）</p>
            <div className="flex justify-center gap-4">
              <Button variant="brand" size="lg" onClick={() => alert('結果画面は次フェーズで実装予定')}>
                結果を確認する
              </Button>
            </div>
            <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground underline">
              ダッシュボードに戻る
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GenerateProgress;
