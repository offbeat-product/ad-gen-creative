import { useState } from 'react';
import { Search, Loader2, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { useClients, useProducts, useProjects } from '@/hooks/use-supabase-data';
import { SpotWizardState } from '@/hooks/useSpotWizard';

interface Props {
  state: SpotWizardState;
  updateState: (u: Partial<SpotWizardState>) => void;
}

const ColumnHeader = ({ children }: { children: React.ReactNode }) => (
  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
    {children}
  </div>
);

const EmptyMessage = ({ children }: { children: React.ReactNode }) => (
  <div className="text-center py-10 text-xs text-muted-foreground">{children}</div>
);

const SelectableCard = ({
  selected,
  onClick,
  title,
  meta,
}: {
  selected: boolean;
  onClick: () => void;
  title: string;
  meta?: string;
}) => (
  <button
    onClick={onClick}
    className={cn(
      'w-full text-left rounded-lg border px-3 py-2.5 transition-all duration-200',
      selected
        ? 'border-secondary bg-secondary-wash/50 scale-[1.01] shadow-sm'
        : 'border-border bg-background hover:bg-accent/30'
    )}
  >
    <div className="flex items-center justify-between gap-2">
      <span className="font-medium text-sm truncate">{title}</span>
      {selected && <Check className="h-3.5 w-3.5 text-secondary shrink-0" />}
    </div>
    {meta && <div className="text-xs text-muted-foreground mt-0.5 truncate">{meta}</div>}
  </button>
);

const SpotStepTarget = ({ state, updateState }: Props) => {
  const [search, setSearch] = useState('');
  const { clients, loading: clientsLoading } = useClients();
  const { products, loading: productsLoading } = useProducts(state.clientId);
  const { projects, loading: projectsLoading } = useProjects(state.productId);

  const filteredClients = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const selectedClient = clients.find((c) => c.id === state.clientId);
  const selectedProduct = products.find((p) => p.id === state.productId);
  const selectedProject = projects.find((p) => p.id === state.projectId);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold font-display tracking-tight">
          クライアント・商材・案件を選択
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          階層を順に選択してください
        </p>
      </div>

      {/* パンくず */}
      <div className="flex items-center gap-2 text-xs flex-wrap rounded-lg bg-muted/50 px-3 py-2">
        <span className={cn(selectedClient ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {selectedClient ? `クライアント: ${selectedClient.name}` : 'クライアント未選択'}
        </span>
        <span className="text-muted-foreground">›</span>
        <span className={cn(selectedProduct ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {selectedProduct ? `商材: ${selectedProduct.name}` : '商材未選択'}
        </span>
        <span className="text-muted-foreground">›</span>
        <span className={cn(selectedProject ? 'text-foreground font-medium' : 'text-muted-foreground')}>
          {selectedProject ? `案件: ${selectedProject.name}` : '案件未選択'}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* クライアント */}
        <div className="rounded-xl border bg-card p-4">
          <ColumnHeader>① クライアント</ColumnHeader>
          <div className="relative mb-3">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              placeholder="検索..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border bg-background pl-8 pr-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {clientsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <EmptyMessage>クライアントが見つかりません</EmptyMessage>
          ) : (
            <div className="max-h-[500px] overflow-y-auto space-y-2 pr-1">
              {filteredClients.map((c) => (
                <SelectableCard
                  key={c.id}
                  selected={state.clientId === c.id}
                  onClick={() =>
                    updateState({ clientId: c.id, productId: null, projectId: null })
                  }
                  title={c.name}
                />
              ))}
            </div>
          )}
        </div>

        {/* 商材 */}
        <div
          className={cn(
            'rounded-xl border bg-card p-4 transition-opacity',
            !state.clientId && 'opacity-50'
          )}
        >
          <ColumnHeader>② 商材</ColumnHeader>
          <AnimatePresence mode="wait">
            {!state.clientId ? (
              <EmptyMessage key="empty">クライアントを選択してください</EmptyMessage>
            ) : productsLoading ? (
              <div key="loading" className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : products.length === 0 ? (
              <EmptyMessage key="none">商材が登録されていません</EmptyMessage>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[500px] overflow-y-auto space-y-2 pr-1"
              >
                {products.map((p) => (
                  <SelectableCard
                    key={p.id}
                    selected={state.productId === p.id}
                    onClick={() => updateState({ productId: p.id, projectId: null })}
                    title={p.name}
                    meta={p.label}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 案件 */}
        <div
          className={cn(
            'rounded-xl border bg-card p-4 transition-opacity',
            !state.productId && 'opacity-50'
          )}
        >
          <ColumnHeader>③ 案件</ColumnHeader>
          <AnimatePresence mode="wait">
            {!state.productId ? (
              <EmptyMessage key="empty">商材を選択してください</EmptyMessage>
            ) : projectsLoading ? (
              <div key="loading" className="flex items-center justify-center py-8">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            ) : projects.length === 0 ? (
              <EmptyMessage key="none">案件が登録されていません</EmptyMessage>
            ) : (
              <motion.div
                key="list"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className="max-h-[500px] overflow-y-auto space-y-2 pr-1"
              >
                {projects.map((p) => (
                  <SelectableCard
                    key={p.id}
                    selected={state.projectId === p.id}
                    onClick={() => updateState({ projectId: p.id })}
                    title={p.name}
                    meta={p.status ?? undefined}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default SpotStepTarget;
