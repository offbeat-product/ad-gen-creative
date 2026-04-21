import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowRight,
  Image as ImageIcon,
  Download,
  RefreshCw,
  X,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface SceneAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    section?: string;
    duration_seconds?: number;
    telop?: string;
    time_range?: string;
    visual?: string;
    scene_index?: number;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: SceneAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const ImageGenerationResult = ({
  job,
  assets,
  jobId,
  context: _context,
  state,
  onStartNew,
}: Props) => {
  const navigate = useNavigate();
  const [zoomedAsset, setZoomedAsset] = useState<SceneAsset | null>(null);
  const isRunning = job?.status === 'pending' || job?.status === 'running';

  if (!jobId || !job) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        生成結果がありません
      </div>
    );
  }

  const totalDuration = assets.reduce(
    (sum, a) => sum + (a.metadata?.duration_seconds ?? 0),
    0
  );

  const statusBadge = () => {
    if (job.status === 'completed') {
      return (
        <Badge className="bg-success text-success-foreground hover:bg-success">
          <CheckCircle2 className="h-3 w-3 mr-1" /> 完了
        </Badge>
      );
    }
    if (job.status === 'failed') {
      return (
        <Badge variant="destructive">
          <AlertCircle className="h-3 w-3 mr-1" /> 失敗
        </Badge>
      );
    }
    if (job.status === 'running') {
      return (
        <Badge className="bg-warning text-warning-foreground hover:bg-warning">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> 処理中
        </Badge>
      );
    }
    return <Badge variant="secondary">待機中</Badge>;
  };

  const handleGoToCarousel = () => {
    sessionStorage.setItem(
      'carousel_video_seed',
      JSON.stringify({
        from_tool: 'image_generation',
        from_job_id: jobId,
        images: assets.map((a, i) => ({
          url: a.file_url,
          section: a.metadata?.section,
          duration_seconds: a.metadata?.duration_seconds,
          telop: a.metadata?.telop,
          scene_index: i,
        })),
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('生成した画像をカルーセル動画に引き継ぎます');
    navigate('/tools/carousel-video');
  };

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3 flex-wrap">
          {statusBadge()}
          {job.created_at && (
            <span className="text-xs text-muted-foreground">
              {formatDateTime(job.created_at)} に生成
            </span>
          )}
          {assets.length > 0 && (
            <span className="text-xs text-muted-foreground">
              合計 {assets.length} シーン / {totalDuration.toFixed(1)} 秒
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" onClick={onStartNew}>
            <RotateCcw className="h-3 w-3 mr-1" /> 新しく生成する
          </Button>
          {assets.length > 0 && (
            <Button variant="brand" size="sm" onClick={handleGoToCarousel}>
              <ArrowRight className="h-3 w-3 mr-1" /> カルーセル動画生成へ
            </Button>
          )}
        </div>
      </div>

      {/* 生成中 */}
      {isRunning && (
        <div className="rounded-xl border bg-card p-8">
          <div className="flex flex-col items-center justify-center py-8 gap-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-secondary" />
              <ImageIcon className="absolute inset-0 m-auto h-5 w-5 text-secondary animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <div className="text-base font-semibold">
                {job.status === 'pending'
                  ? '生成準備中...'
                  : 'シーン画像を1枚ずつ生成しています...'}
              </div>
              <div className="text-sm text-muted-foreground">
                時間がかかる場合があります。しばらくお待ちください。
              </div>
            </div>
            <Progress
              value={job.status === 'running' ? 60 : 20}
              className="w-full max-w-md"
            />
          </div>
        </div>
      )}

      {/* 失敗 */}
      {job.status === 'failed' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>生成に失敗しました</AlertTitle>
          <AlertDescription>
            {job.error_message || 'エラーの詳細が取得できませんでした'}
          </AlertDescription>
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={onStartNew}>
              設定に戻ってやり直す
            </Button>
          </div>
        </Alert>
      )}

      {/* 結果グリッド */}
      {job.status === 'completed' && assets.length > 0 && (
        <div className="rounded-xl border bg-card p-5">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {assets.map((asset, idx) => {
              const meta = asset.metadata ?? {};
              return (
                <div
                  key={asset.id}
                  className="rounded-lg border bg-background overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => setZoomedAsset(asset)}
                    className="block w-full aspect-video bg-muted relative group"
                  >
                    <img
                      src={asset.file_url}
                      alt={meta.telop ?? `シーン${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-[1.02]"
                      loading="lazy"
                    />
                    <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded">
                      #{idx + 1}
                    </div>
                  </button>
                  <div className="p-2.5 space-y-1.5 text-xs flex-1 flex flex-col">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold truncate">
                        {meta.section ?? `シーン${idx + 1}`}
                      </span>
                      {meta.duration_seconds != null && (
                        <span className="text-muted-foreground tabular-nums shrink-0">
                          {meta.duration_seconds}秒
                        </span>
                      )}
                    </div>
                    {meta.time_range && (
                      <div className="text-muted-foreground text-[10px]">
                        {meta.time_range}
                      </div>
                    )}
                    {meta.telop && (
                      <div className="text-foreground line-clamp-2 flex-1">
                        「{meta.telop}」
                      </div>
                    )}
                    <div className="flex gap-1 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs flex-1"
                        onClick={() => console.log('[regenerate] asset:', asset.id)}
                      >
                        <RefreshCw className="h-3 w-3" />
                      </Button>
                      <a
                        href={asset.file_url}
                        download={asset.file_name ?? `scene-${idx + 1}.png`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center justify-center h-7 px-2 text-xs flex-1 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
                      >
                        <Download className="h-3 w-3" />
                      </a>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 画像拡大モーダル */}
      <Dialog open={!!zoomedAsset} onOpenChange={(o) => !o && setZoomedAsset(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setZoomedAsset(null)}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground/90"
          >
            <X className="h-4 w-4" />
          </button>
          {zoomedAsset && (
            <div className="space-y-0">
              <img
                src={zoomedAsset.file_url}
                alt={zoomedAsset.metadata?.telop ?? ''}
                className="w-full max-h-[75vh] object-contain bg-muted"
              />
              <div className="p-4 space-y-1.5 text-sm border-t">
                {zoomedAsset.metadata?.section && (
                  <div className="font-semibold">{zoomedAsset.metadata.section}</div>
                )}
                {zoomedAsset.metadata?.time_range && (
                  <div className="text-xs text-muted-foreground">
                    {zoomedAsset.metadata.time_range}
                    {zoomedAsset.metadata.duration_seconds != null &&
                      ` / ${zoomedAsset.metadata.duration_seconds}秒`}
                  </div>
                )}
                {zoomedAsset.metadata?.telop && (
                  <div className="text-sm">テロップ: 「{zoomedAsset.metadata.telop}」</div>
                )}
                {zoomedAsset.metadata?.visual && (
                  <div className="text-xs text-muted-foreground">
                    映像: {zoomedAsset.metadata.visual}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ImageGenerationResult;
