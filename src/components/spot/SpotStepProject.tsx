import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients, useProducts, useProjects } from '@/hooks/use-supabase-data';
import { SpotWizardState } from '@/hooks/useSpotWizard';

interface Props {
  state: SpotWizardState;
  updateState: (u: Partial<SpotWizardState>) => void;
  goToStep: (step: number) => void;
}

const SpotStepProject = ({ state, updateState, goToStep }: Props) => {
  const { clients } = useClients();
  const { products } = useProducts(state.clientId);
  const { projects, loading } = useProjects(state.productId);

  const client = clients.find((c) => c.id === state.clientId);
  const product = products.find((p) => p.id === state.productId);

  const formatDeadline = (p: { deadline: string | null; overall_deadline: string | null }) => {
    const d = p.deadline || p.overall_deadline;
    if (!d) return null;
    return new Date(d).toLocaleDateString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">案件を選択</h2>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => goToStep(0)} className="text-secondary hover:underline text-xs">
          {client?.name}
        </button>
        <span className="text-muted-foreground text-xs">{'>'}</span>
        <button onClick={() => goToStep(1)} className="text-secondary hover:underline text-xs">
          {product?.name}
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">この商材に案件が登録されていません。</p>
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => updateState({ projectId: p.id })}
              className={cn(
                'w-full text-left rounded-xl border p-4 transition-all duration-200',
                state.projectId === p.id
                  ? 'border-secondary bg-secondary-wash/50'
                  : 'border-border bg-card hover:shadow-elevated'
              )}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">{p.name}</span>
                <span
                  className={cn(
                    'text-xs px-2 py-0.5 rounded-full font-medium',
                    p.status === '進行中'
                      ? 'bg-success-wash text-success'
                      : p.status === '準備中'
                      ? 'bg-warning-wash text-warning'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {p.status ?? '未設定'}
                </span>
              </div>
              <div className="flex gap-4 text-xs text-muted-foreground">
                {p.description && <span>{p.description}</span>}
                {formatDeadline(p) && <span>納期: {formatDeadline(p)}</span>}
              </div>
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center pt-2">
        案件は Ad Brain で事前に作成する必要があります
      </p>
    </div>
  );
};

export default SpotStepProject;
