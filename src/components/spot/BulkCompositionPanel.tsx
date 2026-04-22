import { useState, useEffect, useMemo } from 'react';
import { Loader2, Rocket, Film, Image as ImageIcon, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { useBulkComposition } from '@/hooks/useBulkComposition';
import BulkCompositionProgress from './BulkCompositionProgress';
import BulkCompositionDocxDownload from './BulkCompositionDocxDownload';
import type { useProjectContext } from '@/hooks/useProjectContext';
import type { GeneratedCopy, AppealAxisCopy, BannerBrief } from '@/types/bulk-composition';

interface Props {
  projectId: string;
  context: ReturnType<typeof useProjectContext>['context'];
}

const DURATION_OPTIONS = [15, 30, 60] as const;

const emptyBrief: BannerBrief = {
  target_age: '',
  insight_category: '',
  insight: '',
  what_to_say: '',
  user_situation: '',
  user_motivation: '',
  user_merit: '',
};

const BulkCompositionPanel = ({ projectId, context }: Props) => {
  const bulk = useBulkComposition(projectId);

  const [allCopies, setAllCopies] = useState<GeneratedCopy[]>([]);
  const [selectedPatternIds, setSelectedPatternIds] = useState<Set<string>>(
    new Set()
  );
  const [duration, setDuration] = useState<number>(30);
  const [creativeType, setCreativeType] = useState<'video' | 'banner'>('video');
  const [loading, setLoading] = useState(true);
  const [bannerBrief, setBannerBrief] = useState<BannerBrief>(emptyBrief);

  // Load latest appeal_axis_copy job
  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data: latestJob } = await supabase
        .from('gen_spot_jobs')
        .select('output_data')
        .eq('project_id', projectId)
        .eq('tool_type', 'appeal_axis_copy')
        .eq('status', 'completed')
        .order('completed_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cancelled) return;

      const output = (latestJob?.output_data ?? {}) as {
        copies?: GeneratedCopy[];
      };
      const copies = output.copies ?? [];
      setAllCopies(copies);
      setSelectedPatternIds(new Set(copies.map((c) => c.pattern_id)));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId]);

  // Auto-prefill banner brief from project brief context
  useEffect(() => {
    if (!context?.project) return;
    const p = context.project as any;
    setBannerBrief((prev) => ({
      target_age: prev.target_age || p.target_audience || '',
      insight_category: prev.insight_category || '',
      insight: prev.insight || p.target_insight || '',
      what_to_say: prev.what_to_say || p.differentiation || '',
      user_situation: prev.user_situation || '',
      user_motivation: prev.user_motivation || '',
      user_merit: prev.user_merit || '',
    }));
  }, [context?.project]);

  const selectedCopies = useMemo(
    () => allCopies.filter((c) => selectedPatternIds.has(c.pattern_id)),
    [allCopies, selectedPatternIds]
  );

  const projectMeta = {
    client_name: context?.project.product.client.name ?? '',
    product_name: context?.project.product.name ?? '',
    project_name: context?.project.name ?? '',
  };

  const handleBulkGenerate = async () => {
    if (selectedCopies.length === 0) {
      toast.error('少なくとも1つのコピーを選択してください');
      return;
    }

    const estimatedMinutes = Math.ceil((selectedCopies.length * 30) / 60);
    const ok = window.confirm(
      `${selectedCopies.length}件の${creativeType === 'banner' ? 'バナー' : ''}構成案を一括生成します。\n完了までおおよそ${estimatedMinutes}分かかります。\n続行しますか?`
    );
    if (!ok) return;

    const compositionRules =
      context?.rules.filter((r) =>
        ['storyboard', 'script', 'video_horizontal', 'video_vertical', 'banner'].includes(
          r.process_type
        )
      ) ?? [];

    const appealAxesCopies: AppealAxisCopy[] = selectedCopies.map((c) => ({
      appeal_axis: c.appeal_axis_text,
      copy_text: c.copy_text,
      pattern_id: c.pattern_id,
      axis_index: c.appeal_axis_index,
      copy_index: c.copy_index,
      hook: c.hook,
    }));

    try {
      await bulk.startBulkGeneration(appealAxesCopies, {
        duration_seconds: duration,
        creative_type: creativeType,
        brief: creativeType === 'banner' ? bannerBrief : undefined,
        client_name: projectMeta.client_name,
        product_name: projectMeta.product_name,
        project_name: projectMeta.project_name,
        copyright_text: context?.project.copyright_text ?? undefined,
        rules: compositionRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],
      });
      toast.success(`${selectedCopies.length}件の構成案を生成開始しました`);
    } catch (err) {
      toast.error(`エラー: ${(err as Error).message}`);
    }
  };

  // Batch view (running or finished)
  if (bulk.currentBatch) {
    const completedJobs = bulk.jobs.filter((j) => j.status === 'completed');
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-display tracking-tight">
          🚀 構成案 一括生成
        </h2>
        <BulkCompositionProgress
          batch={bulk.currentBatch}
          jobs={bulk.jobs}
        />
        {bulk.isAllFinished && completedJobs.length > 0 && (
          <BulkCompositionDocxDownload
            batch={bulk.currentBatch}
            jobs={completedJobs}
            projectMeta={projectMeta}
          />
        )}
        {bulk.isAllFinished && (
          <div className="text-center pt-2">
            <Button variant="outline" size="sm" onClick={bulk.resetBatch}>
              ← 新しい一括生成を始める
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h2 className="text-xl font-bold font-display tracking-tight">
          🚀 構成案 一括生成
        </h2>
        <p className="text-sm text-muted-foreground">
          訴求軸・コピー生成ツールで作成した全コピーから、構成案を一括で生成します
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border bg-card p-8 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto text-secondary mb-2" />
          <div className="text-sm text-muted-foreground">
            訴求軸・コピーを読み込み中...
          </div>
        </div>
      ) : allCopies.length === 0 ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            この案件にはまだ訴求軸・コピー生成結果がありません。先に「訴求軸・コピー生成ツール」で生成してください。
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {/* Copies list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">
                生成対象コピー ({selectedCopies.length} / {allCopies.length})
              </Label>
              <div className="flex items-center gap-1 text-xs">
                <button
                  type="button"
                  className="text-secondary hover:underline"
                  onClick={() =>
                    setSelectedPatternIds(
                      new Set(allCopies.map((c) => c.pattern_id))
                    )
                  }
                >
                  全選択
                </button>
                <span className="text-muted-foreground">|</span>
                <button
                  type="button"
                  className="text-secondary hover:underline"
                  onClick={() => setSelectedPatternIds(new Set())}
                >
                  全解除
                </button>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto rounded-xl border bg-card p-2">
              {allCopies.map((copy) => {
                const checked = selectedPatternIds.has(copy.pattern_id);
                return (
                  <label
                    key={copy.pattern_id}
                    htmlFor={`copy-${copy.pattern_id}`}
                    className={cn(
                      'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                      checked
                        ? 'border-secondary bg-secondary-wash/30'
                        : 'border-border hover:border-secondary/50'
                    )}
                  >
                    <Checkbox
                      id={`copy-${copy.pattern_id}`}
                      checked={checked}
                      onCheckedChange={(v) => {
                        const next = new Set(selectedPatternIds);
                        if (v) next.add(copy.pattern_id);
                        else next.delete(copy.pattern_id);
                        setSelectedPatternIds(next);
                      }}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
                        パターン {copy.pattern_id} / 訴求軸{' '}
                        {copy.appeal_axis_index}
                      </div>
                      <div className="text-xs text-muted-foreground line-clamp-1">
                        {copy.appeal_axis_text}
                      </div>
                      <div className="text-sm font-medium line-clamp-2">
                        「{copy.copy_text}」
                      </div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Creative type */}
          <div className="space-y-2">
            <Label>クリエイティブタイプ</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setCreativeType('video')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-secondary/50',
                  creativeType === 'video' &&
                    'border-secondary ring-2 ring-secondary/30'
                )}
              >
                <Film className="h-4 w-4 text-secondary" />
                <span className="font-semibold">動画</span>
              </button>
              <button
                type="button"
                onClick={() => setCreativeType('banner')}
                className={cn(
                  'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-secondary/50',
                  creativeType === 'banner' &&
                    'border-secondary ring-2 ring-secondary/30'
                )}
              >
                <ImageIcon className="h-4 w-4 text-secondary" />
                <span className="font-semibold">バナー</span>
              </button>
            </div>
          </div>

          {/* Duration (video only) */}
          {creativeType === 'video' && (
            <div className="space-y-2">
              <Label>動画尺</Label>
              <div className="grid grid-cols-3 gap-3">
                {DURATION_OPTIONS.map((sec) => (
                  <button
                    type="button"
                    key={sec}
                    onClick={() => setDuration(sec)}
                    className={cn(
                      'flex items-center justify-center gap-2 rounded-xl border bg-card p-4 transition-all hover:border-secondary/50',
                      duration === sec &&
                        'border-secondary ring-2 ring-secondary/30'
                    )}
                  >
                    <Clock className="h-4 w-4 text-secondary" />
                    <span className="font-semibold">{sec}秒</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Banner brief form */}
          {creativeType === 'banner' && (
            <div className="space-y-3 rounded-xl border bg-card p-4">
              <div className="space-y-1">
                <h3 className="font-bold">📋 バナー構成案ブリーフ</h3>
                <p className="text-xs text-muted-foreground">
                  pptx出力時に左側テーブルに表示される情報です。全項目入力推奨。
                </p>
              </div>

              <BriefField
                label="対象年齢"
                value={bannerBrief.target_age}
                onChange={(v) => setBannerBrief({ ...bannerBrief, target_age: v })}
                placeholder="例: 30〜40代"
              />
              <BriefField
                label="インサイトカテゴリ"
                value={bannerBrief.insight_category}
                onChange={(v) =>
                  setBannerBrief({ ...bannerBrief, insight_category: v })
                }
                placeholder="例: ワークライフバランスを重視"
              />
              <BriefField
                label="インサイト"
                value={bannerBrief.insight}
                onChange={(v) => setBannerBrief({ ...bannerBrief, insight: v })}
                placeholder="例: 家庭と両立"
              />
              <BriefField
                label="What to Say"
                value={bannerBrief.what_to_say}
                onChange={(v) =>
                  setBannerBrief({ ...bannerBrief, what_to_say: v })
                }
                placeholder="例: 予定が立てやすい働き方"
                highlight
              />
              <BriefField
                label="ユーザーのシチュエーション"
                value={bannerBrief.user_situation}
                onChange={(v) =>
                  setBannerBrief({ ...bannerBrief, user_situation: v })
                }
                multiline
              />
              <BriefField
                label="ユーザーのモチベーション"
                value={bannerBrief.user_motivation}
                onChange={(v) =>
                  setBannerBrief({ ...bannerBrief, user_motivation: v })
                }
                multiline
              />
              <BriefField
                label="ユーザーにとってのメリット"
                value={bannerBrief.user_merit}
                onChange={(v) =>
                  setBannerBrief({ ...bannerBrief, user_merit: v })
                }
                multiline
              />

              <p className="text-[11px] text-muted-foreground">
                💡 ヒント: 案件のオリエン情報があれば自動入力されます
              </p>
            </div>
          )}

          {/* Generate button */}
          <Button
            onClick={handleBulkGenerate}
            disabled={bulk.isStarting || selectedCopies.length === 0}
            className="w-full h-12"
            size="lg"
            variant="brand"
          >
            {bulk.isStarting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成開始中...
              </>
            ) : (
              <>
                <Rocket className="h-4 w-4 mr-2" />
                選択した{selectedCopies.length}件の
                {creativeType === 'banner' ? 'バナー' : ''}構成案を一括生成
              </>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

interface BriefFieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  multiline?: boolean;
  highlight?: boolean;
}

function BriefField({
  label,
  value,
  onChange,
  placeholder,
  multiline,
  highlight,
}: BriefFieldProps) {
  return (
    <div className="space-y-1">
      <Label
        className={cn(
          'text-xs',
          highlight && 'font-bold text-secondary'
        )}
      >
        {label}
        {highlight && ' ⭐'}
      </Label>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={2}
          className="text-sm"
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="text-sm"
        />
      )}
    </div>
  );
}

export default BulkCompositionPanel;
