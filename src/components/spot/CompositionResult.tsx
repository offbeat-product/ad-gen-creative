import { useNavigate } from 'react-router-dom';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Image as ImageIcon,
  FileText,
  FileDown,
  RotateCcw,
  Loader2,
  Film,
  Clock,
  Sparkles,
} from 'lucide-react';
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface Scene {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

export interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    scenes?: Scene[];
    appeal_axis?: string;
    copy_text?: string;
    duration_seconds?: number;
    creative_type?: string;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: SpotAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  appealAxis: string;
  copyText: string;
  duration: number;
  creativeType: string;
  onStartNew: () => void;
}

const formatScenesAsText = (scenes: Scene[]): string => {
  return scenes
    .map((s) => {
      const head = `${s.part}${s.time_range ? ` (${s.time_range})` : ''}`;
      const lines = [head];
      if (s.telop) lines.push(`テロップ: ${s.telop}`);
      if (s.visual) lines.push(`映像: ${s.visual}`);
      if (s.narration) lines.push(`ナレーション: ${s.narration}`);
      return lines.join('\n');
    })
    .join('\n\n');
};

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const CompositionResult = ({
  job,
  assets,
  jobId,
  context,
  state,
  appealAxis,
  copyText,
  duration,
  creativeType,
  onStartNew,
}: Props) => {
  const navigate = useNavigate();
  const isRunning = job?.status === 'pending' || job?.status === 'running';

  if (!jobId || !job) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        生成結果がありません
      </div>
    );
  }

  const handleCopyAll = async (scenes: Scene[]) => {
    try {
      await navigator.clipboard.writeText(formatScenesAsText(scenes));
      toast.success('構成案をコピーしました');
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleDownloadTxt = (scenes: Scene[]) => {
    const text = formatScenesAsText(scenes);
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const projectName = context?.project.name ?? 'project';
    saveAs(blob, `構成案_${projectName}_${new Date().toISOString().split('T')[0]}.txt`);
    toast.success('TXTをダウンロードしました');
  };

  const handleDownloadDocx = async (scenes: Scene[], assetDuration: number) => {
    const projectName = context?.project.name ?? 'project';
    const clientName = context?.project.product.client.name ?? '';
    const productName = context?.project.product.name ?? '';

    const children: Paragraph[] = [
      new Paragraph({ text: '構成案・字コンテ', heading: HeadingLevel.HEADING_1 }),
      new Paragraph({ children: [new TextRun({ text: `クライアント: ${clientName}` })] }),
      new Paragraph({ children: [new TextRun({ text: `商材: ${productName}` })] }),
      new Paragraph({ children: [new TextRun({ text: `案件: ${projectName}` })] }),
      new Paragraph({ children: [new TextRun({ text: `訴求軸: ${appealAxis}` })] }),
      new Paragraph({ children: [new TextRun({ text: `コピー: ${copyText}` })] }),
      new Paragraph({
        children: [new TextRun({ text: `尺: ${assetDuration}秒 / タイプ: ${creativeType}` })],
      }),
      new Paragraph({ text: '' }),
    ];

    scenes.forEach((s) => {
      children.push(
        new Paragraph({
          text: `${s.part}${s.time_range ? ` (${s.time_range})` : ''}`,
          heading: HeadingLevel.HEADING_2,
        })
      );
      if (s.telop) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'テロップ: ', bold: true }),
              new TextRun({ text: s.telop }),
            ],
          })
        );
      }
      if (s.visual) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: '映像: ', bold: true }),
              new TextRun({ text: s.visual }),
            ],
          })
        );
      }
      if (s.narration) {
        children.push(
          new Paragraph({
            children: [
              new TextRun({ text: 'ナレーション: ', bold: true }),
              new TextRun({ text: s.narration }),
            ],
          })
        );
      }
      children.push(new Paragraph({ text: '' }));
    });

    const doc = new Document({ sections: [{ children }] });
    const blob = await Packer.toBlob(doc);
    saveAs(blob, `構成案_${projectName}_${new Date().toISOString().split('T')[0]}.docx`);
    toast.success('Wordドキュメントをダウンロードしました');
  };

  const handleGoToImageGeneration = (scenes: Scene[]) => {
    sessionStorage.setItem(
      'image_generation_seed',
      JSON.stringify({
        from_tool: 'composition',
        from_job_id: jobId,
        scenes,
        duration_seconds: duration,
        creative_type: creativeType,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('構成案を絵コンテ画像生成に引き継ぎます');
    navigate('/tools/image-generation');
  };

  const handleGoToNarrationScript = (scenes: Scene[]) => {
    // NOTE: NarrationScriptTool 側での seed 受信は Phase C2 で対応予定
    sessionStorage.setItem(
      'narration_script_seed',
      JSON.stringify({
        from_tool: 'composition',
        from_job_id: jobId,
        appeal_axis: appealAxis,
        copy_text: copyText,
        scenes,
        duration_seconds: duration,
        creative_type: creativeType,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('構成案をNA原稿生成に引き継ぎます');
    navigate('/tools/narration-script');
  };

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

  const firstAsset = assets[0];
  const scenes = firstAsset?.metadata?.scenes ?? [];
  const assetDuration = firstAsset?.metadata?.duration_seconds ?? duration;

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div className="flex items-center gap-3">
          {statusBadge()}
          {job.created_at && (
            <span className="text-xs text-muted-foreground">
              {formatDateTime(job.created_at)} に生成
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" onClick={onStartNew}>
            <RotateCcw className="h-3 w-3 mr-1" /> 新しく生成する
          </Button>
          {scenes.length > 0 && (
            <>
              <Button variant="outline" size="sm" onClick={() => handleCopyAll(scenes)}>
                <Copy className="h-3 w-3 mr-1" /> 全体をコピー
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleDownloadTxt(scenes)}>
                <FileText className="h-3 w-3 mr-1" /> .txt
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleDownloadDocx(scenes, assetDuration)}
              >
                <FileDown className="h-3 w-3 mr-1" /> .docx
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleGoToImageGeneration(scenes)}
              >
                <ImageIcon className="h-3 w-3 mr-1" /> 絵コンテ画像生成へ
              </Button>
              <Button
                variant="brand"
                size="sm"
                onClick={() => handleGoToNarrationScript(scenes)}
              >
                <ArrowRight className="h-3 w-3 mr-1" /> NA原稿生成へ
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 生成中 */}
      {isRunning && (
        <div className="rounded-xl border bg-card p-8">
          <div className="flex flex-col items-center justify-center py-8 gap-6">
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-secondary" />
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-secondary animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <div className="text-base font-semibold">
                {job.status === 'pending'
                  ? '生成準備中...'
                  : '構成案を生成しています...'}
              </div>
              <div className="text-sm text-muted-foreground">
                シーン構成を組み立てています。しばらくお待ちください。
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

      {/* 結果 */}
      {job.status === 'completed' && scenes.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <Badge variant="secondary" className="gap-1">
              <Clock className="h-3 w-3" />
              {assetDuration}秒
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Film className="h-3 w-3" />
              {creativeType === 'video' ? '動画' : 'バナー'}
            </Badge>
            <span className="text-muted-foreground">シーン数: {scenes.length}</span>
          </div>

          {/* デスクトップ: テーブル */}
          <div className="hidden md:block rounded-lg border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-20">パート</TableHead>
                  <TableHead className="w-24">時間</TableHead>
                  <TableHead>テロップ</TableHead>
                  <TableHead>映像指示</TableHead>
                  <TableHead>ナレーション</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scenes.map((s, idx) => (
                  <TableRow key={idx} className="hover:bg-muted/50 transition-colors">
                    <TableCell className="font-semibold align-top">{s.part}</TableCell>
                    <TableCell className="text-xs text-muted-foreground align-top whitespace-nowrap">
                      {s.time_range ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm align-top whitespace-pre-wrap">
                      {s.telop ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm align-top whitespace-pre-wrap">
                      {s.visual ?? '-'}
                    </TableCell>
                    <TableCell className="text-sm align-top whitespace-pre-wrap">
                      {s.narration ?? '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* モバイル: カード */}
          <div className="md:hidden grid gap-2">
            {scenes.map((s, idx) => (
              <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-sm">{s.part}</span>
                  {s.time_range && (
                    <span className="text-xs text-muted-foreground">{s.time_range}</span>
                  )}
                </div>
                {s.telop && (
                  <div className="text-xs">
                    <span className="font-semibold text-muted-foreground">テロップ: </span>
                    <span className="whitespace-pre-wrap">{s.telop}</span>
                  </div>
                )}
                {s.visual && (
                  <div className="text-xs">
                    <span className="font-semibold text-muted-foreground">映像: </span>
                    <span className="whitespace-pre-wrap">{s.visual}</span>
                  </div>
                )}
                {s.narration && (
                  <div className="text-xs">
                    <span className="font-semibold text-muted-foreground">ナレーション: </span>
                    <span className="whitespace-pre-wrap">{s.narration}</span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CompositionResult;
