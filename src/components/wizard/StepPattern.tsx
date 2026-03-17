import { FilePlus, GitBranch } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

const StepPattern = ({ state, updateState }: Props) => {
  const patterns = [
    { id: 'new' as const, icon: FilePlus, title: '新規制作', sub: 'ゼロからクリエイティブを新規作成します' },
    { id: 'variation' as const, icon: GitBranch, title: 'パターン展開', sub: '既存の勝ちクリエイティブをベースにバリエーション展開' },
  ];

  const hasRefs = state.referenceIds.length > 0;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">制作パターンを選択</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {patterns.map((p) => (
          <button
            key={p.id}
            onClick={() => updateState({ productionPattern: p.id })}
            className={cn(
              "flex flex-col items-center justify-center gap-3 rounded-xl border-2 p-8 transition-all duration-200",
              state.productionPattern === p.id
                ? "border-secondary bg-secondary-wash scale-[1.01]"
                : "border-border bg-card hover:shadow-elevated hover:-translate-y-0.5"
            )}
          >
            <p.icon className={cn("h-12 w-12", state.productionPattern === p.id ? "text-secondary" : "text-muted-foreground")} />
            <span className="text-lg font-semibold">{p.title}</span>
            <span className="text-sm text-muted-foreground text-center">{p.sub}</span>
          </button>
        ))}
      </div>

      {state.productionPattern === 'variation' && (
        <div className="space-y-3">
          <label className="text-sm font-medium">ベースにするクリエイティブ</label>
          {hasRefs ? (
            <select
              value={state.baseCreativeId ?? ''}
              onChange={e => updateState({ baseCreativeId: e.target.value || null })}
              className="w-full rounded-xl border bg-card px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">選択してください</option>
              {state.referenceIds.map(id => (
                <option key={id} value={id}>{id}</option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-warning">先にステップ⑥で参考クリエイティブを選択してください</p>
          )}
        </div>
      )}

    </div>
  );
};

export default StepPattern;
