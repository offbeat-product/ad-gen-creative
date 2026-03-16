import { useState } from 'react';
import { Plus, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type WizardState } from '@/data/wizard-data';
import { useClients, useProducts, useProjects } from '@/hooks/use-supabase-data';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface Props {
  state: WizardState;
  updateState: (u: Partial<WizardState>) => void;
  goToStep: (step: number) => void;
}

const StepProject = ({ state, updateState, goToStep }: Props) => {
  const [showModal, setShowModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [saving, setSaving] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const { clients } = useClients();
  const { products } = useProducts(state.clientId);
  const { projects, loading, refetch } = useProjects(state.productId);

  const client = clients.find(c => c.id === state.clientId);
  const product = products.find(p => p.id === state.productId);

  const handleCreate = async () => {
    if (!newName.trim() || !state.productId || !user) return;
    setSaving(true);
    const { error } = await supabase.from('projects').insert({
      name: newName.trim(),
      product_id: state.productId,
      status: '準備中',
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      toast({ title: 'エラー', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: '案件を作成しました' });
      setNewName('');
      setShowModal(false);
      refetch();
    }
  };

  const formatDeadline = (p: { deadline: string | null; overall_deadline: string | null }) => {
    const d = p.deadline || p.overall_deadline;
    if (!d) return null;
    return new Date(d).toLocaleDateString('ja-JP');
  };

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">案件を選択</h2>

      <div className="flex items-center gap-2 text-sm flex-wrap">
        <button onClick={() => goToStep(1)} className="text-secondary hover:underline text-xs">{client?.name}</button>
        <span className="text-muted-foreground text-xs">{'>'}</span>
        <button onClick={() => goToStep(2)} className="text-secondary hover:underline text-xs">{product?.name}</button>
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
                  p.status === '進行中' ? "bg-success-wash text-success"
                    : p.status === '準備中' ? "bg-warning-wash text-warning"
                    : "bg-muted text-muted-foreground"
                )}>
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
                <input
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  className="w-full mt-1 rounded-xl border bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setShowModal(false)}>キャンセル</Button>
              <Button variant="brand" size="sm" onClick={handleCreate} disabled={saving || !newName.trim()}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '作成'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StepProject;
