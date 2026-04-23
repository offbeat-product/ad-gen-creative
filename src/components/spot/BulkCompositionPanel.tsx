import { useState, useEffect, useMemo } from 'react';
import { Loader2, Rocket, Film, Image as ImageIcon, Clock, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useBulkComposition } from '@/hooks/useBulkComposition';
import BulkCompositionProgress from './BulkCompositionProgress';

import type { useProjectContext } from '@/hooks/useProjectContext';
import type { GeneratedCopy, AppealAxisCopy, BannerBrief } from '@/types/bulk-composition';
import {
  VISUAL_STYLE_PRESETS,
  DEFAULT_VISUAL_STYLE,
  type VisualStyleValue,
} from '@/constants/visualStyles';

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
  const [duration, setDuration] = useState<number>(30);
  const [creativeType, setCreativeType] = useState<'video' | 'banner'>('video');
  const [withNaScript, setWithNaScript] = useState<boolean>(true);
  const [withStoryboardImages, setWithStoryboardImages] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [bannerBrief, setBannerBrief] = useState<BannerBrief>(emptyBrief);
  const [visualStyle, setVisualStyle] = useState<VisualStyleValue>(DEFAULT_VISUAL_STYLE);
  const [toneManner, setToneManner] = useState('');
  const [visualStyleNotes, setVisualStyleNotes] = useState('');

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
      setAllCopies(output.copies ?? []);
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

  // 訴求軸ごとにグルーピング
  const groupedByAxis = useMemo(() => {
    const groups = new Map<
      number,
      { axis_index: number; axis_text: string; copies: GeneratedCopy[] }
    >();
    for (const copy of allCopies) {
      const idx = copy.appeal_axis_index;
      if (!groups.has(idx)) {
        groups.set(idx, {
          axis_index: idx,
          axis_text: copy.appeal_axis_text,
          copies: [],
        });
      }
      groups.get(idx)!.copies.push(copy);
    }
    return Array.from(groups.values()).sort((a, b) => a.axis_index - b.axis_index);
  }, [allCopies]);

  const totalCount = allCopies.length;

  const projectMeta = {
    client_name: context?.project.product.client.name ?? '',
    product_name: context?.project.product.name ?? '',
    project_name: context?.project.name ?? '',
  };

  const handleBulkGenerate = async () => {
    if (totalCount === 0) {
      toast.error('生成対象のコピーがありません');
      return;
    }

    if (creativeType === 'video' && visualStyle === 'custom' && !visualStyleNotes.trim()) {
      toast.error('「カスタム」選択時は映像スタイル補足の入力が必須です');
      return;
    }

    const estimatedMinutes = Math.max(1, Math.ceil((totalCount * 30) / 60));
    const ok = window.confirm(
      `${totalCount}件の${creativeType === 'banner' ? 'バナー' : ''}構成案を一括生成します。\n完了までおおよそ${estimatedMinutes}分かかります。\n続行しますか?`
    );
    if (!ok) return;

    const compositionRules =
      context?.rules.filter((r) =>
        ['storyboard', 'script', 'video_horizontal', 'video_vertical', 'banner'].includes(
          r.process_type
        )
      ) ?? [];

    const appealAxesCopies: AppealAxisCopy[] = allCopies.map((c) => ({
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
        with_na_script: creativeType === 'video' ? withNaScript : false,
        with_storyboard_images:
          creativeType === 'video' ? withStoryboardImages : false,
        ...(creativeType === 'video' && {
          visual_style: visualStyle,
          tone_manner: toneManner.trim() || null,
          visual_style_notes: visualStyleNotes.trim() || null,
        }),
      });
      toast.success(`${totalCount}件の構成案を生成開始しました`);
    } catch (err) {
      toast.error(`エラー: ${(err as Error).message}`);
    }
  };

  // Batch view (running) - on completion the hook auto-navigates to the result page
  if (bulk.currentBatch) {
    return (
      <div className="space-y-6">
        <h2 className="text-xl font-bold font-display tracking-tight">
          🚀 構成案 一括生成
        </h2>
        <BulkCompositionProgress batch={bulk.currentBatch} jobs={bulk.jobs} />
        {bulk.isAllFinished && (
          <div className="rounded-lg border bg-success/5 border-success/40 p-4 text-center text-sm">
            <Loader2 className="h-4 w-4 animate-spin inline-block mr-2 text-success" />
            生成結果画面に移動しています...
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
          {/* 引き継ぎカード: 訴求軸ごとに階層表示 */}
          <div className="rounded-xl border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <Sparkles className="h-4 w-4 text-secondary" />
              <h3 className="font-semibold text-sm">
                訴求軸・コピー生成ツールから引き継ぎ
              </h3>
              <Badge variant="secondary" className="ml-auto">
                全{totalCount}パターンを一括生成
              </Badge>
            </div>

            <div className="space-y-4">
              {groupedByAxis.map((group, axisIdx) => {
                const axisLabel = String.fromCharCode(65 + axisIdx);
                return (
                  <div
                    key={group.axis_index}
                    className="rounded-lg border bg-background overflow-hidden"
                  >
                    <div className="bg-muted px-4 py-2.5 flex items-start gap-2">
                      <Badge variant="outline" className="shrink-0 mt-0.5">
                        訴求軸{axisLabel}
                      </Badge>
                      <span className="text-sm font-medium leading-relaxed">
                        {group.axis_text}
                      </span>
                    </div>
                    <div className="divide-y">
                      {group.copies.map((copy, copyIdx) => (
                        <div
                          key={copy.pattern_id}
                          className="px-4 py-2.5 flex items-start gap-2"
                        >
                          <span className="text-secondary text-sm font-bold shrink-0">
                            ▸
                          </span>
                          <div className="min-w-0 flex-1 space-y-0.5">
                            <div className="text-xs text-muted-foreground">
                              コピー{copyIdx + 1}
                            </div>
                            <div className="text-sm leading-relaxed">
                              「{copy.copy_text}」
                            </div>
                            {copy.hook && (
                              <div className="text-xs text-muted-foreground">
                                💡 狙い: {copy.hook}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
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

          {/* Visual style (video only) */}
          {creativeType === 'video' && (
            <div className="space-y-4 rounded-xl border bg-card p-5">
              <div className="space-y-1">
                <h3 className="font-bold text-sm flex items-center gap-2">
                  🎬 映像スタイル
                </h3>
                <p className="text-xs text-muted-foreground">
                  各パターンの映像指示(visual)がこのスタイルに沿って生成されます
                </p>
              </div>

              {/* Visual style radio */}
              <div className="space-y-2">
                <Label className="text-xs">
                  映像スタイル <span className="text-destructive">*</span>
                </Label>
                <div className="grid gap-2">
                  {VISUAL_STYLE_PRESETS.map((preset) => {
                    const active = visualStyle === preset.value;
                    return (
                      <label
                        key={preset.value}
                        className={cn(
                          'flex items-start gap-3 cursor-pointer rounded-lg border p-3 transition-all hover:border-secondary/50',
                          active && 'border-secondary ring-2 ring-secondary/30 bg-secondary/5'
                        )}
                      >
                        <input
                          type="radio"
                          name="visual_style"
                          value={preset.value}
                          checked={active}
                          onChange={(e) =>
                            setVisualStyle(e.target.value as VisualStyleValue)
                          }
                          className="mt-1 accent-[hsl(var(--secondary))]"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold">
                            {preset.emoji} {preset.label}
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            {preset.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Tone & manner */}
              <div className="space-y-1">
                <Label className="text-xs">トーン&マナー (任意)</Label>
                <Input
                  value={toneManner}
                  onChange={(e) => setToneManner(e.target.value)}
                  placeholder="例: 明るく親しみやすく / 真面目で信頼感のある"
                  className="text-sm"
                />
              </div>

              {/* Visual style notes */}
              <div className="space-y-1">
                <Label className="text-xs">
                  映像スタイル補足
                  {visualStyle === 'custom' ? (
                    <span className="text-destructive ml-1">* (カスタム選択時は必須)</span>
                  ) : (
                    <span className="text-muted-foreground ml-1">(任意)</span>
                  )}
                </Label>
                <Textarea
                  value={visualStyleNotes}
                  onChange={(e) => setVisualStyleNotes(e.target.value)}
                  placeholder="例: 自撮り・手ブレ感・生活感重視 / カメラは縦型スマホ固定"
                  rows={2}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          )}

          {/* Optional add-ons (video only) */}
          {creativeType === 'video' && (
            <div className="space-y-3">
              {/* NA script toggle */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-secondary/30 bg-secondary/5 p-4 transition-colors hover:bg-secondary/10">
                <input
                  type="checkbox"
                  checked={withNaScript}
                  onChange={(e) => setWithNaScript(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded accent-[hsl(var(--secondary))]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">📝 NA原稿も一緒に生成する</span>
                    <Badge variant="outline" className="text-[10px] h-5">推奨</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    各構成案に対応するナレーション原稿を続けて自動生成します。後で個別に生成する手間が省けます。
                  </p>
                </div>
              </label>

              {/* Storyboard images toggle */}
              <label className="flex items-start gap-3 cursor-pointer rounded-xl border border-primary/30 bg-primary/5 p-4 transition-colors hover:bg-primary/10">
                <input
                  type="checkbox"
                  checked={withStoryboardImages}
                  onChange={(e) => setWithStoryboardImages(e.target.checked)}
                  className="mt-1 h-5 w-5 rounded accent-[hsl(var(--primary))]"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm">🎬 絵コンテ画像も生成する</span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 border-warning/40 text-warning"
                    >
                      生成時間 +15〜20分
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    各シーンに対応するAI絵コンテ画像(Flux 2 Pro)を自動生成し、pptxに「絵コンテビジュアル」ページを追加します。
                    <br />
                    ※画像生成は時間がかかるため、必要なときのみONを推奨。
                  </p>
                </div>
              </label>
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
            disabled={bulk.isStarting || totalCount === 0}
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
                構成案を生成({totalCount}パターン一括)
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
      <Label className={cn('text-xs', highlight && 'font-bold text-secondary')}>
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
