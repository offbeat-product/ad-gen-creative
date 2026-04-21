import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';

export interface CompositionScene {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

export interface CompositionJobRow {
  id: string;
  created_at: string | null;
  input_data: Record<string, unknown> | null;
  scenes: CompositionScene[];
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (scenes: CompositionScene[], jobInfo: CompositionJobRow) => void;
}

const CompositionPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<CompositionJobRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: jobRows } = await supabase
          .from('gen_spot_jobs')
          .select('id, created_at, input_data')
          .eq('project_id', projectId)
          .eq('tool_type', 'composition')
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
        const scenesByJob = new Map<string, CompositionScene[]>();
        (assetRows ?? []).forEach((row: any) => {
          const scenes = row.metadata?.scenes as CompositionScene[] | undefined;
          if (scenes && Array.isArray(scenes)) scenesByJob.set(row.job_id, scenes);
        });
        if (cancelled) return;
        setJobs(
          jobRows.map((j) => ({
            id: j.id,
            created_at: j.created_at,
            input_data: j.input_data as Record<string, unknown> | null,
            scenes: scenesByJob.get(j.id) ?? [],
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
          <DialogTitle>過去の構成案から選択</DialogTitle>
          <DialogDescription>この案件で過去に生成された構成案を読み込みます</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みの構成案がありません
            </div>
          ) : (
            <div className="space-y-2 py-2">
              {jobs.map((j) => {
                const inputAxis = (j.input_data as any)?.appeal_axis as string | undefined;
                const inputCopy = (j.input_data as any)?.copy_text as string | undefined;
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
                    onClick={() => onPick(j.scenes, j)}
                    disabled={j.scenes.length === 0}
                    className={cn(
                      'w-full text-left rounded-lg border bg-card p-3 transition-all',
                      j.scenes.length > 0
                        ? 'hover:border-secondary hover:shadow-sm cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{created}</span>
                      <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                        {j.scenes.length}シーン
                      </span>
                    </div>
                    {inputAxis && (
                      <div className="text-sm font-medium truncate">訴求軸: {inputAxis}</div>
                    )}
                    {inputCopy && (
                      <div className="text-xs text-muted-foreground truncate">
                        コピー: {inputCopy}
                      </div>
                    )}
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

export default CompositionPickerDialog;
