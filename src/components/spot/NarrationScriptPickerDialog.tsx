import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ScriptJobRow {
  id: string;
  created_at: string | null;
  full_script: string;
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (script: string, jobInfo: { id: string; created_at: string | null }) => void;
}

const NarrationScriptPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<ScriptJobRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: jobRows } = await supabase
          .from('gen_spot_jobs')
          .select('id, created_at')
          .eq('project_id', projectId)
          .eq('tool_type', 'narration_script')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (!jobRows || jobRows.length === 0) {
          setJobs([]);
          return;
        }
        const ids = jobRows.map((j) => j.id);
        const { data: assetRows } = await supabase
          .from('gen_spot_assets')
          .select('job_id, metadata')
          .in('job_id', ids);
        const scriptByJob = new Map<string, string>();
        (assetRows ?? []).forEach((row: any) => {
          const fs = row.metadata?.full_script as string | undefined;
          if (fs && !scriptByJob.has(row.job_id)) scriptByJob.set(row.job_id, fs);
        });
        if (cancelled) return;
        setJobs(
          jobRows
            .map((j) => ({
              id: j.id,
              created_at: j.created_at,
              full_script: scriptByJob.get(j.id) ?? '',
            }))
            .filter((j) => j.full_script.length > 0)
        );
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, projectId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>NA原稿から読み込み</DialogTitle>
          <DialogDescription>過去に生成されたナレーション原稿を読み込みます</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みのNA原稿がありません
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {jobs.map((j) => {
                const created = j.created_at
                  ? new Date(j.created_at).toLocaleString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() =>
                      onPick(j.full_script, { id: j.id, created_at: j.created_at })
                    }
                    className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{created}</span>
                      <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                        {j.full_script.length}文字
                      </span>
                    </div>
                    <div className="text-xs line-clamp-2 text-foreground/80">
                      {j.full_script.slice(0, 120)}
                      {j.full_script.length > 120 && '...'}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default NarrationScriptPickerDialog;
