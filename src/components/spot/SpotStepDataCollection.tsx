import { useEffect, useState, useRef, useMemo } from 'react';
import {
  Check,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
  Database,
  Loader2,
  FileText,
  Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { SpotWizardState } from '@/hooks/useSpotWizard';
import { useProjectContext } from '@/hooks/useProjectContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface Props {
  state: SpotWizardState;
  onComplete: () => void;
}

interface RuleByScope {
  client: number;
  product: number;
  project: number;
}

interface RuleBySeverity {
  high: number;
  medium: number;
  low: number;
}

interface CollectedData {
  rules: number;
  rulesByScope: RuleByScope;
  rulesBySeverity: RuleBySeverity;
  topCategories: { category: string; count: number }[];
  materials: number;
  materialTitles: { title: string; type: string }[];
  corrections: number;
}

const STEP_DEFS = [
  {
    key: 'rules' as const,
    label: 'Ad Brain ルールを収集中',
    doneText: (n: number) => `${n}件のルールを統合`,
    icon: ShieldCheck,
    durationMs: 900,
  },
  {
    key: 'materials' as const,
    label: 'ナレッジ資料を読込中',
    doneText: (n: number) => `${n}件のナレッジ資料を取得`,
    icon: BookOpen,
    durationMs: 900,
  },
  {
    key: 'corrections' as const,
    label: '過去の修正パターンを照合中',
    doneText: (n: number) => `${n}件の学習パターンを参照`,
    icon: AlertTriangle,
    durationMs: 800,
  },
  {
    key: 'project' as const,
    label: 'プロジェクト情報を確認中',
    doneText: () => 'プロジェクト情報を確認完了',
    icon: FileText,
    durationMs: 700,
  },
];

const SCOPE_LABEL: Record<keyof RuleByScope, string> = {
  client: 'クライアント',
  product: '商材',
  project: '案件',
};

const SEVERITY_STYLES: Record<keyof RuleBySeverity, string> = {
  high: 'bg-destructive/10 text-destructive border-destructive/30',
  medium: 'bg-warning/10 text-warning-foreground border-warning/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const SpotStepDataCollection = ({ state, onComplete }: Props) => {
  const { context, loading: ctxLoading } = useProjectContext(state.projectId);
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<'scanning' | 'summary'>('scanning');
  const startedRef = useRef(false);

  // 統計を context から派生
  const data: CollectedData | null = useMemo(() => {
    if (!context) return null;
    const rulesByScope: RuleByScope = { client: 0, product: 0, project: 0 };
    const rulesBySeverity: RuleBySeverity = { high: 0, medium: 0, low: 0 };
    const categoryMap: Record<string, number> = {};

    context.rules.forEach((r) => {
      const scope = (r as any).scope as keyof RuleByScope | undefined;
      if (scope && scope in rulesByScope) rulesByScope[scope]++;
      const sev = (r.severity ?? 'medium') as keyof RuleBySeverity;
      if (sev in rulesBySeverity) rulesBySeverity[sev]++;
      const cat = r.category ?? 'その他';
      categoryMap[cat] = (categoryMap[cat] ?? 0) + 1;
    });

    const topCategories = Object.entries(categoryMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .map(([category, count]) => ({ category, count }));

    return {
      rules: context.rules.length,
      rulesByScope,
      rulesBySeverity,
      topCategories,
      materials: context.materials.length,
      materialTitles: context.materials.slice(0, 6).map((m) => ({
        title: m.title,
        type: m.material_type,
      })),
      corrections: context.corrections.length,
    };
  }, [context]);

  // スキャン進行(逐次)
  useEffect(() => {
    if (startedRef.current) return;
    if (ctxLoading || !context) return;
    startedRef.current = true;

    let i = 0;
    const advance = () => {
      if (i >= STEP_DEFS.length) {
        setPhase('summary');
        return;
      }
      setStepIndex(i);
      setTimeout(() => {
        i++;
        advance();
      }, STEP_DEFS[i].durationMs);
    };
    advance();
  }, [ctxLoading, context]);

  // サマリー表示後、自動で次へ
  useEffect(() => {
    if (phase !== 'summary') return;
    const t = setTimeout(onComplete, 1800);
    return () => clearTimeout(t);
  }, [phase, onComplete]);

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-md">
            <Database className="h-5 w-5 text-primary-foreground" />
          </div>
          {phase === 'scanning' && (
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
              <span className="relative inline-flex rounded-full h-3 w-3 bg-secondary" />
            </span>
          )}
        </div>
        <div>
          <h2 className="text-xl font-bold font-display tracking-tight">
            広告データ・ナレッジを自動収集中
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            クライアント / 商材 / 案件の3階層から関連情報を統合します
          </p>
        </div>
      </div>

      {/* スキャナー: 4ステップ進捗 */}
      <div className="rounded-2xl border bg-gradient-to-b from-card to-muted/20 p-5 space-y-3">
        {STEP_DEFS.map((step, i) => {
          const Icon = step.icon;
          const isActive = phase === 'scanning' && i === stepIndex;
          const isDone = phase === 'summary' || i < stepIndex;
          const isPending = !isActive && !isDone;

          let displayText = step.label;
          if (isDone && data) {
            const n =
              step.key === 'rules'
                ? data.rules
                : step.key === 'materials'
                ? data.materials
                : step.key === 'corrections'
                ? data.corrections
                : 0;
            displayText = step.doneText(n);
          }

          return (
            <motion.div
              key={step.key}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: isPending ? 0.4 : 1, x: 0 }}
              transition={{ duration: 0.3 }}
              className={cn(
                'flex items-center gap-3 rounded-lg p-3 transition-all',
                isActive && 'bg-secondary-wash ring-1 ring-secondary/30',
                isDone && 'bg-success/5'
              )}
            >
              <div className="relative shrink-0">
                {isDone ? (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                    className="w-7 h-7 rounded-full bg-success flex items-center justify-center"
                  >
                    <Check className="h-4 w-4 text-success-foreground" strokeWidth={3} />
                  </motion.div>
                ) : isActive ? (
                  <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center">
                    <Loader2 className="h-4 w-4 text-secondary-foreground animate-spin" />
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div
                  className={cn(
                    'text-sm font-mono tracking-tight',
                    isDone && 'text-foreground',
                    isActive && 'text-foreground',
                    isPending && 'text-muted-foreground'
                  )}
                >
                  {displayText}
                </div>
                {isActive && (
                  <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                    <motion.div
                      className="h-full rounded-full bg-secondary"
                      initial={{ width: '0%' }}
                      animate={{ width: '100%' }}
                      transition={{ duration: step.durationMs / 1000, ease: 'easeInOut' }}
                    />
                  </div>
                )}
              </div>
              {isDone && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-xs text-success font-bold tabular-nums"
                >
                  OK
                </motion.div>
              )}
            </motion.div>
          );
        })}
      </div>

      {/* サマリーダッシュボード */}
      <AnimatePresence>
        {phase === 'summary' && data && context && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="space-y-4"
          >
            {/* タイトル */}
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <h3 className="text-sm font-semibold">収集完了サマリー</h3>
              <span className="text-xs text-muted-foreground ml-auto">
                自動で設定画面に進みます...
              </span>
            </div>

            {/* メイン3カード */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Ad Brain ルール */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <ShieldCheck className="h-4 w-4 text-secondary" />
                    <span className="text-xs font-semibold text-muted-foreground">
                      Ad Brain ルール
                    </span>
                  </div>
                </div>
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {data.rules}
                  <span className="text-sm font-normal text-muted-foreground ml-1">件</span>
                </div>
                {/* スコープ別内訳 */}
                <div className="space-y-1">
                  {(Object.keys(data.rulesByScope) as Array<keyof RuleByScope>).map(
                    (scope) =>
                      data.rulesByScope[scope] > 0 && (
                        <div
                          key={scope}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="text-muted-foreground">{SCOPE_LABEL[scope]}</span>
                          <span className="font-mono tabular-nums">
                            {data.rulesByScope[scope]}
                          </span>
                        </div>
                      )
                  )}
                </div>
                {/* severity チップ */}
                {data.rules > 0 && (
                  <div className="flex flex-wrap gap-1 pt-2 border-t">
                    {(Object.keys(data.rulesBySeverity) as Array<keyof RuleBySeverity>).map(
                      (sev) =>
                        data.rulesBySeverity[sev] > 0 && (
                          <span
                            key={sev}
                            className={cn(
                              'text-[10px] px-1.5 py-0.5 rounded border font-mono',
                              SEVERITY_STYLES[sev]
                            )}
                          >
                            {sev} {data.rulesBySeverity[sev]}
                          </span>
                        )
                    )}
                  </div>
                )}
              </motion.div>

              {/* ナレッジ資料 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-1.5">
                  <BookOpen className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    ナレッジ資料
                  </span>
                </div>
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {data.materials}
                  <span className="text-sm font-normal text-muted-foreground ml-1">件</span>
                </div>
                <div className="space-y-1 min-h-[60px]">
                  {data.materialTitles.length > 0 ? (
                    data.materialTitles.map((m, i) => (
                      <div
                        key={i}
                        className="text-xs flex items-start gap-1.5 text-muted-foreground"
                      >
                        <FileText className="h-3 w-3 mt-0.5 shrink-0" />
                        <span className="truncate" title={m.title}>
                          {m.title}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      登録済み資料はありません
                    </p>
                  )}
                  {data.materials > data.materialTitles.length && (
                    <div className="text-[10px] text-muted-foreground pt-1">
                      他 {data.materials - data.materialTitles.length} 件
                    </div>
                  )}
                </div>
              </motion.div>

              {/* 修正パターン + プロジェクト基本情報 */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-xl border bg-card p-4 space-y-3"
              >
                <div className="flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-secondary" />
                  <span className="text-xs font-semibold text-muted-foreground">
                    学習パターン
                  </span>
                </div>
                <div className="text-3xl font-bold tabular-nums text-foreground">
                  {data.corrections}
                  <span className="text-sm font-normal text-muted-foreground ml-1">件</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  過去の修正履歴を AI が参照し、再発を防止します
                </p>
                {/* プロジェクト情報 */}
                <div className="pt-2 border-t space-y-1 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-muted-foreground shrink-0">案件:</span>
                    <span className="font-medium truncate">{context.project.name}</span>
                  </div>
                  {context.project.copyright_text && (
                    <div className="flex items-center gap-1">
                      <span className="text-muted-foreground shrink-0">©:</span>
                      <span className="truncate text-muted-foreground">
                        {context.project.copyright_text}
                      </span>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* カテゴリ別ハイライト */}
            {data.topCategories.length > 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
                className="rounded-xl bg-muted/30 p-3"
              >
                <div className="text-xs text-muted-foreground mb-2">
                  ルールカテゴリ TOP{data.topCategories.length}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {data.topCategories.map((c) => (
                    <Badge key={c.category} variant="secondary" className="text-[11px]">
                      {c.category}{' '}
                      <span className="ml-1 opacity-70 tabular-nums">{c.count}</span>
                    </Badge>
                  ))}
                </div>
              </motion.div>
            )}

            {/* スキップボタン */}
            <div className="flex justify-end">
              <Button size="sm" variant="outline" onClick={onComplete}>
                設定画面へ進む
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpotStepDataCollection;
