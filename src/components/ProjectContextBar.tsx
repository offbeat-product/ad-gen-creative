import { useEffect, useState } from 'react';
import { ChevronRight, Building2, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCurrentProject } from '@/contexts/CurrentProjectContext';
import { supabase } from '@/integrations/supabase/client';
import ProjectSwitcherModal from './ProjectSwitcherModal';

interface ProjectInfo {
  id: string;
  name: string;
  client_name?: string;
  product_name?: string;
}

const COPYRIGHT = '©MUGEN FACTORY/MUGENUP/weavin';

const ProjectContextBar = () => {
  const { currentProjectId } = useCurrentProject();
  const [project, setProject] = useState<ProjectInfo | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!currentProjectId) {
      setProject(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('projects')
        .select('id, name, products(name, clients(name))')
        .eq('id', currentProjectId)
        .maybeSingle();
      if (cancelled) return;
      if (data) {
        const d = data as any;
        setProject({
          id: d.id,
          name: d.name,
          product_name: d.products?.name,
          client_name: d.products?.clients?.name,
        });
      } else {
        setProject(null);
      }
    })();
    return () => { cancelled = true; };
  }, [currentProjectId]);

  return (
    <>
      <div className="bg-card border-b border-border px-6 py-2.5 flex items-center justify-between gap-4 sticky top-14 z-40">
        <div className="flex items-center gap-2 text-sm min-w-0 flex-1">
          {project ? (
            <>
              <Building2 className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{project.client_name ?? '—'}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="text-muted-foreground truncate">{project.product_name ?? '—'}</span>
              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
              <span className="font-medium truncate">{project.name}</span>
            </>
          ) : (
            <span className="text-muted-foreground italic">案件を選択してください</span>
          )}
        </div>

        <div className="hidden md:block text-xs text-muted-foreground shrink-0">{COPYRIGHT}</div>

        <div className="shrink-0">
          {project ? (
            <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
              案件切替
              <ChevronDown className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" onClick={() => setOpen(true)}>案件を選択</Button>
          )}
        </div>
      </div>

      <ProjectSwitcherModal open={open} onOpenChange={setOpen} />
    </>
  );
};

export default ProjectContextBar;
