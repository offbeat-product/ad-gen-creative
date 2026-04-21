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

interface CopyItem {
  pattern_id?: string;
  appeal_axis_index?: number;
  copy_index?: number;
  copy_text?: string;
  hook?: string;
  appeal_axis_text?: string;
}

interface JobWithCopies {
  id: string;
  created_at: string | null;
  copies: CopyItem[];
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (axis: string, copy: string) => void;
}

const AppealAxisPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<JobWithCopies[]>([]);
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
          .eq('tool_type', 'appeal_axis')
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
        const copiesByJob = new Map<string, CopyItem[]>();
        (assetRows ?? []).forEach((row: any) => {
          const copies = row.metadata?.copies as CopyItem[] | undefined;
          if (Array.isArray(copies) && copies.length > 0) {
            const existing = copiesByJob.get(row.job_id) ?? [];
            copiesByJob.set(row.job_id, [...existing, ...copies]);
          }
        });
        if (cancelled) return;
        setJobs(
          jobRows.map((j) => ({
            id: j.id,
            created_at: j.created_at,
            copies: copiesByJob.get(j.id) ?? [],
          }))
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
          <DialogTitle>訴求軸・コピーを選択</DialogTitle>
          <DialogDescription>パターンを1つ選んで読み込みます</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.filter((j) => j.copies.length > 0).length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みの訴求軸生成がありません
            </div>
          ) : (
            <div className="space-y-3 py-2">
              {jobs.map((j) => {
                if (j.copies.length === 0) return null;
                const created = j.created_at
                  ? new Date(j.created_at).toLocaleString('ja-JP', {
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })
                  : '';
                return (
                  <div key={j.id} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="text-xs text-muted-foreground">{created}</div>
                    <div className="grid gap-1.5">
                      {j.copies.map((c, idx) => (
                        <button
                          key={`${c.pattern_id ?? idx}-${idx}`}
                          type="button"
                          onClick={() =>
                            onPick(c.appeal_axis_text ?? '', c.copy_text ?? '')
                          }
                          className="w-full text-left rounded border bg-background p-2 hover:border-secondary transition-all"
                        >
                          <div className="flex items-center gap-2 mb-0.5">
                            {c.pattern_id && (
                              <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded font-mono">
                                {c.pattern_id}
                              </span>
                            )}
                            <div className="text-xs font-semibold text-secondary truncate">
                              {c.appeal_axis_text ?? `パターン ${idx + 1}`}
                            </div>
                          </div>
                          {c.copy_text && (
                            <div className="text-xs">「{c.copy_text}」</div>
                          )}
                          {c.hook && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              💡 {c.hook}
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default AppealAxisPickerDialog;
