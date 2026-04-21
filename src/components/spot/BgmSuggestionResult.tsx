import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
  ArrowRight,
  Music,
  ExternalLink,
} from 'lucide-react';
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
  output_data: Record<string, unknown> | null;
}

export interface BgmAsset {
  id: string;
  asset_type: string;
  metadata: Record<string, any> | null;
}

export interface BgmSuggestion {
  rank?: number;
  mood?: string;
  genre?: string;
  theme?: string;
  tempo?: string;
  vocals?: string;
  description?: string;
  reason?: string;
  search_url?: string;
}

interface Props {
  job: SpotJob | null;
  assets: BgmAsset[];
  jobId: string | null;
  context: ReturnType<typeof useProjectContext>['context'];
  state: SpotWizardState;
  appealAxis: string;
  copyText: string;
  composition: string;
  narrationScript: string;
  durationSeconds: 15 | 30 | 60;
  creativeType: 'video' | 'banner';
  onStartNew: () => void;
}

const formatDateTime = (iso?: string | null): string => {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}/${pad(d.getMonth() + 1)}/${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const BgmSuggestionResult = ({
  job,
  assets,
  jobId,
  context: _context,
  state,
  appealAxis,
  copyText,
  composition,
  narrationScript,
  durationSeconds,
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

  const suggestions: BgmSuggestion[] =
    (assets[0]?.metadata as any)?.bgm_suggestions ??
    (job?.output_data as any)?.bgm_suggestions ??
    [];

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

  const handleGoToVCon = () => {
    sessionStorage.setItem(
      'vcon_seed',
      JSON.stringify({
        from_tool: 'bgm_suggestion',
        from_job_id: jobId,
        appeal_axis: appealAxis,
        copy_text: copyText,
        composition,
        narration_script: narrationScript,
        duration_seconds: durationSeconds,
        creative_type: creativeType,
        bgm_suggestions: suggestions,
        project_id: state.projectId,
        client_id: state.clientId,
        product_id: state.productId,
      })
    );
    toast.success('全コンテンツをVコン生成に引き継ぎます');
    navigate('/tools/vcon');
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
          {suggestions.length > 0 && (
            <span className="text-xs text-muted-foreground">
              候補 {suggestions.length}件
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          <Button variant="outline" size="sm" onClick={onStartNew}>
            <RotateCcw className="h-3 w-3 mr-1" /> 新しく生成する
          </Button>
          {suggestions.length > 0 && (
            <Button variant="brand" size="sm" onClick={handleGoToVCon}>
              <ArrowRight className="h-3 w-3 mr-1" /> Vコン生成へ
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
              <Music className="absolute inset-0 m-auto h-5 w-5 text-secondary animate-pulse" />
            </div>
            <div className="text-center space-y-2 max-w-md">
              <div className="text-base font-semibold">
                {job.status === 'pending'
                  ? '生成準備中...'
                  : '🎵 BGM候補を生成しています...'}
              </div>
              <div className="text-sm text-muted-foreground">
                30秒ほどお待ちください。
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
      {job.status === 'completed' && suggestions.length > 0 && (
        <div className="space-y-3">
          {suggestions.map((s, i) => (
            <div
              key={i}
              className="rounded-lg border bg-card p-4 space-y-3 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary text-secondary-foreground flex items-center justify-center text-xs font-bold">
                  {s.rank ?? i + 1}
                </div>
                <div className="text-xs font-semibold text-muted-foreground">BGM候補</div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {s.mood && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-primary-wash text-primary font-medium">
                    Mood: {s.mood}
                  </span>
                )}
                {s.genre && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-secondary-wash text-secondary font-medium">
                    Genre: {s.genre}
                  </span>
                )}
                {s.theme && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                    Theme: {s.theme}
                  </span>
                )}
                {s.tempo && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                    Tempo: {s.tempo}
                  </span>
                )}
                {s.vocals && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] bg-muted font-medium">
                    Vocals: {s.vocals}
                  </span>
                )}
              </div>

              {s.description && (
                <div className="text-sm font-medium">「{s.description}」</div>
              )}

              {s.reason && (
                <div className="text-xs text-muted-foreground">
                  <span className="font-semibold text-foreground">選定理由: </span>
                  {s.reason}
                </div>
              )}

              {s.search_url && (
                <a
                  href={s.search_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md bg-secondary text-secondary-foreground hover:opacity-90 transition-opacity"
                >
                  <Music className="h-3.5 w-3.5 mr-1.5" /> Envato Elementsで曲を探す
                  <ExternalLink className="h-3 w-3 ml-1.5 opacity-70" />
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default BgmSuggestionResult;
