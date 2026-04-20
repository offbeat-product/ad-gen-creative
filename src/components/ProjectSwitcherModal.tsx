import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronRight, Star, Clock, FolderOpen, Search, ChevronDown } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useCurrentProject } from '@/contexts/CurrentProjectContext';
import { cn } from '@/lib/utils';

interface ProjectSwitcherModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ProjectRow {
  id: string;
  name: string;
  product_id: string | null;
  product_name?: string;
  client_name?: string;
  client_id?: string;
}

const ProjectSwitcherModal = ({ open, onOpenChange }: ProjectSwitcherModalProps) => {
  const { setCurrentProjectId } = useCurrentProject();
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<ProjectRow[]>([]);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [expandedClients, setExpandedClients] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    void loadData();
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: projectData } = await supabase
        .from('projects')
        .select('id, name, product_id, products(id, name, client_id, clients(id, name))')
        .order('created_at', { ascending: false });

      const flat: ProjectRow[] = (projectData ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        product_id: p.product_id,
        product_name: p.products?.name,
        client_id: p.products?.clients?.id,
        client_name: p.products?.clients?.name,
      }));
      setProjects(flat);

      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        try {
          const { data: favs } = await (supabase as any)
            .from('gen_favorites')
            .select('project_id')
            .eq('user_id', user.id);
          if (favs) setFavoriteIds(new Set(favs.map((f: any) => f.project_id)));
        } catch { /* table may not exist */ }

        try {
          const { data: jobs } = await (supabase as any)
            .from('gen_spot_jobs')
            .select('project_id, created_at')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false })
            .limit(50);
          if (jobs) {
            const seen = new Set<string>();
            const ordered: string[] = [];
            for (const j of jobs) {
              if (j.project_id && !seen.has(j.project_id)) {
                seen.add(j.project_id);
                ordered.push(j.project_id);
                if (ordered.length >= 10) break;
              }
            }
            setRecentIds(ordered);
          }
        } catch { /* table may not exist */ }
      }
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.product_name?.toLowerCase().includes(q) ||
        p.client_name?.toLowerCase().includes(q),
    );
  }, [projects, search]);

  const pinnedProjects = filtered.filter((p) => favoriteIds.has(p.id));
  const recentProjects = recentIds
    .map((id) => filtered.find((p) => p.id === id))
    .filter((p): p is ProjectRow => Boolean(p));

  const groupedByClient = useMemo(() => {
    const map = new Map<string, { clientName: string; products: Map<string, { productName: string; projects: ProjectRow[] }> }>();
    for (const p of filtered) {
      const cId = p.client_id ?? 'unknown';
      const cName = p.client_name ?? '未分類';
      if (!map.has(cId)) map.set(cId, { clientName: cName, products: new Map() });
      const clientGroup = map.get(cId)!;
      const pId = p.product_id ?? 'unknown';
      const pName = p.product_name ?? '未分類';
      if (!clientGroup.products.has(pId)) clientGroup.products.set(pId, { productName: pName, projects: [] });
      clientGroup.products.get(pId)!.projects.push(p);
    }
    return map;
  }, [filtered]);

  const handleSelect = (projectId: string) => {
    setCurrentProjectId(projectId);
    onOpenChange(false);
  };

  const toggleFavorite = async (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const isPinned = favoriteIds.has(projectId);
    const next = new Set(favoriteIds);
    if (isPinned) next.delete(projectId);
    else next.add(projectId);
    setFavoriteIds(next);
    try {
      if (isPinned) {
        await (supabase as any).from('gen_favorites').delete().eq('user_id', user.id).eq('project_id', projectId);
      } else {
        await (supabase as any).from('gen_favorites').insert({ user_id: user.id, project_id: projectId });
      }
    } catch { /* table may not exist */ }
  };

  const toggleClient = (clientId: string) => {
    const next = new Set(expandedClients);
    if (next.has(clientId)) next.delete(clientId);
    else next.add(clientId);
    setExpandedClients(next);
  };

  const ProjectCard = ({ p }: { p: ProjectRow }) => (
    <button
      onClick={() => handleSelect(p.id)}
      className="w-full text-left rounded-lg border border-border bg-card hover:bg-accent transition-colors p-3 flex items-center justify-between group"
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <span>{p.client_name ?? '—'}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span>{p.product_name ?? '—'}</span>
        </div>
        <div className="text-sm font-medium truncate mt-0.5">{p.name}</div>
      </div>
      <button
        onClick={(e) => toggleFavorite(p.id, e)}
        className="shrink-0 p-1 rounded hover:bg-background"
        aria-label={favoriteIds.has(p.id) ? 'ピン留めを外す' : 'ピン留め'}
      >
        <Star
          className={cn(
            'h-4 w-4 transition-colors',
            favoriteIds.has(p.id) ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground',
          )}
        />
      </button>
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col gap-4">
        <DialogHeader>
          <DialogTitle>案件を選択</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="クライアント名・商材名・案件名で検索"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <ScrollArea className="flex-1 -mx-2 px-2">
          {loading ? (
            <div className="text-center text-sm text-muted-foreground py-8">読み込み中...</div>
          ) : (
            <div className="space-y-5 pb-2">
              {pinnedProjects.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                    <Star className="h-3.5 w-3.5 fill-yellow-400 text-yellow-400" />
                    ピン留め
                  </div>
                  <div className="space-y-2">
                    {pinnedProjects.map((p) => <ProjectCard key={p.id} p={p} />)}
                  </div>
                </section>
              )}

              {recentProjects.length > 0 && (
                <section>
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                    <Clock className="h-3.5 w-3.5" />
                    最近アクセス
                  </div>
                  <div className="space-y-2">
                    {recentProjects.map((p) => <ProjectCard key={`recent-${p.id}`} p={p} />)}
                  </div>
                </section>
              )}

              <section>
                <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mb-2">
                  <FolderOpen className="h-3.5 w-3.5" />
                  全て
                </div>
                <div className="space-y-1">
                  {Array.from(groupedByClient.entries()).map(([clientId, group]) => {
                    const expanded = expandedClients.has(clientId) || search.trim().length > 0;
                    return (
                      <div key={clientId} className="rounded-lg border border-border">
                        <button
                          onClick={() => toggleClient(clientId)}
                          className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium hover:bg-accent rounded-lg"
                        >
                          <ChevronDown className={cn('h-4 w-4 transition-transform', !expanded && '-rotate-90')} />
                          <span>{group.clientName}</span>
                        </button>
                        {expanded && (
                          <div className="px-3 pb-3 space-y-3">
                            {Array.from(group.products.entries()).map(([prodId, prodGroup]) => (
                              <div key={prodId}>
                                <div className="text-xs text-muted-foreground mb-1.5 pl-1">{prodGroup.productName}</div>
                                <div className="space-y-1.5">
                                  {prodGroup.projects.map((p) => <ProjectCard key={p.id} p={p} />)}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {groupedByClient.size === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-6">該当する案件がありません</div>
                  )}
                </div>
              </section>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default ProjectSwitcherModal;
