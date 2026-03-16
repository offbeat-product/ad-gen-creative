import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { ClientRow, ProductRow, ProjectRow } from '@/hooks/use-supabase-data';

const statusClass: Record<string, string> = {
  '進行中': 'bg-success-wash text-success',
  '準備中': 'bg-warning-wash text-warning',
  '完了': 'bg-muted text-muted-foreground',
  '一時停止': 'bg-destructive/10 text-destructive',
};

const SettingsClients = () => {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedClient, setExpandedClient] = useState<string | null>(null);
  const [expandedProduct, setExpandedProduct] = useState<string | null>(null);

  // Products/projects per expanded client/product
  const [products, setProducts] = useState<Record<string, ProductRow[]>>({});
  const [projects, setProjects] = useState<Record<string, ProjectRow[]>>({});

  // Modals
  const [clientModal, setClientModal] = useState<{ mode: 'add' | 'edit'; id?: string; name: string } | null>(null);
  const [productModal, setProductModal] = useState<{ clientId: string; name: string; label: string } | null>(null);
  const [projectModal, setProjectModal] = useState<{ productId: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'client' | 'product' | 'project'; id: string; name: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const fetchClients = async () => {
    setLoading(true);
    const { data } = await supabase.from('clients').select('*').order('sort_order');
    setClients(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, []);

  const fetchProducts = async (clientId: string) => {
    const { data } = await supabase.from('products').select('*').eq('client_id', clientId).order('sort_order');
    setProducts(prev => ({ ...prev, [clientId]: data ?? [] }));
  };

  const fetchProjects = async (productId: string) => {
    const { data } = await supabase.from('projects').select('*').eq('product_id', productId).order('sort_order');
    setProjects(prev => ({ ...prev, [productId]: data ?? [] }));
  };

  const handleExpandClient = (clientId: string) => {
    const next = expandedClient === clientId ? null : clientId;
    setExpandedClient(next);
    if (next && !products[next]) fetchProducts(next);
  };

  const handleExpandProduct = (productId: string) => {
    const next = expandedProduct === productId ? null : productId;
    setExpandedProduct(next);
    if (next && !projects[next]) fetchProjects(next);
  };

  // CRUD
  const saveClient = async () => {
    if (!clientModal || !clientModal.name.trim()) return;
    setSaving(true);
    if (clientModal.mode === 'add') {
      const { error } = await supabase.from('clients').insert({ name: clientModal.name.trim(), sort_order: clients.length });
      if (error) toast({ title: 'エラー', description: error.message, variant: 'destructive' });
      else toast({ title: 'クライアントを追加しました' });
    } else if (clientModal.id) {
      const { error } = await supabase.from('clients').update({ name: clientModal.name.trim() }).eq('id', clientModal.id);
      if (error) toast({ title: 'エラー', description: error.message, variant: 'destructive' });
      else toast({ title: 'クライアントを更新しました' });
    }
    setSaving(false);
    setClientModal(null);
    fetchClients();
  };

  const saveProduct = async () => {
    if (!productModal || !productModal.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('products').insert({
      name: productModal.name.trim(),
      label: productModal.label.trim() || productModal.name.trim(),
      code: productModal.name.trim().toLowerCase().replace(/\s+/g, '-'),
      client_id: productModal.clientId,
    });
    setSaving(false);
    if (error) toast({ title: 'エラー', description: error.message, variant: 'destructive' });
    else { toast({ title: '商材を追加しました' }); fetchProducts(productModal.clientId); }
    setProductModal(null);
  };

  const saveProject = async () => {
    if (!projectModal || !projectModal.name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('projects').insert({
      name: projectModal.name.trim(),
      product_id: projectModal.productId,
      status: '準備中',
    });
    setSaving(false);
    if (error) toast({ title: 'エラー', description: error.message, variant: 'destructive' });
    else { toast({ title: '案件を追加しました' }); fetchProjects(projectModal.productId); }
    setProjectModal(null);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    const { error } = await supabase.from(
      deleteTarget.type === 'client' ? 'clients' : deleteTarget.type === 'product' ? 'products' : 'projects'
    ).delete().eq('id', deleteTarget.id);
    setSaving(false);
    if (error) toast({ title: 'エラー', description: error.message, variant: 'destructive' });
    else {
      toast({ title: `${deleteTarget.name}を削除しました` });
      if (deleteTarget.type === 'client') fetchClients();
    }
    setDeleteTarget(null);
  };

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.2 }} className="space-y-4">
      <div className="flex items-center gap-3 flex-wrap">
        <Button variant="outline" size="sm" onClick={() => setClientModal({ mode: 'add', name: '' })}>
          <Plus className="h-3.5 w-3.5 mr-1" />新しいクライアントを追加
        </Button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input placeholder="クライアント名で検索..." value={search} onChange={e => setSearch(e.target.value)} className="pl-8 h-9" />
        </div>
      </div>

      <div className="space-y-2">
        {filtered.map(client => (
          <Collapsible key={client.id} open={expandedClient === client.id} onOpenChange={() => handleExpandClient(client.id)}>
            <CollapsibleTrigger className="w-full flex items-center gap-3 p-4 rounded-xl border border-border hover:bg-accent/50 transition-colors">
              {expandedClient === client.id ? <ChevronDown className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0" />}
              <span className="font-semibold">{client.name}</span>
              <div className="ml-auto flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setClientModal({ mode: 'edit', id: client.id, name: client.name })}><Edit2 className="h-3.5 w-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteTarget({ type: 'client', id: client.id, name: client.name })}><Trash2 className="h-3.5 w-3.5" /></Button>
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="pl-8 pr-4 py-3 space-y-2">
                {(products[client.id] ?? []).map(product => (
                  <Collapsible key={product.id} open={expandedProduct === product.id} onOpenChange={() => handleExpandProduct(product.id)}>
                    <CollapsibleTrigger className="w-full flex items-center gap-2 p-3 rounded-lg border border-border hover:bg-accent/30 transition-colors text-sm">
                      {expandedProduct === product.id ? <ChevronDown className="h-3.5 w-3.5 shrink-0" /> : <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
                      <span className="font-medium">{product.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">案件数: {(projects[product.id] ?? []).length}</span>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="pl-6 py-2 space-y-1.5">
                        {(projects[product.id] ?? []).map(proj => (
                          <div key={proj.id} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-accent/20">
                            <span>{proj.name}</span>
                            <Badge className={cn('text-xs', statusClass[proj.status ?? ''] ?? 'bg-muted text-muted-foreground')}>{proj.status ?? '未設定'}</Badge>
                          </div>
                        ))}
                        <Button variant="ghost" size="sm" className="text-xs text-secondary" onClick={() => setProjectModal({ productId: product.id, name: '' })}>
                          <Plus className="h-3 w-3 mr-1" />案件を追加
                        </Button>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
                <Button variant="ghost" size="sm" className="text-xs text-secondary" onClick={() => setProductModal({ clientId: client.id, name: '', label: '' })}>
                  <Plus className="h-3 w-3 mr-1" />商材を追加
                </Button>
              </motion.div>
            </CollapsibleContent>
          </Collapsible>
        ))}
      </div>

      {/* Client Modal */}
      <Dialog open={!!clientModal} onOpenChange={() => setClientModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>{clientModal?.mode === 'edit' ? 'クライアント編集' : 'クライアント追加'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>クライアント名 *</Label>
              <Input value={clientModal?.name ?? ''} onChange={e => setClientModal(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="会社名を入力" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClientModal(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={saveClient} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Modal */}
      <Dialog open={!!productModal} onOpenChange={() => setProductModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>商材追加</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>商材名 *</Label>
              <Input value={productModal?.name ?? ''} onChange={e => setProductModal(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="商材名を入力" />
            </div>
            <div className="space-y-1.5">
              <Label>ラベル</Label>
              <Input value={productModal?.label ?? ''} onChange={e => setProductModal(prev => prev ? { ...prev, label: e.target.value } : prev)} placeholder="表示ラベル" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProductModal(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={saveProduct} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Project Modal */}
      <Dialog open={!!projectModal} onOpenChange={() => setProjectModal(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>案件追加</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>案件名 *</Label>
              <Input value={projectModal?.name ?? ''} onChange={e => setProjectModal(prev => prev ? { ...prev, name: e.target.value } : prev)} placeholder="案件名を入力" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProjectModal(null)}>キャンセル</Button>
            <Button className="bg-secondary text-secondary-foreground" onClick={saveProject} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : '保存'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>削除の確認</AlertDialogTitle>
            <AlertDialogDescription>{deleteTarget?.name}を削除しますか？この操作は取り消せません。</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground" onClick={handleDelete}>削除する</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
};

export default SettingsClients;
