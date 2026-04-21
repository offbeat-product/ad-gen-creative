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

export interface CarouselVideoJobRow {
  id: string;
  created_at: string | null;
  output_file_url: string | null;
  input_data: Record<string, unknown> | null;
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (job: CarouselVideoJobRow) => void;
}

const CarouselVideoPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<CarouselVideoJobRow[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !projectId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data: jobRows } = await supabase
          .from('gen_spot_jobs')
          .select('id, created_at, output_file_url, input_data')
          .eq('project_id', projectId)
          .eq('tool_type', 'carousel_video')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        if (!jobRows || jobRows.length === 0) {
          setJobs([]);
          return;
        }
        const jobsList = jobRows as CarouselVideoJobRow[];
        const missingIds = jobsList.filter((j) => !j.output_file_url).map((j) => j.id);
        if (missingIds.length > 0) {
          const { data: assetRows } = await supabase
            .from('gen_spot_assets')
            .select('job_id, file_url')
            .in('job_id', missingIds)
            .eq('asset_type', 'carousel_video');
          const urlByJob = new Map<string, string>();
          (assetRows ?? []).forEach((r: any) => {
            if (r.file_url && !urlByJob.has(r.job_id)) urlByJob.set(r.job_id, r.file_url);
          });
          jobsList.forEach((j) => {
            if (!j.output_file_url && urlByJob.has(j.id)) {
              j.output_file_url = urlByJob.get(j.id)!;
            }
          });
        }
        if (cancelled) return;
        setJobs(jobsList.filter((j) => !!j.output_file_url));
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
          <DialogTitle>カルーセル動画から選択</DialogTitle>
          <DialogDescription>
            この案件で過去に生成されたカルーセル動画を読み込みます
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みのカルーセル動画がありません
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
                const aspect = (j.input_data as any)?.aspect_ratio as string | undefined;
                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => onPick(j)}
                    className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{created}</span>
                      {aspect && (
                        <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                          {aspect}
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      {j.output_file_url}
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

export default CarouselVideoPickerDialog;
