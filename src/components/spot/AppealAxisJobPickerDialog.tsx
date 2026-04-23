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
import type { GeneratedCopy } from '@/types/bulk-composition';

interface JobRow {
  id: string;
  created_at: string | null;
  copies: GeneratedCopy[];
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (copies: GeneratedCopy[], jobId: string) => void;
}

const AppealAxisJobPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<JobRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('gen_spot_jobs')
          .select('id, created_at, output_data')
          .eq('project_id', projectId)
          .eq('tool_type', 'appeal_axis_copy')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        const rows: JobRow[] = (data ?? [])
          .map((j) => {
            const copies = ((j.output_data as { copies?: GeneratedCopy[] } | null)?.copies ??
              []) as GeneratedCopy[];
            return { id: j.id, created_at: j.created_at, copies };
          })
          .filter((j) => j.copies.length > 0);
        setJobs(rows);
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
          <DialogTitle>過去の訴求軸・コピー生成から選択</DialogTitle>
          <DialogDescription>
            選択した生成セットの全パターンを一括生成の対象として読み込みます
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みの訴求軸・コピー生成がありません
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
                const axisCount = new Set(j.copies.map((c) => c.appeal_axis_index)).size;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onPick(j.copies, j.id)}
                    className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm cursor-pointer transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{created}</span>
                      <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                        訴求軸{axisCount}件 / コピー{j.copies.length}件
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                      {j.copies
                        .slice(0, 3)
                        .map((c) => c.appeal_axis_text)
                        .filter((v, i, a) => a.indexOf(v) === i)
                        .join(' / ')}
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

export default AppealAxisJobPickerDialog;
