import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
import { useProducts, useProjectCount, useClients } from '@/hooks/use-supabase-data';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
  goToStep: (step: number) => void;
}

const ProductCard = ({ product, selected, onClick }: { product: { id: string; name: string; label: string }; selected: boolean; onClick: () => void }) => {
  const projectCount = useProjectCount(product.id);
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left rounded-xl border p-4 transition-all duration-200",
        selected
          ? "border-secondary bg-secondary-wash/50"
          : "border-border bg-card hover:shadow-elevated"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-semibold">{product.name}</span>
        <span className="text-xs text-muted-foreground">案件数: {projectCount}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{product.label}</p>
    </button>
  );
};

const StepProduct = ({ state, updateState, goToStep }: Props) => {
  const { clients } = useClients();
  const client = clients.find(c => c.id === state.clientId);
  const { products, loading } = useProducts(state.clientId);

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

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">このクライアントに商材が登録されていません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              product={p}
              selected={state.productId === p.id}
              onClick={() => updateState({ productId: p.id, projectId: null })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default StepProduct;
