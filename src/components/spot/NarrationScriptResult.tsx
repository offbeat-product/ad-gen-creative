import { useNavigate } from 'react-router-dom';
import {
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  FileText,
  Presentation,
  RotateCcw,
  Loader2,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  generateSingleNaScriptPptx,
  downloadBlob,
  sanitizeFileName,
} from '@/lib/pptx/single-pptx-helpers';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface ScriptSection {
  part: string;
  time_range?: string;
  text: string;
}

export interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    full_script?: string;
    char_count?: number;
    duration_seconds?: number;
    sections?: ScriptSection[];
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: SpotAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  duration: number;
  onStartNew: () => void;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const NarrationScriptResult = ({
  job,
  assets,
  jobId,
  context,
  state,
  duration,
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

  const firstAsset = assets[0];
  const fullScript = firstAsset?.metadata?.full_script ?? '';
  const charCount = firstAsset?.metadata?.char_count ?? fullScript.length;
  const sections = firstAsset?.metadata?.sections ?? [];
  const assetDuration = firstAsset?.metadata?.duration_seconds ?? duration;

  const handleCopy = async (text: string, label = 'コピーしました') => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(label);
    } catch {
      toast.error('コピーに失敗しました');
    }
  };

  const handleDownloadTxt = () => {
    const blob = new Blob([fullScript], { type: 'text/plain;charset=utf-8' });
    const projectName = context?.project.name ?? 'project';
    saveAs(blob, `NA原稿_${projectName}_${new Date().toISOString().split('T')[0]}.txt`);
    toast.success('TXTをダウンロードしました');
  };

  const handleDownloadPptx = async () => {
    if (!jobId) return;
    const projectName = context?.project.name ?? 'project';
    const clientName = context?.project.product.client.name ?? '';
    const productName = context?.project.product.name ?? '';
    const generatedAt = new Date().toISOString().slice(0, 10);

    // job.input_data から parent_composition_job_id を取得 (seed 経由 or bulk 経由)
    const jobInput = ((job as unknown as { input_data?: Record<string, unknown> })
      ?.input_data ?? {}) as Record<string, unknown>;
    const parentCompositionJobId =
      (jobInput.parent_composition_job_id as string | undefined) ??
      (jobInput.from_job_id as string | undefined) ??
      null;

    try {
      const blob = await generateSingleNaScriptPptx(
        {
          jobId,
          duration: assetDuration,
          parentCompositionJobId,
          sections: sections.map((s) => ({
            part: s.part,
            time_range: s.time_range ?? '',
            text: s.text,
          })),
          fullScript,
        },
        {
          client_name: clientName,
          product_name: productName,
          project_name: projectName,
        }
      );
      downloadBlob(
        blob,
        `NA原稿_${sanitizeFileName(projectName)}_${generatedAt}.pptx`
      );
      toast.success('PowerPointファイルをダウンロードしました');
    } catch (e) {
      console.error('[NA Script Pptx]', e);
      toast.error('pptxダウンロードに失敗しました');
    }
  };

  const handleGoToNarrationAudio = () => {
    sessionStorage.setItem(
      'narration_audio_seed',
      JSON.stringify({
        from_tool: 'narration_script',
        from_job_id: jobId,
        script: fullScript,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('NA原稿を音声生成に引き継ぎます');
    navigate('/tools/narration-audio');
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
          {fullScript && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleCopy(fullScript, '全体をコピーしました')}
              >
                <Copy className="h-3 w-3 mr-1" /> 全体をコピー
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadTxt}>
                <FileText className="h-3 w-3 mr-1" /> .txt
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPptx}>
                <Presentation className="h-3 w-3 mr-1" /> .pptx
              </Button>
              <Button variant="brand" size="sm" onClick={handleGoToNarrationAudio}>
                <ArrowRight className="h-3 w-3 mr-1" /> 音声生成へ
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
                  : 'NA原稿を生成しています...'}
              </div>
              <div className="text-sm text-muted-foreground">
                尺に合わせてナレーション原稿を組み立てています。
              </div>
            </div>
            <Progress value={job.status === 'running' ? 60 : 20} className="w-full max-w-md" />
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
      {job.status === 'completed' && fullScript && (
        <div className="space-y-4">
          {/* 全体スクリプト */}
          <div className="rounded-xl border bg-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs">
                <Badge variant="secondary" className="gap-1">
                  <Clock className="h-3 w-3" />
                  {assetDuration}秒
                </Badge>
                <span className="text-muted-foreground">文字数: {charCount}</span>
              </div>
            </div>
            <pre className="text-sm whitespace-pre-wrap font-sans leading-relaxed bg-accent/20 rounded-lg p-4">
              {fullScript}
            </pre>
          </div>

          {/* セクション別 */}
          {sections.length > 0 && (
            <div className="rounded-xl border bg-card p-5 space-y-3">
              <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                パート別
              </div>
              <div className="grid gap-2">
                {sections.map((sec, idx) => (
                  <div key={idx} className="rounded-lg border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-semibold text-foreground">{sec.part}</span>
                        {sec.time_range && (
                          <span className="text-muted-foreground">{sec.time_range}</span>
                        )}
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopy(sec.text, `${sec.part}をコピーしました`)}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                    <p className="text-sm whitespace-pre-wrap leading-relaxed">{sec.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NarrationScriptResult;
