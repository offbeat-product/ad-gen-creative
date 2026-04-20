import { useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useClients, useProductCount } from '@/hooks/use-supabase-data';
import { SpotWizardState } from '@/hooks/useSpotWizard';

interface Props {
  state: SpotWizardState;
  updateState: (u: Partial<SpotWizardState>) => void;
}

const ClientCard = ({
  client,
  selected,
  onClick,
}: {
  client: { id: string; name: string };
  selected: boolean;
  onClick: () => void;
}) => {
  const productCount = useProductCount(client.id);
  return (
    <button
      onClick={onClick}
      className={cn(
        'text-left rounded-xl border p-4 transition-all duration-200',
        selected
          ? 'border-secondary bg-secondary-wash/50 scale-[1.01]'
          : 'border-border bg-card hover:shadow-elevated hover:-translate-y-0.5'
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <span className="font-semibold">{client.name}</span>
      </div>
      <div className="flex gap-4 text-xs text-muted-foreground">
        <span>商材 {productCount}</span>
      </div>
    </button>
  );
};

const SpotStepClient = ({ state, updateState }: Props) => {
  const [search, setSearch] = useState('');
  const { clients, loading } = useClients();
  const filtered = clients.filter((c) => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">クライアントを選択</h2>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="クライアント名で検索..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-xl border bg-card pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">クライアントが登録されていません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <ClientCard
              key={c.id}
              client={c}
              selected={state.clientId === c.id}
              onClick={() => updateState({ clientId: c.id, productId: null, projectId: null })}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default SpotStepClient;
