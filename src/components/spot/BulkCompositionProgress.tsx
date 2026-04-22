import { Loader2, CheckCircle2, XCircle, Clock, AlertCircle } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
} from '@/types/bulk-composition';

interface Props {
  batch: BulkCompositionBatch;
  jobs: BulkCompositionJob[];
}

const statusLabel: Record<string, string> = {
  completed: '完了',
  failed: '失敗',
  running: '生成中',
  pending: '待機中',
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'completed':
      return <CheckCircle2 className="h-4 w-4 text-success" />;
    case 'failed':
      return <XCircle className="h-4 w-4 text-destructive" />;
    case 'running':
      return <Loader2 className="h-4 w-4 animate-spin text-secondary" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground" />;
  }
};

const BulkCompositionProgress = ({ batch, jobs }: Props) => {
  const compositionJobs = jobs.filter((j) => j.tool_type === 'composition');
  const naScriptJobs = jobs.filter((j) => j.tool_type === 'narration_script');
  const storyboardJobs = jobs.filter(
    (j) =>
      j.tool_type === 'image_generation' &&
      (j.input_data as Record<string, unknown>)?.storyboard_kind === 'spot'
  );

  const compCompleted = compositionJobs.filter((j) => j.status === 'completed').length;
  const naCompleted = naScriptJobs.filter((j) => j.status === 'completed').length;
  const sbCompleted = storyboardJobs.filter((j) => j.status === 'completed').length;

  const isWithNa = !!batch.with_na_script;
  const isWithSb = !!batch.with_storyboard_images;
  const total = batch.total_count;

  // Pair completion = lowest count among enabled phases
  let pairsCompleted = compCompleted;
  if (isWithNa) pairsCompleted = Math.min(pairsCompleted, naCompleted);
  if (isWithSb) pairsCompleted = Math.min(pairsCompleted, sbCompleted);

  const totalDone = batch.completed_count + batch.failed_count;
  const progress =
    total > 0 ? Math.round((pairsCompleted / total) * 100) : 0;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            {batch.status === 'running' && (
              <Loader2 className="h-5 w-5 animate-spin text-secondary" />
            )}
            {batch.status === 'completed' && (
              <CheckCircle2 className="h-5 w-5 text-success" />
            )}
            {batch.status === 'partially_completed' && (
              <AlertCircle className="h-5 w-5 text-warning" />
            )}
            {batch.status === 'failed' && (
              <XCircle className="h-5 w-5 text-destructive" />
            )}
            <h3 className="text-base font-semibold">構成案 一括生成</h3>
          </div>
          <div className="text-sm text-muted-foreground">
            {pairsCompleted} / {total} パターン完了
          </div>
        </div>

        <div className="space-y-1.5">
          <Progress value={progress} className="h-2" />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>
              ✅ {batch.completed_count} 完了 / ❌ {batch.failed_count} 失敗
            </span>
            <span>{progress}%</span>
          </div>
        </div>

        {/* Per-phase progress */}
        <div className="space-y-1 text-xs text-muted-foreground border-t pt-3">
          <div className="flex justify-between">
            <span>📝 構成案</span>
            <span className="font-mono">
              {compCompleted}/{total}
            </span>
          </div>
          {isWithNa && (
            <div className="flex justify-between">
              <span>🎙 NA原稿</span>
              <span className="font-mono">
                {naCompleted}/{total}
              </span>
            </div>
          )}
          {isWithSb && (
            <div className="flex justify-between">
              <span>
                🎬 絵コンテ画像{' '}
                <span className="text-warning">(時間がかかります)</span>
              </span>
              <span className="font-mono">
                {sbCompleted}/{total}
              </span>
            </div>
          )}
        </div>
      </div>

      {batch.status === 'partially_completed' && (
        <Alert variant="default" className="border-warning/40 bg-warning/5">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription>
            一部の構成案生成が失敗しました ({batch.failed_count}件)。完了した
            {batch.completed_count}件のみダウンロード可能です。
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        {jobs
          .slice()
          .sort(
            (a, b) =>
              (a.input_data.bulk_index ?? 0) - (b.input_data.bulk_index ?? 0)
          )
          .map((job) => (
            <div
              key={job.id}
              className="rounded-lg border bg-card p-3 flex items-start gap-3"
            >
              <div className="pt-0.5">
                <StatusIcon status={job.status} />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-semibold">
                    #{(job.input_data.bulk_index ?? 0) + 1}
                  </span>
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {statusLabel[job.status] || job.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground line-clamp-1">
                  {job.input_data.appeal_axis}
                </div>
                <div className="text-sm line-clamp-1">
                  「{job.input_data.copy_text}」
                </div>
                {job.status === 'failed' && job.error_message && (
                  <div className="text-xs text-destructive">
                    エラー: {job.error_message}
                  </div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
};

export default BulkCompositionProgress;
