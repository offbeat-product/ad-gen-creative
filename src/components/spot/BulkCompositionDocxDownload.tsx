import { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  generateBulkBannerPptx,
  downloadBulkBannerPptx,
} from '@/lib/pptx/generate-bulk-banner-pptx';
import { generateBulkVideoPptx } from '@/lib/pptx/generate-bulk-video-pptx';

const downloadBlob = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
};
import type {
  BulkCompositionBatch,
  BulkCompositionJob,
} from '@/types/bulk-composition';

interface Props {
  batch: BulkCompositionBatch;
  jobs: BulkCompositionJob[];
  projectMeta: {
    client_name: string;
    product_name: string;
    project_name: string;
  };
}

const sanitize = (s: string) =>
  s.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, '_').slice(0, 80);

const BulkCompositionDocxDownload = ({ batch, jobs, projectMeta }: Props) => {
  const [generating, setGenerating] = useState(false);

  // composition jobs only (NA・絵コンテは含めない)
  const compositionJobs = jobs.filter((j) => j.tool_type === 'composition');
  const naScriptJobs = jobs.filter((j) => j.tool_type === 'narration_script');
  const storyboardJobs = jobs.filter(
    (j) =>
      j.tool_type === 'image_generation' &&
      (j.input_data as Record<string, unknown>)?.storyboard_kind === 'spot'
  );

  const creativeType =
    (compositionJobs[0]?.input_data as Record<string, unknown>)
      ?.creative_type === 'banner'
      ? 'banner'
      : 'video';
  const isBanner = creativeType === 'banner';

  const handleDownload = async () => {
    setGenerating(true);
    try {
      const dateStr = new Date().toISOString().slice(0, 10);
      const baseName = sanitize(projectMeta.project_name || 'project');

      if (isBanner) {
        const blob = await generateBulkBannerPptx({
          batch,
          jobs: compositionJobs,
          meta: projectMeta,
        });
        downloadBulkBannerPptx(
          blob,
          `バナー構成案一括_${baseName}_${dateStr}.pptx`
        );
        toast.success('PowerPointファイルをダウンロードしました');
      } else {
        // 訴求軸数とコピー数を集計
        const axesSet = new Set<string>();
        for (const j of compositionJobs) {
          const ax = (j.input_data as Record<string, unknown>)?.appeal_axis as string;
          if (ax) axesSet.add(ax);
        }
        const appealAxesCount = Math.max(1, axesSet.size);
        const copiesPerAxis = Math.max(
          1,
          Math.round(compositionJobs.length / appealAxesCount)
        );

        const blob = await generateBulkVideoPptx({
          batch,
          compositionJobs,
          naScriptJobs,
          storyboardJobs,
          meta: {
            ...projectMeta,
            appeal_axes_count: appealAxesCount,
            copies_per_axis: copiesPerAxis,
          },
        });
        downloadBlob(blob, `動画構成案一括_${baseName}_${dateStr}.pptx`);
        toast.success('PowerPointファイルをダウンロードしました');
      }
    } catch (err) {
      console.error('[BulkCompositionDownload]', err);
      toast.error('生成に失敗しました: ' + (err as Error).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="rounded-xl border-2 border-success/40 bg-success/5 p-5">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 font-semibold text-success">
            <CheckCircle2 className="h-5 w-5" />
            {isBanner ? 'バナー' : '動画'}構成案の一括生成が完了しました
          </div>
          <div className="text-sm text-muted-foreground">
            {compositionJobs.length}パターンを1つのpptx
            ファイルにまとめてダウンロードできます
          </div>
        </div>
        <Button
          variant="brand"
          size="lg"
          onClick={handleDownload}
          disabled={generating || compositionJobs.length === 0}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              pptx一括ダウンロード
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BulkCompositionDocxDownload;
