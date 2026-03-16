import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState, clients, products, projects } from '@/data/wizard-data';
import { Button } from '@/components/ui/button';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
  goToStep: (step: number) => void;
}

const StepProject = ({ state, updateState, goToStep }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const client = clients.find(c => c.id === state.clientId);
  const product = state.productId ? (products[state.clientId ?? ''] ?? []).find(p => p.id === state.productId) : null;
  const items = state.productId ? (projects[state.productId] ?? []) : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">案件を選択</h2>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => goToStep(1)} className="text-secondary hover:underline text-xs">{client?.name}</button>
        <span className="text-muted-foreground text-xs">{'>'}</span>
        <button onClick={() => goToStep(2)} className="text-secondary hover:underline text-xs">{product?.name}</button>
      </div>

      <div className="space-y-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => updateState({ projectId: p.id })}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-all duration-200",
              state.projectId === p.id
                ? "border-secondary bg-secondary-wash/50"
                : "border-border bg-card hover:shadow-elevated"
            )}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-semibold">{p.name}</span>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                p.statusColor === 'success' ? "bg-success-wash text-success" : "bg-warning-wash text-warning"
              )}>
                {p.status}
              </span>
            </div>
            <div className="flex gap-4 text-xs text-muted-foreground">
              <span>期間: {p.period}</span>
              <span>予算: {p.budget}</span>
            </div>
          </button>
        ))}
      </div>

      <Button variant="outline" size="sm" onClick={() => setShowModal(true)}>
        <Plus className="h-4 w-4" />
        新しい案件を作成
      </Button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm" onClick={() => setShowModal(false)}>
          <div className="bg-card rounded-2xl p-6 w-full max-w-md shadow-elevated space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold font-display">新しい案件を作成</h3>
              <button onClick={() => setShowModal(false)}><X className="h-4 w-4 text-muted-foreground" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium">案件名</label>
                <input className="w-full mt-1 rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              </div>
              <div>
                <label className="text-sm font-medium">期間</label>
                <input className="w-full mt-1 rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="2026/04/01〜06/30" />
              </div>
              <div>
                <label className="text-sm font-medium">予算</label>
                <input className="w-full mt-1 rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" placeholder="¥1,000,000" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>キャンセル</Button>
              <Button variant="brand" size="sm" onClick={() => setShowModal(false)}>作成</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepProject;
