import { useEffect, useState, useRef } from 'react';
import { Check, ShieldCheck, BookOpen, AlertTriangle } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { type WizardState } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  onComplete: () => void;
}

interface StepDef {
  label: string;
  doneText: (count: number) => string;
  icon: React.ElementType;
  query: (productId: string | null) => Promise<number>;
}

const stepDefs: StepDef[] = [
  {
    label: '広告ルールを取得中...',
    doneText: (c) => `${c}件の広告ルールを取得しました`,
    icon: ShieldCheck,
    query: async (productId) => {
      if (!productId) return 0;
      const { count } = await supabase
        .from('check_rules')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', productId)
        .eq('is_active', true);
      return count ?? 0;
    },
  },
  {
    label: '参考資料を取得中...',
    doneText: (c) => `${c}件の参考資料を取得しました`,
    icon: BookOpen,
    query: async () => {
      const { count } = await supabase
        .from('reference_materials')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  },
  {
    label: '修正パターンを取得中...',
    doneText: (c) => `${c}件のよくある修正パターンを取得しました`,
    icon: AlertTriangle,
    query: async () => {
      const { count } = await supabase
        .from('correction_patterns')
        .select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
  },
];

const StepDataCollection = ({ state, onComplete }: Props) => {
  const [completed, setCompleted] = useState<boolean[]>([false, false, false]);
  const [started, setStarted] = useState<boolean[]>([true, true, true]);
  const [counts, setCounts] = useState<(number | null)[]>([null, null, null]);
  const calledRef = useRef(false);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;

    // Run all 3 queries in parallel, complete as each finishes
    stepDefs.forEach((step, i) => {
      step.query(state.productId).then((count) => {
        setCounts(prev => { const n = [...prev]; n[i] = count; return n; });
        setCompleted(prev => { const n = [...prev]; n[i] = true; return n; });
      });
    });
  }, [state.productId]);

  const allDone = completed.every(Boolean);

  // Auto-advance 2s after all done
  useEffect(() => {
    if (!allDone) return;
    const t = setTimeout(onComplete, 2000);
    return () => clearTimeout(t);
  }, [allDone, onComplete]);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">広告データ・ナレッジを自動収集中</h2>

      <div className="space-y-4">
        {stepDefs.map((step, i) => {
          const Icon = step.icon;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={started[i] ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.3, delay: i * 0.1 }}
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
                ) : (
                  <Icon className="h-5 w-5 text-secondary animate-spin" />
                )}
                <span className={cn("text-sm font-mono", completed[i] ? "text-foreground" : "text-muted-foreground")}>
                  {completed[i] ? step.doneText(counts[i] ?? 0) : step.label}
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-secondary"
                  initial={{ width: '0%' }}
                  animate={{ width: completed[i] ? '100%' : '60%' }}
                  transition={{ duration: completed[i] ? 0.3 : 2, ease: completed[i] ? 'easeOut' : 'easeInOut' }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {allDone && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border bg-card p-6"
        >
          <h3 className="font-semibold mb-3">収集結果サマリー</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold tabular-nums text-secondary">{counts[0] ?? 0}</div>
              <div className="text-xs text-muted-foreground">広告ルール</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-secondary">{counts[1] ?? 0}</div>
              <div className="text-xs text-muted-foreground">参考資料</div>
            </div>
            <div>
              <div className="text-2xl font-bold tabular-nums text-secondary">{counts[2] ?? 0}</div>
              <div className="text-xs text-muted-foreground">修正パターン</div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default StepDataCollection;
