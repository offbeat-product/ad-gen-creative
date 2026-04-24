import { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  Pencil,
  X,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { SpotWizardState } from '@/hooks/useSpotWizard';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface BannerAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    width?: number;
    height?: number;
    size_label?: string;
    variation_index?: number;
    png_url?: string;
    psd_url?: string;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: BannerAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const BannerImageResult = ({ job, assets, jobId, onStartNew }: Props) => {
  const [zoomedAsset, setZoomedAsset] = useState<BannerAsset | null>(null);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  const assetsBySize = assets.reduce<Record<string, BannerAsset[]>>((acc, a) => {
    const w = a.metadata?.width;
    const h = a.metadata?.height;
    const key = w && h ? `${w}x${h}` : a.metadata?.size_label ?? 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  if (!jobId || !job) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        生成ジョブがありません
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold font-display tracking-tight">生成結果</h2>
        <Button variant="outline" size="sm" onClick={onStartNew}>
          新しく生成する
        </Button>
      </div>

      <div className="rounded-xl border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-semibold text-sm">ステータス</h3>
            {assets.length > 0 && (
              <div className="text-xs text-muted-foreground">
                合計 {assets.length} 枚生成完了
              </div>
            )}
          </div>
          <div className="flex items-center gap-2">
            {assets.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => toast.info('一括ダウンロードは準備中です')}
              >
                <Download className="h-3.5 w-3.5 mr-1.5" />
                全PNG一括DL
              </Button>
            )}
            <span className="text-xs">
              {job.status === 'pending' && (
                <span className="text-muted-foreground inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 待機中...
                </span>
              )}
              {job.status === 'running' && (
                <span className="text-warning inline-flex items-center gap-1">
                  <Loader2 className="h-3 w-3 animate-spin" /> 処理中...
                </span>
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
          </div>
        </div>

        {isRunning && <Progress value={job.status === 'running' ? 60 : 20} />}

        {job.status === 'failed' && job.error_message && (
          <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
            {job.error_message}
          </div>
        )}

        {Object.keys(assetsBySize).length > 0 && (
          <div className="space-y-6">
            {Object.entries(assetsBySize).map(([key, sizeAssets]) => {
              const first = sizeAssets[0];
              const w = first.metadata?.width;
              const h = first.metadata?.height;
              const label = first.metadata?.size_label ?? `${w}×${h}`;
              return (
                <div key={key} className="space-y-3">
                  <div className="flex items-center gap-2 pb-1 border-b">
                    <span className="text-sm font-bold tabular-nums">{label}</span>
                    <span className="text-xs text-muted-foreground">
                      ({sizeAssets.length}枚)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {sizeAssets.map((asset, idx) => {
                      const meta = asset.metadata ?? {};
                      const pngUrl = meta.png_url ?? asset.file_url;
                      const psdUrl = meta.psd_url;
                      return (
                        <div
                          key={asset.id}
                          className="rounded-lg border bg-background overflow-hidden flex flex-col"
                        >
                          <button
                            type="button"
                            onClick={() => setZoomedAsset(asset)}
                            className="block w-full bg-muted relative group"
                            style={{ aspectRatio: w && h ? `${w} / ${h}` : '1 / 1' }}
                          >
                            <img
                              src={pngUrl}
                              alt={`バナー${idx + 1}`}
                              className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                              loading="lazy"
                            />
                            <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded">
                              バリ{idx + 1}
                            </div>
                          </button>
                          <div className="p-2 flex items-center gap-1 border-t">
                            <a
                              href={pngUrl}
                              download={asset.file_name ?? `banner-${label}-${idx + 1}.png`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                            >
                              <Download className="h-3 w-3 mr-0.5" /> PNG
                            </a>
                            {psdUrl ? (
                              <a
                                href={psdUrl}
                                download={`banner-${label}-${idx + 1}.psd`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                              >
                                <Download className="h-3 w-3 mr-0.5" /> PSD
                              </a>
                            ) : (
                              <button
                                disabled
                                className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-muted text-muted-foreground cursor-not-allowed"
                              >
                                <Download className="h-3 w-3 mr-0.5" /> PSD
                              </button>
                            )}
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() =>
                                console.log('[regenerate] banner asset:', asset.id)
                              }
                            >
                              <RefreshCw className="h-3 w-3" />
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => console.log('[edit] banner asset:', asset.id)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

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
                src={zoomedAsset.metadata?.png_url ?? zoomedAsset.file_url}
                alt="バナー拡大"
                className="w-full max-h-[75vh] object-contain bg-muted"
              />
              <div className="p-4 space-y-1.5 text-sm border-t">
                <div className="font-semibold">
                  {zoomedAsset.metadata?.size_label ??
                    `${zoomedAsset.metadata?.width}×${zoomedAsset.metadata?.height}`}
                </div>
                {zoomedAsset.metadata?.variation_index != null && (
                  <div className="text-xs text-muted-foreground">
                    バリエーション {zoomedAsset.metadata.variation_index + 1}
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

export default BannerImageResult;
