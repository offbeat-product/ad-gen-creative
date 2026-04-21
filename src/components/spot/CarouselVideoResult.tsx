import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Crop,
} from 'lucide-react';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { Frame } from '@/components/spot/CarouselVideoSettings';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_file_url: string | null;
  output_data: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface CarouselAsset {
  id: string;
  asset_type: string;
  file_url: string;
  file_name: string | null;
  metadata: Record<string, any> | null;
}

interface Props {
  job: SpotJob | null;
  assets: CarouselAsset[];
  jobId: string | null;
  aspectRatio: '9:16' | '16:9' | '1:1';
  resolution: 'sd' | 'hd' | '1080';
  frames: Frame[];
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const CarouselVideoResult = ({
  job,
  assets,
  jobId,
  aspectRatio,
  resolution,
  frames,
  state,
  onStartNew,
}: Props) => {
  const navigate = useNavigate();

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  const finalVideoUrl =
    job?.output_file_url || (assets.length > 0 ? assets[0].file_url : null);
  const finalVideoMeta =
    (assets[0]?.metadata as any) || (job?.output_data as any) || null;

  const handleGoToResize = () => {
    if (!finalVideoUrl) return;
    sessionStorage.setItem(
      'video_resize_seed',
      JSON.stringify({
        from_tool: 'carousel_video',
        from_job_id: jobId,
        source_video_url: finalVideoUrl,
        source_video_name: `カルーセル動画 (${aspectRatio})`,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('カルーセル動画を動画リサイズに引き継ぎます');
    navigate('/tools/video-resize');
  };

  if (!job) {
    return (
      <div className="rounded-xl border bg-card p-6 text-center text-sm text-muted-foreground">
        生成結果はまだありません
      </div>
    );
  }

  return (
    <div className="rounded-xl border bg-card p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-sm">生成結果</h3>
        <div className="flex items-center gap-2">
          <span className="text-xs">
            {job.status === 'pending' && (
              <span className="text-muted-foreground">待機中...</span>
            )}
            {job.status === 'running' && (
              <span className="text-warning">レンダリング中</span>
            )}
            {job.status === 'completed' && (
              <span className="flex items-center gap-1 text-success">
                <CheckCircle2 className="h-3 w-3" /> 完了
              </span>
            )}
            {job.status === 'failed' && (
              <span className="flex items-center gap-1 text-destructive">
                <AlertCircle className="h-3 w-3" /> 失敗
              </span>
            )}
          </span>
          <Button variant="outline" size="sm" onClick={onStartNew}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" /> 新しく生成
          </Button>
        </div>
      </div>

      {isRunning && (
        <div className="space-y-2">
          <Progress value={undefined} className="animate-pulse" />
          <div className="text-xs text-muted-foreground text-center">
            🎬 動画をレンダリング中... 1〜5分ほどお待ちください
          </div>
        </div>
      )}

      {job.status === 'failed' && job.error_message && (
        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
          {job.error_message}
        </div>
      )}

      {finalVideoUrl && (
        <div className="space-y-3">
          <video
            src={finalVideoUrl}
            controls
            className="w-full rounded-lg bg-muted"
            style={{
              aspectRatio:
                aspectRatio === '9:16'
                  ? '9 / 16'
                  : aspectRatio === '16:9'
                  ? '16 / 9'
                  : '1 / 1',
              maxHeight: '600px',
            }}
          />
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>アスペクト比: {aspectRatio}</span>
            <span>解像度: {resolution.toUpperCase()}</span>
            <span>コマ数: {frames.length}</span>
            {finalVideoMeta?.duration_seconds && (
              <span>長さ: {finalVideoMeta.duration_seconds}秒</span>
            )}
            {finalVideoMeta?.file_size_bytes && (
              <span>
                サイズ: {(finalVideoMeta.file_size_bytes / 1024 / 1024).toFixed(1)}MB
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={finalVideoUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
            >
              <Download className="h-3.5 w-3.5 mr-1.5" /> 動画をダウンロード
            </a>
            <Button variant="outline" size="sm" onClick={handleGoToResize}>
              <Crop className="h-3.5 w-3.5 mr-1.5" /> 動画リサイズへ
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CarouselVideoResult;
