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

export interface NarrationAudioJobRow {
  id: string;
  created_at: string | null;
  output_file_url: string | null;
  input_data: Record<string, unknown> | null;
}

interface Props {
  projectId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (job: NarrationAudioJobRow) => void;
}

const NarrationAudioPickerDialog = ({ projectId, open, onOpenChange, onPick }: Props) => {
  const [jobs, setJobs] = useState<NarrationAudioJobRow[]>([]);
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
          .eq('tool_type', 'narration_audio')
          .eq('status', 'completed')
          .order('created_at', { ascending: false })
          .limit(20);
        if (cancelled) return;
        const list = ((jobRows ?? []) as NarrationAudioJobRow[]).slice();
        const missing = list.filter((j) => !j.output_file_url).map((j) => j.id);
        if (missing.length > 0) {
          const { data: assetRows } = await supabase
            .from('gen_spot_assets')
            .select('job_id, file_url')
            .in('job_id', missing)
            .eq('asset_type', 'narration_audio');
          const urlByJob = new Map<string, string>();
          (assetRows ?? []).forEach((r: any) => {
            if (r.file_url && !urlByJob.has(r.job_id)) urlByJob.set(r.job_id, r.file_url);
          });
          list.forEach((j) => {
            if (!j.output_file_url && urlByJob.has(j.id)) {
              j.output_file_url = urlByJob.get(j.id)!;
            }
          });
        }
        if (cancelled) return;
        setJobs(list.filter((j) => !!j.output_file_url));
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
          <DialogTitle>ナレーション音声から選択</DialogTitle>
          <DialogDescription>過去に生成された音声を読み込みます</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] -mx-6 px-6">
          {loading ? (
            <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              完了済みのナレーション音声がありません
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
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-muted-foreground">{created}</span>
                    </div>
                    <div className="text-[11px] truncate text-foreground/70 font-mono">
                      {j.output_file_url}
                    </div>
                    {j.output_file_url && (
                      <audio
                        src={j.output_file_url}
                        controls
                        className="w-full h-8 mt-1"
                        onClick={(e) => e.stopPropagation()}
                      />
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

export default NarrationAudioPickerDialog;
