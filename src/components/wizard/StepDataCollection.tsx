import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  onComplete: () => void;
}

const steps = [
  { loading: 'Ad Brainから広告ルールを取得中...', done: '320件のルールを取得しました', delay: 1000 },
  { loading: 'Ad Brainからナレッジデータを取得中...', done: '15KBのナレッジを取得しました', delay: 1500 },
  { loading: '過去のクリエイティブ実績を分析中...', done: '28件のクリエイティブを分析しました', delay: 2000 },
  { loading: '勝ちパターンを抽出中...', done: '5つの勝ちパターンを特定しました', delay: 2500 },
];

const StepDataCollection = ({ onComplete }: Props) => {
  const [completed, setCompleted] = useState<boolean[]>([false, false, false, false]);
  const [started, setStarted] = useState<boolean[]>([false, false, false, false]);

  useEffect(() => {
    steps.forEach((step, i) => {
      setTimeout(() => {
        setStarted(prev => { const n = [...prev]; n[i] = true; return n; });
      }, i * 500);

      setTimeout(() => {
        setCompleted(prev => { const n = [...prev]; n[i] = true; return n; });
      }, step.delay + i * 500);
    });

    const totalTime = steps[steps.length - 1].delay + (steps.length - 1) * 500 + 1000;
    const timer = setTimeout(onComplete, totalTime);
    return () => clearTimeout(timer);
  }, [onComplete]);

  const allDone = completed.every(Boolean);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">広告データ・ナレッジを自動収集中</h2>

      <div className="space-y-4">
        {steps.map((step, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={started[i] ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.3 }}
            className="rounded-xl bg-accent p-4"
          >
            <div className="flex items-center gap-3 mb-2">
              {completed[i] ? (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                  className="w-6 h-6 rounded-full bg-success flex items-center justify-center"
                >
                  <Check className="h-3.5 w-3.5 text-success-foreground" />
                </motion.div>
              ) : started[i] ? (
                <Loader2 className="h-5 w-5 text-secondary animate-spin" />
              ) : (
                <div className="w-5 h-5 rounded-full bg-muted" />
              )}
              <span className={cn("text-sm font-mono", completed[i] ? "text-foreground" : "text-muted-foreground")}>
                {completed[i] ? step.done : step.loading}
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-muted overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-secondary"
                initial={{ width: '0%' }}
                animate={started[i] ? { width: '100%' } : {}}
                transition={{ duration: (step.delay) / 1000, ease: 'easeInOut' }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-6"
        >
          <h3 className="font-semibold mb-3">収集結果サマリー</h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div><div className="text-2xl font-bold tabular-nums text-secondary">320</div><div className="text-xs text-muted-foreground">取得ルール</div></div>
            <div><div className="text-2xl font-bold tabular-nums text-secondary">15KB</div><div className="text-xs text-muted-foreground">ナレッジ</div></div>
            <div><div className="text-2xl font-bold tabular-nums text-secondary">28</div><div className="text-xs text-muted-foreground">分析クリエイティブ</div></div>
            <div><div className="text-2xl font-bold tabular-nums text-secondary">5</div><div className="text-xs text-muted-foreground">勝ちパターン</div></div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StepDataCollection;
