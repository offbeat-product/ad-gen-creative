import { motion } from 'framer-motion';
import { Check, AlertCircle, SkipForward } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { PipelineStep } from '@/pages/GenerateProgress';

interface Props {
  pipeline: PipelineStep[];
  activeIndex: number;
  completedIndexes: Set<number>;
  skippedIndexes: Set<number>;
  selectedStepIndex: number | null;
  countUpValues: Record<number, number>;
  total: number;
  progressPct: number;
  completedCount: number;
  elapsedStr: string;
  remainStr: string;
  allDone: boolean;
  effectiveAutoMode: boolean;
  errorMap?: Record<number, string>;
  narrationProgress?: { completed: number; total: number } | null;
  onStepClick: (idx: number) => void;
  onSwitchToAuto: () => void;
  onSkipStep?: (idx: number) => void;
}

const PipelineTimeline = ({
  pipeline, activeIndex, completedIndexes, skippedIndexes, selectedStepIndex,
  countUpValues, total, progressPct, completedCount,
  elapsedStr, remainStr, allDone, effectiveAutoMode,
  errorMap = {}, narrationProgress, onStepClick, onSwitchToAuto, onSkipStep,
}: Props) => {
  return (
    <div className="space-y-4">
      {/* Overall progress */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            生成進捗: <span className="text-secondary">{progressPct}%</span>（{completedCount}/{pipeline.length}工程）
          </span>
          <span className="text-muted-foreground tabular-nums">
            {elapsedStr}
            {!allDone && completedCount > 0 && <> / 約{remainStr}</>}
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

      {/* Switch to auto */}
      {!effectiveAutoMode && !allDone && (
        <div className="text-right">
          <button onClick={onSwitchToAuto} className="text-sm text-secondary hover:underline">
            残りを全自動で実行
          </button>
        </div>
      )}

      {/* Compact timeline */}
      <div className="relative pl-8">
        <div className="absolute left-[15px] top-0 bottom-0 w-0.5 bg-border" />

        {pipeline.map((step, i) => {
          const isDone = completedIndexes.has(i);
          const isRunning = activeIndex === i && !isDone;
          const isSelected = selectedStepIndex === i;
          const hasError = !!errorMap[i];
          const StepIcon = step.icon;

          const runText = step.countUp && countUpValues[i] !== undefined
            ? step.runningText.replace(`(0/${total})`, `(${countUpValues[i]}/${total})`)
            : step.runningText;

          return (
            <div
              key={i}
              onClick={() => onStepClick(i)}
              className={cn(
                "relative mb-1.5 last:mb-0 rounded-lg px-3 py-2 ml-2 transition-all duration-200",
                isDone && "cursor-pointer hover:bg-success-wash/50",
                isSelected && isDone && "bg-secondary-wash border-l-[3px] border-secondary",
                isRunning && "bg-secondary-wash/30",
                hasError && "bg-destructive/5",
                !isDone && !isRunning && !hasError && "opacity-60",
              )}
            >
              {/* Timeline dot */}
              <div className="absolute -left-8 top-2.5 flex items-center justify-center">
                {hasError ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-destructive flex items-center justify-center">
                    <AlertCircle className="h-3.5 w-3.5 text-destructive-foreground" />
                  </div>
                ) : isDone ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 15 }}
                    className="w-[26px] h-[26px] rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="h-3.5 w-3.5 text-success-foreground" />
                  </motion.div>
                ) : isRunning ? (
                  <div className="w-[26px] h-[26px] rounded-full bg-secondary flex items-center justify-center animate-pulse">
                    <StepIcon className="h-3.5 w-3.5 text-secondary-foreground animate-spin-slow" />
                  </div>
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-muted flex items-center justify-center">
                    <StepIcon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="flex items-center gap-2">
                <StepIcon className={cn(
                  "h-3.5 w-3.5 shrink-0",
                  hasError ? 'text-destructive' : isDone ? 'text-success' : isRunning ? 'text-secondary' : 'text-muted-foreground',
                )} />
                <span className={cn(
                  "text-sm font-medium truncate",
                  hasError ? 'text-destructive' : !isDone && !isRunning && 'text-muted-foreground',
                )}>
                  {step.label}
                </span>
              </div>

              {/* Running text */}
              {isRunning && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1.5">
                  <p className="text-xs text-secondary truncate">
                    {step.stepKey === 'narration' && narrationProgress
                      ? `AI音声でナレーションを生成しています... (${narrationProgress.completed}/${narrationProgress.total})`
                      : runText}
                  </p>
                  <div className="h-1 w-full rounded-full bg-muted overflow-hidden mt-1">
                    {step.stepKey === 'narration' && narrationProgress ? (
                      <motion.div
                        className="h-full rounded-full bg-secondary"
                        animate={{ width: `${narrationProgress.total > 0 ? Math.max(5, (narrationProgress.completed / narrationProgress.total) * 100) : 5}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                    ) : (
                      <motion.div
                        className="h-full rounded-full bg-secondary"
                        initial={{ width: '5%' }}
                        animate={{ width: '90%' }}
                        transition={{ duration: step.demoSeconds - 0.3, ease: 'linear' }}
                      />
                    )}
                  </div>
                </motion.div>
              )}

              {/* Error message */}
              {hasError && (
                <p className="text-xs text-destructive mt-0.5 truncate">{errorMap[i]}</p>
              )}

              {/* Completed summary */}
              {isDone && !isRunning && !hasError && (
                <p className="text-xs text-success mt-0.5 truncate">{step.completedText}</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PipelineTimeline;
