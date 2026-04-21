import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Sparkles, FolderOpen, ChevronRight, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SpotWizardState } from '@/hooks/useSpotWizard';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import SpotStepTarget from '@/components/spot/SpotStepTarget';
import SpotStepDataCollection from '@/components/spot/SpotStepDataCollection';
import { Button } from '@/components/ui/button';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { clearJobIdFromUrl } from '@/lib/spot-url';

export interface WizardRenderContext {
  state: SpotWizardState;
  context: ReturnType<typeof useProjectContext>['context'];
  goToStep: (n: number) => void;
  goNext: () => void;
  goBack: () => void;
}

interface SpotToolWizardProps {
  toolTitle: string;
  toolDescription: string;
  toolEmoji?: string;
  toolType: string;
  state: SpotWizardState;
  updateState: (u: Partial<SpotWizardState>) => void;
  renderSettings: (ctx: WizardRenderContext) => ReactNode;
  renderResult: (ctx: WizardRenderContext) => ReactNode;
  jobId: string | null;
  onRestoreJob?: (jobId: string, projectId: string, inputData: Record<string, unknown>) => void;
}

const STEPS = [
  { label: 'クライアント・商材・案件' },
  { label: 'データ収集' },
  { label: '設定' },
  { label: '生成結果' },
];

interface RestorationNotice {
  jobId: string;
  clientName: string;
  productName: string;
  projectName: string;
}

const SpotToolWizard = ({
  toolTitle,
  toolDescription,
  toolEmoji,
  toolType,
  state,
  updateState,
  renderSettings,
  renderResult,
  jobId,
  onRestoreJob,
}: SpotToolWizardProps) => {
  const { context } = useProjectContext(state.projectId);
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [didInitialJump, setDidInitialJump] = useState(false);
  const [restorationNotice, setRestorationNotice] = useState<RestorationNotice | null>(null);
  const restoredRef = useRef(false);

  // 初回マウント時、state が全て埋まっていれば STEP3 (index 2) にジャンプ
  useEffect(() => {
    if (didInitialJump) return;
    if (jobId) return;
    if (state.clientId && state.productId && state.projectId) {
      setCurrentStep(2);
      setDidInitialJump(true);
    }
  }, [state.clientId, state.productId, state.projectId, didInitialJump, jobId]);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((p) => Math.min(p + 1, STEPS.length - 1));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep((p) => Math.max(p - 1, 0));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  // URLクエリ ?job_id=xxx で復元
  useEffect(() => {
    if (restoredRef.current) return;
    const params = new URLSearchParams(window.location.search);
    const urlJobId = params.get('job_id');
    if (!urlJobId) return;
    restoredRef.current = true;

    (async () => {
      const { data: job } = await supabase
        .from('gen_spot_jobs')
        .select('id, project_id, input_data, tool_type')
        .eq('id', urlJobId)
        .maybeSingle();
      if (!job || job.tool_type !== toolType) {
        // 不一致でも URL は綺麗にする
        clearJobIdFromUrl();
        return;
      }

      const { data: project } = await supabase
        .from('projects')
        .select('id, name, product:products(id, name, client_id, client:clients(id, name))')
        .eq('id', job.project_id)
        .maybeSingle();
      if (!project || !project.product) {
        clearJobIdFromUrl();
        return;
      }

      const product = project.product as unknown as {
        id: string;
        name: string;
        client_id: string | null;
        client: { id: string; name: string } | null;
      };
      updateState({
        clientId: product.client_id,
        productId: product.id,
        projectId: project.id,
      });
      onRestoreJob?.(
        urlJobId,
        project.id,
        (job.input_data as Record<string, unknown>) ?? {}
      );
      setCurrentStep(3);

      // 復元通知を表示
      setRestorationNotice({
        jobId: urlJobId,
        clientName: product.client?.name ?? '(不明)',
        productName: product.name,
        projectName: (project as { name: string }).name,
      });

      // URL から job_id を削除(履歴・リロード再復元防止)
      clearJobIdFromUrl();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toolType]);

  // jobIdが入ったらSTEP4へ
  useEffect(() => {
    if (jobId) {
      setDirection(1);
      setCurrentStep(3);
    }
  }, [jobId]);

  const canProceed = (): boolean => {
    if (currentStep === 0) {
      return !!state.clientId && !!state.productId && !!state.projectId;
    }
    return true;
  };

  // ユーザー手動変更検知用ラッパ
  const updateStateWithUrlClear = useCallback(
    (u: Partial<SpotWizardState>) => {
      // ターゲット系の変更時は URL の job_id を消す
      if ('clientId' in u || 'productId' in u || 'projectId' in u) {
        clearJobIdFromUrl();
      }
      updateState(u);
    },
    [updateState]
  );

  const handleStartFresh = useCallback(() => {
    updateState({ clientId: null, productId: null, projectId: null });
    clearJobIdFromUrl();
    setDirection(-1);
    setCurrentStep(0);
    setRestorationNotice(null);
  }, [updateState]);

  const showProjectBadge =
    currentStep > 0 && state.clientId && state.productId && state.projectId && context;

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">
          {toolEmoji && `${toolEmoji} `}
          {toolTitle}
        </h1>
        <p className="text-sm text-muted-foreground">{toolDescription}</p>
      </div>

      {/* 復元通知 Alert */}
      {restorationNotice && (
        <Alert className="border-primary/40 bg-primary/5 relative">
          <Sparkles className="h-4 w-4 text-primary" />
          <button
            onClick={() => setRestorationNotice(null)}
            className="absolute top-3 right-3 text-muted-foreground hover:text-foreground"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
          <AlertTitle>ジョブを履歴から復元しました</AlertTitle>
          <AlertDescription className="space-y-3">
            <div className="text-sm leading-relaxed">
              <div>
                <span className="text-muted-foreground">クライアント:</span>{' '}
                <strong>{restorationNotice.clientName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">商材:</span>{' '}
                <strong>{restorationNotice.productName}</strong>
              </div>
              <div>
                <span className="text-muted-foreground">案件:</span>{' '}
                <strong>{restorationNotice.projectName}</strong>
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Button size="sm" onClick={() => setRestorationNotice(null)}>
                この案件で続行
              </Button>
              <Button size="sm" variant="outline" onClick={handleStartFresh}>
                新しく最初から始める
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

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

      {/* モバイル */}
      <div className="md:hidden flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">
          ステップ {currentStep + 1}/{STEPS.length}
        </span>
        <span className="text-sm font-medium">{STEPS[currentStep].label}</span>
      </div>

      {/* 選択中の案件バッジ(STEP2 以降) */}
      {showProjectBadge && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap rounded-md bg-muted/40 px-3 py-1.5">
          <FolderOpen className="h-3 w-3 shrink-0" />
          <span>{context!.project.product.client.name}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span>{context!.project.product.name}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">{context!.project.name}</span>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 px-1.5 text-xs ml-1"
            onClick={() => goToStep(0)}
          >
            変更
          </Button>
        </div>
      )}

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
          {currentStep === 0 && <SpotStepTarget state={state} updateState={updateStateWithUrlClear} />}
          {currentStep === 1 && (
            <SpotStepDataCollection state={state} onComplete={goNext} />
          )}
          {currentStep === 2 &&
            renderSettings({ state, context, goToStep, goNext, goBack })}
          {currentStep === 3 &&
            renderResult({ state, context, goToStep, goNext, goBack })}
        </motion.div>
      </AnimatePresence>

      {/* フッターナビ */}
      {currentStep === 0 && (
        <div className="flex justify-end pt-4">
          <Button onClick={goNext} disabled={!canProceed()} variant="brand">
            次へ
          </Button>
        </div>
      )}
      {currentStep >= 2 && (
        <div className="flex justify-start pt-4">
          <Button variant="outline" onClick={goBack}>
            戻る
          </Button>
        </div>
      )}
    </div>
  );
};

export default SpotToolWizard;
