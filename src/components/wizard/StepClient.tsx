import { useState } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, clients } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
}

const StepClient = ({ state, updateState }: Props) => {
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  const colorMap: Record<string, string> = {
    'primary-wash': 'bg-primary-wash text-primary-dark',
    'secondary-wash': 'bg-secondary-wash text-secondary',
    'success-wash': 'bg-success-wash text-success',
    'warning-wash': 'bg-warning-wash text-warning',
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">クライアントを選択</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="クライアント名で検索..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {filtered.map((c) => (
          <button
            key={c.id}
            onClick={() => updateState({ clientId: c.id, productId: null, projectId: null })}
            className={cn(
              "text-left rounded-xl border p-4 transition-all duration-200",
              state.clientId === c.id
                ? "border-secondary bg-secondary-wash/50 scale-[1.01]"
                : "border-border bg-card hover:shadow-elevated hover:-translate-y-0.5"
            )}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold">{c.name}</span>
              <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", colorMap[c.industryColor])}>
                {c.industry}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>商材 {c.productCount}</span>
              <span>ルール {c.ruleCount}</span>
              <span>ナレッジ {c.knowledge}</span>
            </div>
            <div className="text-xs text-muted-foreground mt-1">最終更新: {c.lastUpdated}</div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepClient;
