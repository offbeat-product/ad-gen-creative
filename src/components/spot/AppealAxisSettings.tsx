import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import AdBrainReferenceCard from '@/components/spot/AdBrainReferenceCard';
import AdBrainProjectInfoCard from '@/components/spot/AdBrainProjectInfoCard';
import AdBrainMemoSection from '@/components/spot/AdBrainMemoSection';
import { useAdBrainContext } from '@/hooks/useAdBrainContext';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { useEffect, useRef } from 'react';

const COUNT_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] as const;

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;
  numAppealAxes: number;
  setNumAppealAxes: (n: number) => void;
  numCopies: number;
  setNumCopies: (n: number) => void;
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
  onGenerate,
  isRunning,
}: Props) => {
  const { data: adBrain, loading: adBrainLoading } = useAdBrainContext(projectId);

  // 訴求軸 = compositions_count(自動)、コピー数 = 1(固定)
  const syncedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!projectId || !adBrain) return;
    if (syncedRef.current === projectId) return;
    syncedRef.current = projectId;
    const cc = adBrain.project?.brief?.compositions_count;
    if (typeof cc === 'number' && cc > 0) {
      setNumAppealAxes(Math.min(10, Math.max(1, cc)));
    }
    setNumCopies(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, adBrain]);

  const totalPatterns = numAppealAxes * numCopies;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">
        訴求軸・コピー数を設定
      </h2>

      <AdBrainReferenceCard data={adBrain} loading={adBrainLoading} />
      <AdBrainProjectInfoCard data={adBrain} />
      {context?.project.copyright_text && (
        <div className="text-xs text-muted-foreground">© {context.project.copyright_text}</div>
      )}

      <AdBrainMemoSection
        projectId={projectId}
        initialMemo={adBrain?.project?.brief?.memo ?? ''}
        contextKey={adBrain?.generated_at ?? null}
      />

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
          <Select value="1" disabled>
            <SelectTrigger>
              <SelectValue placeholder="1" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground -mt-2">
        Ad Brain の構成案数に応じて訴求軸を自動設定します。1 訴求軸 = 1 コピーで生成されます。
      </p>

      <Alert variant={totalPatterns >= 50 ? 'destructive' : 'default'}>
        <AlertDescription>
          <span className="font-semibold text-foreground">
            {numAppealAxes} × {numCopies} = 合計{totalPatterns}パターン
          </span>
          <span className="text-muted-foreground"> 生成されます</span>
        </AlertDescription>
      </Alert>

      <Button
        onClick={onGenerate}
        disabled={isRunning || !projectId}
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
