import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RotateCcw,
  Loader2,
  Sparkles,
  Play,
  Pause,
  Download,
  Mic,
  Copy,
  FileText,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import type { SpotWizardState } from '@/hooks/useSpotWizard';
import type { useProjectContext } from '@/hooks/useProjectContext';

export interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
  created_at?: string | null;
}

export interface SpotAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata?: {
    voice_id?: string;
    speed?: number;
    original_script?: string;
    converted_script?: string;
  } | null;
}

interface Props {
  job: SpotJob | null;
  assets: SpotAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  script: string;
  onStartNew: () => void;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

const buildDownloadFilename = (
  context: ReturnType<typeof useProjectContext>['context']
): string => {
  const client = context?.project.product.client.name ?? 'client';
  const product = context?.project.product.name ?? 'product';
  const project = context?.project.name ?? 'project';
  const date = new Date();
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;
  const raw = `${client}_${product}_${project}_${dateStr}.mp3`;
  const sanitized = raw
    .replace(/[\/\\:*?"<>|]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_');
  if (sanitized.length > 200) {
    return sanitized.substring(0, 196) + '.mp3';
  }
  return sanitized;
};

const NarrationAudioResult = ({
  job,
  assets,
  jobId,
  context,
  state,
  script,
  onStartNew,
}: Props) => {
  const navigate = useNavigate();
  const isRunning = job?.status === 'pending' || job?.status === 'running';
  const [playingAssetId, setPlayingAssetId] = useState<string | null>(null);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<'original' | 'converted'>('original');

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    assets.forEach((asset) => {
      if (durations[asset.id] !== undefined) return;
      const audio = new Audio(asset.file_url);
      const onLoaded = () => {
        setDurations((prev) => ({ ...prev, [asset.id]: audio.duration }));
      };
      audio.addEventListener('loadedmetadata', onLoaded);
      audio.addEventListener('error', () => {
        // silent
      });
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  const handleDownload = async (asset: SpotAsset) => {
    try {
      const filename = buildDownloadFilename(context);
      const response = await fetch(asset.file_url);
      if (!response.ok) throw new Error('fetch failed');
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (e) {
      toast.error('ダウンロードに失敗しました');
      console.error('[download error]', e);
    }
  };

  if (!jobId || !job) {
    return (
      <div className="rounded-xl border bg-card p-8 text-center text-muted-foreground text-sm">
        生成結果がありません
      </div>
    );
  }

  const handlePlay = (asset: SpotAsset) => {
    if (playingAssetId === asset.id && audioRef.current) {
      audioRef.current.pause();
      setPlayingAssetId(null);
      return;
    }
    audioRef.current?.pause();
    const audio = new Audio(asset.file_url);
    audio.onended = () => setPlayingAssetId(null);
    audio.play().catch(() => toast.error('再生できませんでした'));
    audioRef.current = audio;
    setPlayingAssetId(asset.id);
  };

  const handleGoToBgmSuggestion = () => {
    sessionStorage.setItem(
      'bgm_suggestion_seed',
      JSON.stringify({
        from_tool: 'narration_audio',
        from_job_id: jobId,
        narration_audio_url: assets[0]?.file_url ?? null,
        script,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('音声とスクリプトをBGM提案に引き継ぎます');
    navigate('/tools/bgm-suggestion');
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
          {assets.length > 0 && (
            <Button variant="brand" size="sm" onClick={handleGoToBgmSuggestion}>
              <ArrowRight className="h-3 w-3 mr-1" /> BGM提案へ
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
              <Sparkles className="absolute inset-0 m-auto h-5 w-5 text-secondary animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <div className="text-base font-semibold">
                {job.status === 'pending' ? '生成準備中...' : '音声を生成しています...'}
              </div>
              <div className="text-sm text-muted-foreground">
                ElevenLabsで音声合成中です。しばらくお待ちください。
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

      {/* 結果(音声プレーヤー) */}
      {job.status === 'completed' && assets.length > 0 && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            生成された音声 ({assets.length})
          </div>
          <div className="space-y-2">
            {assets.map((asset) => (
              <div
                key={asset.id}
                className="flex items-center gap-3 p-4 rounded-lg border bg-accent/20"
              >
                <Button
                  variant="brand"
                  size="icon"
                  className="h-10 w-10 rounded-full flex-shrink-0"
                  onClick={() => handlePlay(asset)}
                >
                  {playingAssetId === asset.id ? (
                    <Pause className="h-4 w-4" />
                  ) : (
                    <Play className="h-4 w-4 ml-0.5" />
                  )}
                </Button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium truncate">
                    <Mic className="h-3 w-3 text-secondary flex-shrink-0" />
                    {asset.file_name ?? `narration_${asset.sort_order ?? 1}.mp3`}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {durations[asset.id] !== undefined
                      ? `長さ: ${formatDuration(durations[asset.id])}`
                      : '長さ: 読み込み中...'}
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(asset)}
                  className="text-xs"
                >
                  <Download className="h-3 w-3 mr-1" /> DL
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* NA原稿(スクリプト)表示カード */}
      {job.status === 'completed' && assets.length > 0 && assets[0]?.metadata && (
        <div className="rounded-xl border bg-card p-5 space-y-3">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-secondary" />
            <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              読み上げ原稿(音声との整合性チェック用)
            </div>
          </div>

          <div className="flex border-b">
            <button
              onClick={() => setActiveScriptTab('original')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeScriptTab === 'original'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              元の原稿
            </button>
            <button
              onClick={() => setActiveScriptTab('converted')}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors border-b-2 -mb-px',
                activeScriptTab === 'converted'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              TTS変換後
            </button>
          </div>

          <div className="rounded-lg border bg-muted/30 p-4 max-h-96 overflow-y-auto">
            <pre className="whitespace-pre-wrap break-words text-sm font-sans text-foreground">
              {activeScriptTab === 'original'
                ? assets[0].metadata.original_script ?? '(元の原稿が保存されていません)'
                : assets[0].metadata.converted_script ?? '(TTS変換後の原稿が保存されていません)'}
            </pre>
          </div>

          <div className="flex items-start justify-between gap-3">
            <p className="text-xs text-muted-foreground flex-1">
              {activeScriptTab === 'original'
                ? '元の原稿: NA原稿ツールで生成されたそのまま(タイムコード付き)'
                : 'TTS変換後: ElevenLabs に渡す前に、TTS向けに読みやすく変換した版'}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const text =
                  activeScriptTab === 'original'
                    ? assets[0].metadata?.original_script
                    : assets[0].metadata?.converted_script;
                if (text) {
                  navigator.clipboard.writeText(text);
                  toast.success('原稿をコピーしました');
                } else {
                  toast.error('コピーする原稿がありません');
                }
              }}
              className="text-xs flex-shrink-0"
            >
              <Copy className="h-3 w-3 mr-1" />
              コピー
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default NarrationAudioResult;
