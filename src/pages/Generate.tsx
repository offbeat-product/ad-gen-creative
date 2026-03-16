import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, initialWizardState } from '@/data/wizard-data';
import StepType from '@/components/wizard/StepType';
import StepClient from '@/components/wizard/StepClient';
import StepProduct from '@/components/wizard/StepProduct';
import StepProject from '@/components/wizard/StepProject';
import StepDataCollection from '@/components/wizard/StepDataCollection';
import StepReference from '@/components/wizard/StepReference';
import StepPattern from '@/components/wizard/StepPattern';
import StepPatternCount from '@/components/wizard/StepPatternCount';

const STEPS = [
  { label: 'タイプ' },
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: '参考素材' },
  { label: '制作パターン' },
  { label: 'パターン数' },
];

const Generate = () => {
  const [currentStep, setCurrentStep] = useState(0);
  const [state, setState] = useState<WizardState>(initialWizardState);
  const [direction, setDirection] = useState(1);

  const updateState = useCallback((updates: Partial<WizardState>) => {
    setState(prev => ({ ...prev, ...updates }));
  }, []);

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep(prev => Math.min(prev + 1, 7));
  }, []);

  const goBack = useCallback(() => {
    setDirection(-1);
    setCurrentStep(prev => Math.max(prev - 1, 0));
  }, []);

  const goToStep = useCallback((step: number) => {
    setDirection(step > currentStep ? 1 : -1);
    setCurrentStep(step);
  }, [currentStep]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0: return state.creativeType !== null;
      case 1: return state.clientId !== null;
      case 2: return state.productId !== null;
      case 3: return state.projectId !== null;
      case 4: return true;
      case 5: return true;
      case 6: return state.productionPattern !== null;
      case 7: return true;
      default: return false;
    }
  };

  const stepComponents = [
    <StepType key="type" state={state} updateState={updateState} />,
    <StepClient key="client" state={state} updateState={updateState} />,
    <StepProduct key="product" state={state} updateState={updateState} goToStep={goToStep} />,
    <StepProject key="project" state={state} updateState={updateState} goToStep={goToStep} />,
    <StepDataCollection key="data" state={state} onComplete={goNext} />,
    <StepReference key="ref" state={state} updateState={updateState} />,
    <StepPattern key="pattern" state={state} updateState={updateState} />,
    <StepPatternCount key="count" state={state} updateState={updateState} goBack={goBack} />,
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Step Indicator */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200",
                  i < currentStep && "bg-secondary text-secondary-foreground",
                  i === currentStep && "bg-secondary text-secondary-foreground ring-4 ring-secondary-wash scale-110",
                  i > currentStep && "bg-muted text-muted-foreground"
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span className={cn("text-xs", i === currentStep ? "text-secondary font-medium" : "text-muted-foreground")}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn("w-8 lg:w-12 h-0.5 mx-1", i < currentStep ? "bg-secondary" : "bg-muted")} />
            )}
          </div>
        ))}
      </div>

      {/* Mobile step indicator */}
      <div className="md:hidden flex items-center justify-between">
        <span className="text-sm font-medium text-secondary">ステップ {currentStep + 1}/8</span>
        <span className="text-sm text-muted-foreground">{STEPS[currentStep].label}</span>
      </div>

      {/* Step Content */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction * -20 }}
          transition={{ duration: 0.3, ease: [0.2, 0, 0, 1] }}
        >
          {stepComponents[currentStep]}
        </motion.div>
      </AnimatePresence>

      {/* Navigation - not shown on step 5 (auto) or step 8 (has its own) */}
      {currentStep !== 4 && currentStep !== 7 && (
        <div className="flex justify-between pt-4">
          {currentStep > 0 ? (
            <button onClick={goBack} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
              戻る
            </button>
          ) : <div />}
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-medium text-primary-foreground transition-all",
              canProceed()
                ? "brand-gradient-bg hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
          >
            次へ
          </button>
        </div>
      )}
    </div>
  );
};

export default Generate;
