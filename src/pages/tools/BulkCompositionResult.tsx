import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Home,
  Loader2,
  Check,
  FolderOpen,
  ChevronRight,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import BulkCompositionDocxDownload from '@/components/spot/BulkCompositionDocxDownload';
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
  BulkSceneOutput,
  BulkCompositionAsset,
} from '@/types/bulk-composition';

const STEPS = [
  'クライアント・商材・案件',
  'データ収集',
  '設定',
  '生成結果',
];

interface ProjectMeta {
  client_name: string;
  product_name: string;
  project_name: string;
}

const BulkCompositionResult = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const projectId = searchParams.get('project_id') || '';
  const batchId = searchParams.get('batch_id') || '';

  const [batch, setBatch] = useState<BulkCompositionBatch | null>(null);
  const [jobs, setJobs] = useState<BulkCompositionJob[]>([]);
  const [projectMeta, setProjectMeta] = useState<ProjectMeta | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!batchId || !projectId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data: batchData } = await supabase
        .from('bulk_composition_batches')
        .select('*')
        .eq('id', batchId)
        .maybeSingle();

      if (cancelled) return;

      if (batchData) {
        setBatch(batchData as unknown as BulkCompositionBatch);

        // Fetch ALL jobs related to this batch (composition + chained NA + storyboard).
        const { data: chainedJobs } = await supabase
          .from('gen_spot_jobs')
          .select('*')
          .eq('project_id', projectId)
          .contains('input_data', { bulk_batch_id: batchId })
          .order('created_at', { ascending: true });

        let merged = (chainedJobs || []) as unknown as BulkCompositionJob[];

        // Fallback: include explicit spot_job_ids in case input_data lacks bulk_batch_id.
        const jobIds = (batchData.spot_job_ids ?? []) as string[];
        if (jobIds.length > 0) {
          const { data: byIds } = await supabase
            .from('gen_spot_jobs')
            .select('*')
            .in('id', jobIds);
          if (byIds) {
            const seen = new Set(merged.map((j) => j.id));
            for (const j of byIds as unknown as BulkCompositionJob[]) {
              if (!seen.has(j.id)) merged.push(j);
            }
          }
        }

        if (!cancelled) setJobs(merged);
      }

      const { data: project } = await supabase
        .from('projects')
        .select('name, product:products(name, client:clients(name))')
        .eq('id', projectId)
        .maybeSingle();
      if (!cancelled && project) {
        const p = project as unknown as {
          name: string;
          product: { name: string; client: { name: string } | null } | null;
        };
        setProjectMeta({
          client_name: p.product?.client?.name ?? '',
          product_name: p.product?.name ?? '',
          project_name: p.name ?? '',
        });
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [batchId, projectId]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto p-12 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-secondary" />
        <p className="mt-3 text-sm text-muted-foreground">読み込み中...</p>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="max-w-6xl mx-auto p-8 text-center space-y-4">
        <h2 className="text-lg font-semibold">
          指定された一括生成バッチが見つかりません
        </h2>
        <Button variant="outline" onClick={() => navigate('/')}>
          ダッシュボードに戻る
        </Button>
      </div>
    );
  }

  const completedJobs = jobs.filter((j) => j.status === 'completed');
  const failedJobs = jobs.filter((j) => j.status === 'failed');
  const creativeType =
    (jobs[0]?.input_data as { creative_type?: string })?.creative_type ===
    'banner'
      ? 'banner'
      : 'video';

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">
          🎬 構成案・字コンテ生成
        </h1>
        <p className="text-sm text-muted-foreground">
          訴求軸とコピーから動画の構成案・字コンテを生成します
        </p>
      </div>

      {/* Stepper - all 4 steps marked complete */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((label, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <div
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold',
                  'bg-secondary text-secondary-foreground',
                  i === STEPS.length - 1 && 'ring-4 ring-secondary-wash scale-110'
                )}
              >
                <Check className="h-4 w-4" />
              </div>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  i === STEPS.length - 1
                    ? 'text-foreground font-medium'
                    : 'text-muted-foreground'
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-px mx-2 -mt-6 bg-secondary" />
            )}
          </div>
        ))}
      </div>

      {/* Mobile stepper */}
      <div className="md:hidden flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">
          ステップ {STEPS.length}/{STEPS.length}
        </span>
        <span className="text-sm font-medium">{STEPS[STEPS.length - 1]}</span>
      </div>

      {/* Project breadcrumb */}
      {projectMeta && (
        <div className="text-xs text-muted-foreground flex items-center gap-1.5 flex-wrap rounded-md bg-muted/40 px-3 py-1.5">
          <FolderOpen className="h-3 w-3 shrink-0" />
          <span>{projectMeta.client_name}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span>{projectMeta.product_name}</span>
          <ChevronRight className="h-3 w-3 shrink-0" />
          <span className="font-medium text-foreground">
            {projectMeta.project_name}
          </span>
        </div>
      )}

      {/* Title */}
      <div className="space-y-1">
        <h2 className="text-xl font-bold font-display tracking-tight">
          🎉 一括生成結果
        </h2>
        <p className="text-sm text-muted-foreground">
          {new Date(batch.created_at).toLocaleString('ja-JP')}
        </p>
      </div>

      {/* Summary */}
      <SummaryCard
        batch={batch}
        completedCount={completedJobs.length}
        failedCount={failedJobs.length}
      />

      {/* Download */}
      {completedJobs.length > 0 && projectMeta && (
        <BulkCompositionDocxDownload
          batch={batch}
          jobs={completedJobs}
          projectMeta={projectMeta}
        />
      )}

      {/* Job cards */}
      <div className="space-y-3">
        <h3 className="text-base font-semibold">
          生成された構成案 ({jobs.length}件)
        </h3>
        <div className="space-y-2">
          {jobs
            .slice()
            .sort(
              (a, b) =>
                ((a.input_data.bulk_index ?? 0) as number) -
                ((b.input_data.bulk_index ?? 0) as number)
            )
            .map((job, idx) => (
              <JobCard
                key={job.id}
                job={job}
                index={idx + 1}
                creativeType={creativeType}
              />
            ))}
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4 border-t">
        <Button
          variant="ghost"
          onClick={() =>
            navigate(
              `/tools/composition?project_id=${projectId}&mode=bulk`
            )
          }
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          新しい一括生成を始める
        </Button>
        <Button variant="outline" onClick={() => navigate('/')}>
          <Home className="h-4 w-4 mr-2" />
          ダッシュボードに戻る
        </Button>
      </div>
    </div>
  );
};

// ====== Summary card ======
const SummaryCard = ({
  batch,
  completedCount,
  failedCount,
}: {
  batch: BulkCompositionBatch;
  completedCount: number;
  failedCount: number;
}) => {
  const isSuccess = batch.status === 'completed';
  const isPartial = batch.status === 'partially_completed';
  const isFailed = batch.status === 'failed';

  const durationMs =
    batch.completed_at && batch.created_at
      ? new Date(batch.completed_at).getTime() -
        new Date(batch.created_at).getTime()
      : 0;
  const durationSec = Math.round(durationMs / 1000);

  const borderClass = isSuccess
    ? 'border-success/40 bg-success/5'
    : isPartial
      ? 'border-warning/40 bg-warning/5'
      : 'border-destructive/40 bg-destructive/5';

  return (
    <div className={cn('rounded-xl border-2 p-5', borderClass)}>
      <div className="flex items-start gap-4">
        <div className="pt-0.5">
          {isSuccess && <CheckCircle2 className="h-8 w-8 text-success" />}
          {isPartial && <AlertCircle className="h-8 w-8 text-warning" />}
          {isFailed && <XCircle className="h-8 w-8 text-destructive" />}
        </div>
        <div className="flex-1 space-y-2">
          <h3 className="font-bold text-lg">
            {isSuccess && `${completedCount}件すべての構成案を生成しました`}
            {isPartial && `${completedCount}件成功 / ${failedCount}件失敗`}
            {isFailed && 'すべての生成に失敗しました'}
          </h3>
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
            <span>
              <span className="text-muted-foreground">完了:</span>{' '}
              <span className="font-bold text-success">{completedCount}件</span>
            </span>
            {failedCount > 0 && (
              <span>
                <span className="text-muted-foreground">失敗:</span>{' '}
                <span className="font-bold text-destructive">
                  {failedCount}件
                </span>
              </span>
            )}
            {durationSec > 0 && (
              <span>
                <span className="text-muted-foreground">所要時間:</span>{' '}
                <span className="font-medium">
                  {durationSec < 60
                    ? `${durationSec}秒`
                    : `${Math.floor(durationSec / 60)}分${durationSec % 60}秒`}
                </span>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ====== Job card (accordion) ======
const JobCard = ({
  job,
  index,
  creativeType,
}: {
  job: BulkCompositionJob;
  index: number;
  creativeType: 'video' | 'banner';
}) => {
  const [expanded, setExpanded] = useState(false);
  const isCompleted = job.status === 'completed';
  const isFailed = job.status === 'failed';
  const output = (job.output_data ?? {}) as Record<string, unknown>;

  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <button
        type="button"
        onClick={() => isCompleted && setExpanded((v) => !v)}
        disabled={!isCompleted}
        className={cn(
          'w-full text-left p-4 flex items-start gap-3',
          isCompleted ? 'cursor-pointer hover:bg-muted/30' : 'cursor-default'
        )}
      >
        <div className="pt-0.5">
          {isCompleted && <CheckCircle2 className="h-5 w-5 text-success" />}
          {isFailed && <XCircle className="h-5 w-5 text-destructive" />}
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold">#{index}</span>
            <Badge variant="secondary" className="text-[10px] h-5">
              {isCompleted ? '完了' : '失敗'}
            </Badge>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {job.input_data.appeal_axis}
          </div>
          <div className="text-sm line-clamp-1">
            「{job.input_data.copy_text}」
          </div>
          {isFailed && job.error_message && (
            <div className="text-xs text-destructive mt-1">
              エラー: {job.error_message}
            </div>
          )}
        </div>
        {isCompleted && (
          <div className="pt-0.5 text-muted-foreground shrink-0">
            {expanded ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        )}
      </button>

      {expanded && isCompleted && (
        <div className="border-t p-4 bg-muted/20">
          {creativeType === 'video' ? (
            <VideoSceneList
              scenes={(output.scenes as BulkSceneOutput[]) ?? []}
            />
          ) : (
            <BannerPreview
              banner={
                (output.banner as Record<string, unknown> | undefined) ?? {}
              }
            />
          )}
        </div>
      )}
    </div>
  );
};

const VideoSceneList = ({ scenes }: { scenes: BulkSceneOutput[] }) => {
  if (!Array.isArray(scenes) || scenes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">シーンデータがありません</p>
    );
  }
  return (
    <div className="space-y-2">
      <h4 className="text-sm font-semibold">字コンテ ({scenes.length}シーン)</h4>
      <div className="space-y-2">
        {scenes.map((scene, idx) => (
          <div
            key={idx}
            className="grid grid-cols-[auto_auto_1fr] gap-3 p-3 rounded-md bg-background border text-sm"
          >
            <span className="font-bold text-secondary">#{idx + 1}</span>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {scene.time_range}
            </span>
            <div className="space-y-1 min-w-0">
              <div>
                <span className="text-muted-foreground text-xs">📺 テロップ:</span>{' '}
                {scene.telop || '-'}
              </div>
              <div>
                <span className="text-muted-foreground text-xs">🎬 ビジュアル:</span>{' '}
                {scene.visual || '-'}
              </div>
              {scene.narration && (
                <div>
                  <span className="text-muted-foreground text-xs">🎙 ナレーション:</span>{' '}
                  {scene.narration}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BannerPreview = ({ banner }: { banner: Record<string, unknown> }) => {
  const mainCopyLines = (banner.main_copy_lines as string[]) ?? [];
  const subCopy = (banner.sub_copy as string) ?? '';
  const ctaButtons = (banner.cta_buttons as string[]) ?? [];
  const supportText = (banner.support_text as string) ?? '';

  return (
    <div className="space-y-3 text-sm">
      <div className="space-y-1">
        <h4 className="font-semibold text-xs text-muted-foreground">
          メインコピー
        </h4>
        <div className="p-3 rounded-md bg-background border space-y-0.5">
          {mainCopyLines.length > 0 ? (
            mainCopyLines.map((line, idx) => (
              <p key={idx} className="font-bold">
                {line}
              </p>
            ))
          ) : (
            <p className="text-muted-foreground">-</p>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-xs text-muted-foreground">
          サブコピー
        </h4>
        <div className="p-3 rounded-md bg-background border whitespace-pre-line">
          {subCopy || '-'}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-xs text-muted-foreground">
          CTAボタン
        </h4>
        <div className="flex gap-2 flex-wrap">
          {ctaButtons.length > 0 ? (
            ctaButtons.map((btn, idx) => (
              <Badge
                key={idx}
                variant="outline"
                className="px-3 py-1 text-sm"
              >
                {btn}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </div>
      </div>
      <div className="space-y-1">
        <h4 className="font-semibold text-xs text-muted-foreground">
          サポートテキスト
        </h4>
        <div className="p-3 rounded-md bg-background border">
          ▸ {supportText || '-'}
        </div>
      </div>
    </div>
  );
};

export default BulkCompositionResult;
