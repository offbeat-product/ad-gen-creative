import { Loader2, CheckCircle2, AlertCircle, Download, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { VideoFormat } from './VideoResizeSettings';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface ResizedAsset {
  id: string;
  asset_type: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    width?: number;
    height?: number;
    label?: string;
    aspect?: string;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: ResizedAsset[];
  jobId: string | null;
  selectedFormats: VideoFormat[];
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const formatKey = (f: VideoFormat) => `${f.width}x${f.height}`;

const VideoResizeResult = ({
  job,
  assets,
  jobId,
  selectedFormats,
  onStartNew,
}: Props) => {
  if (!jobId) {
    return (
      <div className="rounded-xl border bg-card p-12 text-center text-sm text-muted-foreground">
        まだ生成されていません
      </div>
    );
  }

  const isRunning = job?.status === 'pending' || job?.status === 'running';
  const completedAssets = assets.filter((a) => a.asset_type === 'resized_video');
  const pendingAssets = assets.filter((a) => a.asset_type === 'resized_video_pending');

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onStartNew}>
          <RotateCcw className="h-3.5 w-3.5 mr-1.5" /> 新しく生成
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm">リサイズ結果</h3>
            {completedAssets.length > 0 && (
              <div className="text-xs text-muted-foreground">
                {completedAssets.length} / {selectedFormats.length} サイズ完了
              </div>
            )}
          </div>
          <span className="text-xs">
            {job?.status === 'pending' && (
              <span className="text-muted-foreground">待機中...</span>
            )}
            {job?.status === 'running' && (
              <span className="text-warning">処理中... (各サイズ1〜3分)</span>
            )}
            {job?.status === 'completed' && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> 完了
              </span>
            )}
            {job?.status === 'failed' && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> 失敗
              </span>
            )}
          </span>
        </div>

        {isRunning && (
          <div className="space-y-2">
            <Progress
              value={
                selectedFormats.length > 0
                  ? Math.round((completedAssets.length / selectedFormats.length) * 100)
                  : job?.status === 'running'
                  ? 30
                  : 10
              }
            />
            <div className="text-[11px] text-muted-foreground">
              全体で2〜5分ほどかかります
            </div>
          </div>
        )}

        {job?.status === 'failed' && job.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
            {job.error_message}
          </div>
        )}

        {/* 完了アセット */}
        {completedAssets.length > 0 && (
          <div className="space-y-6">
            {completedAssets.map((asset) => {
              const meta = asset.metadata ?? {};
              const w = meta.width;
              const h = meta.height;
              const label = meta.label ?? meta.aspect ?? (w && h ? `${w}×${h}` : '不明');
              const sizeText = w && h ? `${w}×${h}` : '';
              return (
                <div key={asset.id} className="space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <span className="text-sm font-bold">{label}</span>
                    {sizeText && (
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {sizeText}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 items-start">
                    <video
                      src={asset.file_url}
                      controls
                      className="w-full rounded-lg bg-muted"
                      style={{
                        aspectRatio: w && h ? `${w} / ${h}` : '16 / 9',
                        maxHeight: '420px',
                      }}
                    />
                    <div className="space-y-2">
                      <a
                        href={asset.file_url}
                        download={asset.file_name ?? `resized-${label}.mp4`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
                      >
                        <Download className="h-3.5 w-3.5 mr-1.5" /> 動画をダウンロード
                      </a>
                      <div className="text-[11px] text-muted-foreground break-all">
                        {asset.file_url}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 生成中のフォーマット */}
        {pendingAssets.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-muted-foreground">
              生成中のフォーマット
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {pendingAssets.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md border bg-muted/30 p-3 flex items-center gap-2"
                >
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs">
                    {a.metadata?.label ?? `${a.metadata?.width}×${a.metadata?.height}`}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 何も無い時の placeholder */}
        {completedAssets.length === 0 && pendingAssets.length === 0 && isRunning && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {selectedFormats.map((f) => (
              <div
                key={formatKey(f)}
                className="rounded-md border bg-muted/30 p-3 flex items-center gap-2"
              >
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                <span className="text-xs">{f.label}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default VideoResizeResult;
