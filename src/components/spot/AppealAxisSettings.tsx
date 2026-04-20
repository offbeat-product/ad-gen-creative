import { Loader2, Sparkles } from 'lucide-react';
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
import type { useProjectContext } from '@/hooks/useProjectContext';

const COUNT_OPTIONS = [1, 2, 3, 4, 5] as const;

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

      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">
              📋 関連ルール {relevantRules.length}件
            </span>
            {context.corrections && context.corrections.length > 0 && (
              <span className="text-foreground">
                🔁 修正パターン {context.corrections.length}件
              </span>
            )}
            {context.project.copyright_text && (
              <span className="text-muted-foreground">
                © {context.project.copyright_text}
              </span>
            )}
          </div>
        </div>
      )}

      {projectId && (
        <BriefSection
          projectId={projectId}
          value={briefData}
          onChange={setBriefData}
          onLpScrapedContentLoaded={onLpScrapedContentLoaded}
        />
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

      <Alert>
        <AlertDescription>
          <span className="font-semibold text-foreground">
            {numAppealAxes} × {numCopies} = 合計{totalPatterns}パターン
          </span>
          <span className="text-muted-foreground"> 生成されます</span>
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="hint">ヒント (任意)</Label>
        <Textarea
          id="hint"
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          rows={3}
          placeholder="特に意識してほしいターゲット・トーン・要素など"
        />
        <p className="text-xs text-muted-foreground">
          ブリーフに書き切れない細かい指示を追加で書けます
        </p>
      </div>

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
