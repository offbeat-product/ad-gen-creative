import { useState } from 'react';
import { Download, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  generateBulkCompositionDocx,
  downloadBulkDocx,
} from '@/lib/generate-bulk-composition-docx';
import {
  generateBulkBannerPptx,
  downloadBulkBannerPptx,
} from '@/lib/pptx/generate-bulk-banner-pptx';
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

  const creativeType =
    (jobs[0]?.input_data as any)?.creative_type === 'banner'
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
          jobs,
          meta: projectMeta,
        });
        downloadBulkBannerPptx(
          blob,
          `バナー構成案一括_${baseName}_${dateStr}.pptx`
        );
        toast.success('PowerPointファイルをダウンロードしました');
      } else {
        const blob = await generateBulkCompositionDocx({
          batch,
          jobs,
          meta: projectMeta,
        });
        downloadBulkDocx(blob, `構成案一括_${baseName}_${dateStr}.docx`);
        toast.success('Wordドキュメントをダウンロードしました');
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
            {jobs.length}パターンを1つの{isBanner ? 'pptx' : 'docx'}
            ファイルにまとめてダウンロードできます
          </div>
        </div>
        <Button
          variant="brand"
          size="lg"
          onClick={handleDownload}
          disabled={generating || jobs.length === 0}
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
            </>
          ) : (
            <>
              <Download className="h-4 w-4 mr-2" />
              {isBanner ? 'pptx' : 'docx'}一括ダウンロード
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default BulkCompositionDocxDownload;
