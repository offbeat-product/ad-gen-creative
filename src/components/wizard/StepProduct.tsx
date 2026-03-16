import { cn } from '@/lib/utils';
import { type WizardState, clients, products } from '@/data/wizard-data';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
  goToStep: (step: number) => void;
}

const StepProduct = ({ state, updateState, goToStep }: Props) => {
  const client = clients.find(c => c.id === state.clientId);
  const items = state.clientId ? (products[state.clientId] ?? []) : [];

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">商材を選択</h2>

      {client && (
        <div className="flex items-center gap-2 text-sm">
          <span className="bg-secondary-wash text-secondary px-2.5 py-1 rounded-full text-xs font-medium">
            クライアント: {client.name}
          </span>
          <button onClick={() => goToStep(1)} className="text-secondary text-xs hover:underline">変更</button>
        </div>
      )}

      <div className="space-y-3">
        {items.map((p) => (
          <button
            key={p.id}
            onClick={() => updateState({ productId: p.id, projectId: null })}
            className={cn(
              "w-full text-left rounded-xl border p-4 transition-all duration-200",
              state.productId === p.id
                ? "border-secondary bg-secondary-wash/50"
                : "border-border bg-card hover:shadow-elevated"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="font-semibold">{p.name}</span>
              <span className="text-xs text-muted-foreground">案件数: {p.projectCount}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{p.desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
};

export default StepProduct;
