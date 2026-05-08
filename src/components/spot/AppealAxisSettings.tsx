import { History, Loader2, Sparkles, Wand2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import BriefSection, { type BriefData } from '@/components/spot/BriefSection';
import BriefHistoryPanel from '@/components/spot/BriefHistoryPanel';
import AdBrainReferenceCard from '@/components/spot/AdBrainReferenceCard';
import AdBrainProjectInfoCard from '@/components/spot/AdBrainProjectInfoCard';
import { loadCurrentBrief } from '@/lib/brief-persistence';
import { useAdBrainContext } from '@/hooks/useAdBrainContext';
import { buildPrefillFromAdBrain } from '@/lib/ad-brain-prefill';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  numAppealAxes: number;
  setNumAppealAxes: (n: number) => void;
  numCopies: number;
  setNumCopies: (n: number) => void;
  hint: string;
  setHint: (s: string) => void;
  briefData: BriefData;
  setBriefData: (b: BriefData) => void;
  onLpScrapedContentLoaded: (s: string | null) => void;
  onGenerate: () => void;
  isRunning: boolean;
}

const AppealAxisSettings = ({
  context,
  projectId,
  numAppealAxes,
  setNumAppealAxes,
  numCopies,
  setNumCopies,
  hint,
  setHint,
  briefData,
  setBriefData,
  onLpScrapedContentLoaded,
  onGenerate,
  isRunning,
}: Props) => {
  const [isGeneratingBrief, setIsGeneratingBrief] = useState(false);
  const [showOverwriteDialog, setShowOverwriteDialog] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // AD BRAIN context (Edge Function v11 / schema 2.5)
  const { data: adBrain, loading: adBrainLoading } = useAdBrainContext(projectId);

  // Step3 への遷移時に 1 回だけプリフィル
  const prefilledRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !adBrain) return;
    if (prefilledRef.current === projectId) return;
    prefilledRef.current = projectId;
    (async () => {
      try {
        const { brief, hint: nextHint } = await buildPrefillFromAdBrain(
          adBrain,
          briefData,
          hint
        );
        setBriefData(brief);
        if (nextHint && nextHint !== hint) setHint(nextHint);

        // 訴求軸 = compositions_count(自動)、コピー数 = 1(固定)
        const cc = adBrain.project?.brief?.compositions_count;
        if (typeof cc === 'number' && cc > 0) {
          setNumAppealAxes(Math.min(10, Math.max(1, cc)));
        }
        setNumCopies(1);
      } catch (e) {
        console.error('[AppealAxis] prefill error:', e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, adBrain]);

  const handleAutoGenerateBrief = async () => {
    if (!projectId) {
      toast.error('プロジェクトが選択されていません');
      return;
    }

    // 既存hintがある場合は確認ダイアログを表示
    if (hint && hint.trim().length > 0) {
      setShowOverwriteDialog(true);
      return;
    }

    await executeBriefAutogen();
  };

  const executeBriefAutogen = async () => {
    setShowOverwriteDialog(false);
    setIsGeneratingBrief(true);

    try {
      const response = await fetch(
        'https://offbeat-inc.app.n8n.cloud/webhook/adgen-brief-autogen',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ project_id: projectId }),
          signal: AbortSignal.timeout(60000),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[BriefAutogen] Response:', data);

      if (!data.success || !data.brief_text) {
        throw new Error(data.error || 'ブリーフが空で返されました');
      }

      setHint(data.brief_text);

      // 情報量を通知(参考情報)
      const info = data.source_count || {};
      const infoMsg = [
        info.reference_materials_count ? `参考資料 ${info.reference_materials_count}件` : null,
        info.has_lp_info ? 'LP情報あり' : null,
        info.has_ad_gen_info ? '広告企画情報あり' : null,
      ].filter(Boolean).join(' / ');

      toast.success(
        `ブリーフを自動生成しました${infoMsg ? ` (${infoMsg})` : ''}`
      );
    } catch (error) {
      console.error('[BriefAutogen] Error:', error);
      toast.error(
        `ブリーフの自動生成に失敗しました: ${error instanceof Error ? error.message : '不明なエラー'}`
      );
    } finally {
      setIsGeneratingBrief(false);
    }
  };

  const relevantRules =
    context?.rules.filter((r) =>
      ['script', 'banner_draft', 'banner_design'].includes(r.process_type)
    ) ?? [];

  const totalPatterns = numAppealAxes * numCopies;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        訴求軸・コピー数を設定
      </h2>

      <AdBrainReferenceCard data={adBrain} loading={adBrainLoading} />
      {context?.project.copyright_text && (
        <div className="text-xs text-muted-foreground">© {context.project.copyright_text}</div>
      )}

      {projectId && (
        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowHistory(true)}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              <History className="h-3.5 w-3.5 mr-1" />
              📜 履歴を見る
            </Button>
          </div>
          <BriefSection
            projectId={projectId}
            value={briefData}
            onChange={setBriefData}
            onLpScrapedContentLoaded={onLpScrapedContentLoaded}
            onHintGenerated={setHint}
          />
          <BriefHistoryPanel
            projectId={projectId}
            open={showHistory}
            onOpenChange={setShowHistory}
            onRestored={async () => {
              const reloaded = await loadCurrentBrief(projectId);
              if (reloaded) setBriefData(reloaded);
            }}
          />
        </div>
      )}

      <Separator className="my-2" />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>訴求軸の数</Label>
          <Select
            value={String(numAppealAxes)}
            onValueChange={(v) => setNumAppealAxes(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>各訴求軸あたりのコピー数</Label>
          <Select
            value={String(numCopies)}
            onValueChange={(v) => setNumCopies(Number(v))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {COUNT_OPTIONS.map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Alert variant={totalPatterns >= 50 ? 'destructive' : 'default'}>
        <AlertDescription>
          <span className="font-semibold text-foreground">
            {numAppealAxes} × {numCopies} = 合計{totalPatterns}パターン
          </span>
          <span className="text-muted-foreground"> 生成されます</span>
          {totalPatterns >= 50 && (
            <div className="mt-1 text-xs">
              ⚠ {totalPatterns}パターンの生成には数分かかる場合があります
            </div>
          )}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="hint">ヒント (任意)</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAutoGenerateBrief}
            disabled={isGeneratingBrief || !projectId}
            title="プロジェクト情報・オリエンシート等から広告コピーのブリーフを自動作成します"
          >
            {isGeneratingBrief ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                AIで自動生成
              </>
            )}
          </Button>
        </div>
        <Textarea
          id="hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={8}
          className="font-mono text-sm"
          placeholder="訴求軸・コピー生成のヒントや方向性(自動生成ボタンで一括入力も可能)"
        />
        <p className="text-xs text-muted-foreground">
          ブリーフに書き切れない細かい指示を追加で書けます
        </p>
      </div>

      {/* 上書き確認ダイアログ */}
      <AlertDialog open={showOverwriteDialog} onOpenChange={setShowOverwriteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>既存のhintを上書きしますか?</AlertDialogTitle>
            <AlertDialogDescription>
              自動生成したブリーフが現在のhintを上書きします。この操作は元に戻せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowOverwriteDialog(false)}>
              キャンセル
            </AlertDialogCancel>
            <AlertDialogAction onClick={executeBriefAutogen}>
              上書きする
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(!briefData.ad_objective || !briefData.target_audience) && (
        <Alert variant="destructive">
          <AlertDescription className="text-xs">
            広告ブリーフの「広告の目的」と「ターゲット」は必須です
          </AlertDescription>
        </Alert>
      )}

      <Button
        onClick={onGenerate}
        disabled={isRunning || !briefData.ad_objective || !briefData.target_audience}
        className="w-full h-12"
        size="lg"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
          </>
        ) : (
          <>
            <Sparkles className="h-4 w-4 mr-2" /> 訴求軸・コピーを生成
          </>
        )}
      </Button>
    </div>
  );
};

export default AppealAxisSettings;
