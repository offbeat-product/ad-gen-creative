import { Target, Type, Palette, Sparkles, ListChecks } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, clients, products, projects } from '@/data/wizard-data';
import { Slider } from '@/components/ui/slider';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
  goBack: () => void;
}

const StepPatternCount = ({ state, updateState, goBack }: Props) => {
  const total = state.appealAxis * state.copyPatterns * state.tonePatterns;

  const client = clients.find(c => c.id === state.clientId);
  const product = state.clientId ? (products[state.clientId] ?? []).find(p => p.id === state.productId) : null;
  const project = state.productId ? (projects[state.productId] ?? []).find(p => p.id === state.projectId) : null;

  const sliders = [
    { icon: Target, label: '訴求軸', sub: '異なる訴求切り口の数', key: 'appealAxis' as const, value: state.appealAxis },
    { icon: Type, label: 'コピー', sub: '各訴求軸に対するコピーのバリエーション数', key: 'copyPatterns' as const, value: state.copyPatterns },
    { icon: Palette, label: 'トンマナ', sub: 'デザインスタイル・色調のバリエーション数', key: 'tonePatterns' as const, value: state.tonePatterns },
  ];

  const handleGenerate = () => {
    alert('生成を開始します！（デモ）');
  };

  return (
    <div className="space-y-8">
      <h2 className="text-xl font-bold font-display tracking-tight">パターン数を設定</h2>
      <p className="text-sm text-muted-foreground">訴求軸・コピー・トンマナの組み合わせでクリエイティブのバリエーションを設定します。</p>

      {/* Sliders */}
      <div className="space-y-6">
        {sliders.map((s) => (
          <div key={s.key} className="space-y-2">
            <div className="flex items-center gap-2">
              <s.icon className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">{s.label}</span>
              <span className="ml-auto text-lg font-bold tabular-nums text-secondary">{s.value}</span>
            </div>
            <Slider
              value={[s.value]}
              onValueChange={([v]) => updateState({ [s.key]: v })}
              min={1}
              max={10}
              step={1}
              className="[&_[role=slider]]:bg-secondary [&_[role=slider]]:border-secondary [&_.bg-primary]:bg-secondary"
            />
            <p className="text-xs text-muted-foreground">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Total calculation */}
      <div className="rounded-2xl bg-foreground text-primary-foreground p-8 text-center">
        <div className="text-muted-foreground text-lg mb-2">
          訴求軸 {state.appealAxis} × コピー {state.copyPatterns} × トンマナ {state.tonePatterns}
        </div>
        <div className="flex items-baseline justify-center gap-2">
          <span className="text-muted-foreground text-lg">= 合計</span>
          <span className="text-6xl font-bold tabular-nums text-secondary">{total}</span>
          <span className="text-muted-foreground text-lg">本</span>
        </div>
      </div>

      {/* Summary */}
      <div className="rounded-xl border bg-card p-6 space-y-2">
        <h3 className="font-semibold font-display mb-3">制作概要サマリー</h3>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <span className="text-muted-foreground">クリエイティブタイプ</span>
          <span className="font-medium">{state.creativeType === 'video' ? `動画${state.videoDuration}秒` : '静止画バナー'}</span>
          <span className="text-muted-foreground">クライアント</span>
          <span className="font-medium">{client?.name}</span>
          <span className="text-muted-foreground">商材</span>
          <span className="font-medium">{product?.name}</span>
          <span className="text-muted-foreground">案件</span>
          <span className="font-medium">{project?.name}</span>
          <span className="text-muted-foreground">参考クリエイティブ</span>
          <span className="font-medium">{state.referenceIds.length}件選択済み</span>
          <span className="text-muted-foreground">制作パターン</span>
          <span className="font-medium">{state.productionPattern === 'new' ? '新規制作' : 'パターン展開'}</span>
          <span className="text-muted-foreground">合計</span>
          <span className="font-bold text-secondary">{total}本</span>
        </div>
      </div>

      {/* Generation mode */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium">生成モード</h3>
        <div className="space-y-2">
          {[
            { id: 'auto' as const, icon: Sparkles, label: '全自動モード', desc: '全工程をAIが自動で一括生成します' },
            { id: 'step' as const, icon: ListChecks, label: 'ステップ確認モード', desc: '各工程ごとに結果を確認・編集できます' },
          ].map((mode) => (
            <button
              key={mode.id}
              onClick={() => updateState({ generationMode: mode.id })}
              className={cn(
                "w-full flex items-center gap-3 rounded-xl border p-4 text-left transition-all",
                state.generationMode === mode.id
                  ? "border-secondary bg-secondary-wash/50"
                  : "border-border bg-card hover:bg-accent"
              )}
            >
              <mode.icon className={cn("h-5 w-5", state.generationMode === mode.id ? "text-secondary" : "text-muted-foreground")} />
              <div>
                <span className="text-sm font-medium">{mode.label}</span>
                <p className="text-xs text-muted-foreground">{mode.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Final buttons */}
      <div className="flex justify-between items-center pt-4">
        <button onClick={goBack} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium hover:bg-accent transition-colors">
          戻る
        </button>
        <button
          onClick={handleGenerate}
          className="inline-flex items-center gap-2 rounded-xl brand-gradient-bg text-primary-foreground px-8 py-4 text-xl font-bold shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all animate-pulse-subtle"
        >
          <Sparkles className="h-5 w-5" />
          生成を開始する
        </button>
      </div>
      <p className="text-xs text-muted-foreground text-center">生成には約2〜5分かかります</p>
    </div>
  );
};

export default StepPatternCount;
