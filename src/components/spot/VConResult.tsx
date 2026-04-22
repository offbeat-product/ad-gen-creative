import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Download,
  ChevronDown,
  ChevronRight,
  Image as ImageIcon,
  Film,
  RefreshCw,
} from 'lucide-react';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export interface VconCut {
  cut_number: number;
  time_start: number;
  time_end: number;
  duration: number;
  section?: string;
  telop?: string;
  narration?: string;
  visual_direction?: string;
  text_position?: string;
  text_size?: string;
  transition?: string;
  annotations?: string[];
}

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  output_data: Record<string, unknown> | null;
  created_at?: string | null;
}

export interface VconAsset {
  id: string;
  asset_type: string;
  file_url: string;
  metadata: Record<string, any> | null;
}

interface Props {
  job: SpotJob | null;
  assets: VconAsset[];
  jobId: string | null;
  durationSeconds: 15 | 30 | 60;
  creativeType: 'video' | 'banner';
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  onStartNew: () => void;
}

const fmt = (n: unknown) => (typeof n === 'number' && Number.isFinite(n) ? n.toFixed(1) : '0.0');

const formatTimeRange = (start: number | undefined, end: number | undefined) =>
  `${fmt(start)}-${fmt(end)}s`;

const VConResult = ({
  job,
  assets,
  jobId,
  durationSeconds,
  creativeType,
  context,
  onStartNew,
}: Props) => {
  const [expandedCuts, setExpandedCuts] = useState<Set<number>>(new Set());

  const cuts: VconCut[] =
    (assets[0]?.metadata as any)?.cuts ?? (job?.output_data as any)?.cuts ?? [];
  const totalCuts = cuts.length;

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  const toggleCut = (n: number) => {
    setExpandedCuts((prev) => {
      const next = new Set(prev);
      if (next.has(n)) next.delete(n);
      else next.add(n);
      return next;
    });
  };

  const handleExportJson = () => {
    const data = {
      cuts,
      duration_seconds: durationSeconds,
      creative_type: creativeType,
      meta: {
        client_name: context?.project.product.client.name,
        product_name: context?.project.product.name,
        project_name: context?.project.name,
      },
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vcon_${jobId?.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
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
            {job.status === 'running' && <span className="text-warning">生成中</span>}
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
            🎬 Vコンを設計中... 30秒〜1分ほどお待ちください
          </div>
        </div>
      )}

      {job.status === 'failed' && job.error_message && (
        <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
          {job.error_message}
        </div>
      )}

      {totalCuts > 0 && (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>
              動画尺: <strong className="text-foreground">{durationSeconds}秒</strong> / 合計{' '}
              <strong className="text-foreground">{totalCuts}カット</strong>
            </span>
            <div className="flex gap-1.5">
              <Button variant="outline" size="sm" onClick={handleExportJson}>
                <Download className="h-3.5 w-3.5 mr-1" /> JSONエクスポート
              </Button>
              <Link to="/tools/image-generation">
                <Button variant="outline" size="sm">
                  <ImageIcon className="h-3.5 w-3.5 mr-1" /> 絵コンテ画像へ
                </Button>
              </Link>
              <Link to="/tools/carousel-video">
                <Button variant="outline" size="sm">
                  <Film className="h-3.5 w-3.5 mr-1" /> カルーセル動画へ
                </Button>
              </Link>
            </div>
          </div>

          <div className="rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12 text-center">#</TableHead>
                  <TableHead className="w-24">時間</TableHead>
                  <TableHead className="w-16 text-center">秒</TableHead>
                  <TableHead className="w-28">セクション</TableHead>
                  <TableHead>テロップ</TableHead>
                  <TableHead>ナレーション</TableHead>
                  <TableHead className="w-8"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cuts.map((cut) => {
                  const expanded = expandedCuts.has(cut.cut_number);
                  return (
                    <>
                      <TableRow
                        key={`row-${cut.cut_number}`}
                        className="cursor-pointer"
                        onClick={() => toggleCut(cut.cut_number)}
                      >
                        <TableCell className="text-center font-bold tabular-nums text-secondary">
                          {cut.cut_number}
                        </TableCell>
                        <TableCell className="text-xs tabular-nums">
                          {formatTimeRange(cut.time_start, cut.time_end)}
                        </TableCell>
                        <TableCell className="text-center text-xs tabular-nums">
                          {fmt(cut.duration)}s
                        </TableCell>
                        <TableCell className="text-xs">{cut.section ?? '-'}</TableCell>
                        <TableCell className="text-xs font-medium whitespace-pre-wrap">
                          {cut.telop || (
                            <span className="text-muted-foreground/60">(なし)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {cut.narration ? (
                            cut.narration.length > 30 ? (
                              cut.narration.slice(0, 30) + '...'
                            ) : (
                              cut.narration
                            )
                          ) : (
                            <span className="text-muted-foreground/60">(なし)</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          {expanded ? (
                            <ChevronDown className="h-3.5 w-3.5 inline" />
                          ) : (
                            <ChevronRight className="h-3.5 w-3.5 inline" />
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded && (
                        <TableRow key={`detail-${cut.cut_number}`} className="bg-muted/30">
                          <TableCell colSpan={7} className="p-3">
                            <div className="grid md:grid-cols-2 gap-3 text-xs">
                              {cut.visual_direction && (
                                <div>
                                  <div className="font-semibold text-muted-foreground mb-0.5">
                                    映像指示
                                  </div>
                                  <div>{cut.visual_direction}</div>
                                </div>
                              )}
                              {cut.narration && (
                                <div>
                                  <div className="font-semibold text-muted-foreground mb-0.5">
                                    ナレーション (全文)
                                  </div>
                                  <div>{cut.narration}</div>
                                </div>
                              )}
                              <div className="flex flex-wrap gap-1.5">
                                {cut.text_position && (
                                  <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                    位置: {cut.text_position}
                                  </span>
                                )}
                                {cut.text_size && (
                                  <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                    サイズ: {cut.text_size}
                                  </span>
                                )}
                                {cut.transition && (
                                  <span className="px-1.5 py-0.5 rounded bg-background border text-[10px]">
                                    遷移: {cut.transition}
                                  </span>
                                )}
                              </div>
                              {cut.annotations && cut.annotations.length > 0 && (
                                <div className="md:col-span-2">
                                  <div className="font-semibold text-warning mb-0.5">
                                    ⚠️ 注釈 (薬機法等)
                                  </div>
                                  <ul className="list-disc list-inside space-y-0.5">
                                    {cut.annotations.map((a, i) => (
                                      <li key={i}>{a}</li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
};

export default VConResult;
