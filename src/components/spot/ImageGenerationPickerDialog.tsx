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

export interface ImageGenJobRow {
  id: string;
  created_at: string | null;
  input_data: Record<string, unknown> | null;
  image_urls: string[];
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (job: ImageGenJobRow) => void;
}

const ImageGenerationPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<ImageGenJobRow[]>([]);
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
          .eq('tool_type', 'image_generation')
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
          .select('job_id, file_url, sort_order')
          .in('job_id', ids)
          .eq('asset_type', 'image')
          .order('sort_order');
        const urlsByJob = new Map<string, string[]>();
        (assetRows ?? []).forEach((row: any) => {
          if (!row.file_url) return;
          const list = urlsByJob.get(row.job_id) ?? [];
          list.push(row.file_url as string);
          urlsByJob.set(row.job_id, list);
        });
        if (cancelled) return;
        setJobs(
          jobRows
            .map((j) => ({
              id: j.id,
              created_at: j.created_at,
              input_data: j.input_data as Record<string, unknown> | null,
              image_urls: urlsByJob.get(j.id) ?? [],
            }))
            .filter((j) => j.image_urls.length > 0)
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
          <DialogTitle>絵コンテ画像から選択</DialogTitle>
          <DialogDescription>過去に生成された絵コンテ画像をコマとして読み込みます</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みの絵コンテ画像がありません
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
                    onClick={() => onPick(j)}
                    className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-muted-foreground">{created}</span>
                      <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                        {j.image_urls.length}枚
                      </span>
                    </div>
                    <div className="flex gap-1.5">
                      {j.image_urls.slice(0, 3).map((url, i) => (
                        <img
                          key={i}
                          src={url}
                          alt=""
                          className="w-12 h-12 rounded object-cover bg-muted"
                        />
                      ))}
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

export default ImageGenerationPickerDialog;
