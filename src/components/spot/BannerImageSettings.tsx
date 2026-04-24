import { useState } from 'react';
import {
  Image as ImageIcon,
  Loader2,
  ListChecks,
  Camera,
  Layers,
  Layers3,
  Sparkles,
  X,
  Plus,
  FileImage,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

export interface BannerSize {
  width: number;
  height: number;
  label: string;
  description?: string;
}

const STYLE_OPTIONS = [
  { value: 'photographic', label: '実写', icon: Camera, description: '写真のような表現' },
  { value: 'illustration', label: 'イラスト', icon: Sparkles, description: '手描き調・アート系' },
  { value: 'motion_graphics', label: 'モーショングラフィックス', icon: Layers, description: 'フラットデザイン' },
] as const;

export const PRESET_SIZES: BannerSize[] = [
  { width: 1080, height: 1080, label: '1080×1080', description: 'Instagram/FB Feed' },
  { width: 1200, height: 628, label: '1200×628', description: 'Twitter/FB Feed' },
  { width: 1080, height: 1920, label: '1080×1920', description: 'Stories/Reels/TikTok' },
  { width: 1200, height: 1200, label: '1200×1200', description: 'LinkedIn' },
  { width: 728, height: 90, label: '728×90', description: 'Leaderboard' },
  { width: 300, height: 250, label: '300×250', description: 'MPU' },
  { width: 336, height: 280, label: '336×280', description: 'Large Rectangle' },
];

const sizeKey = (s: BannerSize) => `${s.width}x${s.height}`;

interface CompositionJobRow {
  id: string;
  created_at: string | null;
  input_data: Record<string, unknown> | null;
}

interface CompositionScene {
  part: string;
  time_range?: string;
  telop?: string;
  visual?: string;
  narration?: string;
}

interface Props {
  context: ReturnType<typeof useProjectContext>['context'];
  projectId: string | null;

  mainCopy: string;
  setMainCopy: (v: string) => void;
  subCopy: string;
  setSubCopy: (v: string) => void;
  ctaText: string;
  setCtaText: (v: string) => void;
  appealPoint: string;
  setAppealPoint: (v: string) => void;
  targetAudience: string;
  setTargetAudience: (v: string) => void;
  creativeStyle: string;
  setCreativeStyle: (v: string) => void;

  selectedSizes: BannerSize[];
  setSelectedSizes: (v: BannerSize[]) => void;
  customWidth: string;
  setCustomWidth: (v: string) => void;
  customHeight: string;
  setCustomHeight: (v: string) => void;

  variationsPerSize: number;
  setVariationsPerSize: (v: number) => void;
  burnText: boolean;
  setBurnText: (v: boolean) => void;
  outputPng: boolean;
  setOutputPng: (v: boolean) => void;
  outputPsd: boolean;
  setOutputPsd: (v: boolean) => void;

  onGenerate: () => void;
  isRunning: boolean;
}

const BannerImageSettings = ({
  context,
  projectId,
  mainCopy,
  setMainCopy,
  subCopy,
  setSubCopy,
  ctaText,
  setCtaText,
  appealPoint,
  setAppealPoint,
  targetAudience,
  setTargetAudience,
  creativeStyle,
  setCreativeStyle,
  selectedSizes,
  setSelectedSizes,
  customWidth,
  setCustomWidth,
  customHeight,
  setCustomHeight,
  variationsPerSize,
  setVariationsPerSize,
  burnText,
  setBurnText,
  outputPng,
  setOutputPng,
  outputPsd,
  setOutputPsd,
  onGenerate,
  isRunning,
}: Props) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pastJobs, setPastJobs] = useState<
    Array<CompositionJobRow & { scenes: CompositionScene[] }>
  >([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  const bannerRules =
    context?.rules.filter((r) =>
      ['banner_draft', 'banner_design'].includes(r.process_type)
    ) ?? [];

  const isSizeSelected = (s: BannerSize) =>
    selectedSizes.some((x) => x.width === s.width && x.height === s.height);

  const toggleSize = (s: BannerSize) => {
    const exists = selectedSizes.some((x) => x.width === s.width && x.height === s.height);
    if (exists) {
      setSelectedSizes(
        selectedSizes.filter((x) => !(x.width === s.width && x.height === s.height))
      );
    } else {
      setSelectedSizes([...selectedSizes, s]);
    }
  };

  const addCustomSize = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (!w || !h || w < 50 || h < 50 || w > 4000 || h > 4000) {
      toast.error('幅と高さは50〜4000pxの範囲で入力してください');
      return;
    }
    const newSize: BannerSize = { width: w, height: h, label: `${w}×${h}` };
    if (isSizeSelected(newSize)) {
      toast.error('同じサイズが既に選択されています');
      return;
    }
    setSelectedSizes([...selectedSizes, newSize]);
    setCustomWidth('');
    setCustomHeight('');
  };

  const removeSize = (s: BannerSize) => {
    setSelectedSizes(
      selectedSizes.filter((x) => !(x.width === s.width && x.height === s.height))
    );
  };

  const loadPastCompositions = async () => {
    if (!projectId) return;
    setPickerLoading(true);
    try {
      const { data: jobs, error: jobsErr } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, input_data')
        .eq('project_id', projectId)
        .eq('tool_type', 'composition')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (jobsErr || !jobs) {
        toast.error('過去の構成案の取得に失敗しました');
        return;
      }
      if (jobs.length === 0) {
        setPastJobs([]);
        return;
      }

      const jobIds = jobs.map((j) => j.id);
      const { data: assetRows } = await supabase
        .from('gen_spot_assets')
        .select('job_id, metadata')
        .in('job_id', jobIds);

      const scenesByJob = new Map<string, CompositionScene[]>();
      (assetRows ?? []).forEach((row: any) => {
        const scenes = row.metadata?.scenes as CompositionScene[] | undefined;
        if (scenes && Array.isArray(scenes)) {
          scenesByJob.set(row.job_id, scenes);
        }
      });

      setPastJobs(
        jobs.map((j) => ({
          ...(j as CompositionJobRow),
          scenes: scenesByJob.get(j.id) ?? [],
        }))
      );
    } finally {
      setPickerLoading(false);
    }
  };

  const handlePickComposition = (scenes: CompositionScene[]) => {
    if (scenes.length === 0) return;
    const main = scenes[0]?.telop ?? '';
    const sub = scenes[1]?.telop ?? '';
    setMainCopy(main);
    setSubCopy(sub);
    if (!ctaText) setCtaText('詳しくはこちら');
    setPickerOpen(false);
    toast.success('構成案からコピーを読み込みました');
  };

  const totalCount = selectedSizes.length * variationsPerSize;
  const canGenerate =
    mainCopy.trim().length > 0 && selectedSizes.length > 0 && (outputPng || outputPsd);

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold font-display tracking-tight">バナー画像を設定</h2>

      {/* Ad Brain 参照情報 */}
      {context && (
        <div className="rounded-xl bg-secondary-wash/40 border border-secondary/20 p-4 space-y-2">
          <div className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Ad Brain 参照
          </div>
          <div className="flex flex-wrap gap-3 text-xs">
            <span className="text-foreground">
              🖼️ バナー制作ルール {bannerRules.length}件
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

      {/* 構成案連携 */}
      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setPickerOpen(true);
            loadPastCompositions();
          }}
        >
          <ListChecks className="h-3.5 w-3.5 mr-1.5" />
          構成案生成の結果から読み込み
        </Button>
      </div>

      {/* テキスト入力 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="main-copy">
            メインコピー <span className="text-destructive">*</span>
          </Label>
          <Input
            id="main-copy"
            value={mainCopy}
            onChange={(e) => setMainCopy(e.target.value)}
            placeholder="家族の予定を犠牲にしない働き方へ"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="sub-copy">サブコピー</Label>
          <Input
            id="sub-copy"
            value={subCopy}
            onChange={(e) => setSubCopy(e.target.value)}
            placeholder="勤務スケジュールが決まっているから、参観日も行事も、ちゃんと行ける"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cta-text">CTAボタン文言</Label>
          <Input
            id="cta-text"
            value={ctaText}
            onChange={(e) => setCtaText(e.target.value)}
            placeholder="詳しく見る"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="target">ターゲット</Label>
          <Input
            id="target"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="30代女性・子育て中"
          />
        </div>
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="appeal">訴求ポイント</Label>
          <Textarea
            id="appeal"
            value={appealPoint}
            onChange={(e) => setAppealPoint(e.target.value)}
            placeholder="シフト固定で家庭との両立がしやすい点を訴求"
            className="min-h-[72px]"
          />
        </div>
      </div>

      {/* ビジュアルスタイル */}
      <div className="space-y-3">
        <Label>ビジュアルスタイル</Label>
        <RadioGroup
          value={creativeStyle}
          onValueChange={setCreativeStyle}
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
        >
          {STYLE_OPTIONS.map((s) => (
            <Label
              key={s.value}
              htmlFor={`bstyle-${s.value}`}
              className={cn(
                'flex flex-col items-start gap-1.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                creativeStyle === s.value && 'border-secondary ring-2 ring-secondary/30'
              )}
            >
              <RadioGroupItem value={s.value} id={`bstyle-${s.value}`} className="sr-only" />
              <div className="flex items-center gap-2">
                <s.icon className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">{s.label}</span>
              </div>
              <span className="text-xs text-muted-foreground">{s.description}</span>
            </Label>
          ))}
        </RadioGroup>
      </div>

      {/* サイズ選択 */}
      <div className="space-y-3">
        <Label>サイズ選択 (複数選択可)</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
          {PRESET_SIZES.map((s) => {
            const checked = isSizeSelected(s);
            return (
              <label
                key={sizeKey(s)}
                className={cn(
                  'flex items-start gap-2.5 rounded-lg border bg-card p-3 cursor-pointer transition-all hover:border-secondary/50',
                  checked && 'border-secondary ring-2 ring-secondary/30 bg-secondary-wash/30'
                )}
              >
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => toggleSize(s)}
                  className="mt-0.5"
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold tabular-nums">{s.label}</div>
                  {s.description && (
                    <div className="text-[11px] text-muted-foreground">{s.description}</div>
                  )}
                </div>
              </label>
            );
          })}
        </div>

        {/* カスタム追加 */}
        <div className="rounded-lg border bg-card p-3 space-y-2">
          <div className="text-xs font-semibold text-muted-foreground">カスタムサイズを追加</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              placeholder="幅"
              value={customWidth}
              onChange={(e) => setCustomWidth(e.target.value)}
              className="w-24"
            />
            <span className="text-muted-foreground">×</span>
            <Input
              type="number"
              placeholder="高さ"
              value={customHeight}
              onChange={(e) => setCustomHeight(e.target.value)}
              className="w-24"
            />
            <span className="text-xs text-muted-foreground">px</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addCustomSize}
              disabled={!customWidth || !customHeight}
            >
              <Plus className="h-3.5 w-3.5 mr-1" />
              追加
            </Button>
          </div>
          {selectedSizes.filter(
            (s) => !PRESET_SIZES.some((p) => p.width === s.width && p.height === s.height)
          ).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {selectedSizes
                .filter(
                  (s) => !PRESET_SIZES.some((p) => p.width === s.width && p.height === s.height)
                )
                .map((s) => (
                  <span
                    key={sizeKey(s)}
                    className="inline-flex items-center gap-1 text-xs bg-secondary-wash text-secondary px-2 py-0.5 rounded-full"
                  >
                    {s.label}
                    <button
                      type="button"
                      onClick={() => removeSize(s)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground">
          選択中:{' '}
          {selectedSizes.length > 0 ? (
            <>
              <span className="text-foreground font-medium">
                {selectedSizes.map((s) => s.label).join(', ')}
              </span>{' '}
              (合計{selectedSizes.length}サイズ)
            </>
          ) : (
            <span className="text-destructive">サイズを1つ以上選択してください</span>
          )}
        </div>
      </div>

      {/* 生成枚数 */}
      <div className="space-y-3">
        <Label>各サイズあたりのバリエーション数</Label>
        <div className="flex items-center gap-3">
          <Select
            value={String(variationsPerSize)}
            onValueChange={(v) => setVariationsPerSize(Number(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[1, 2, 3, 4, 5].map((n) => (
                <SelectItem key={n} value={String(n)}>
                  {n} 枚
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {selectedSizes.length}サイズ × {variationsPerSize}バリエーション ={' '}
            <span className="text-foreground font-semibold">合計{totalCount}枚</span>
          </span>
        </div>
      </div>

      {/* テキスト焼き込み */}
      <div className="space-y-3">
        <Label>テキスト焼き込み</Label>
        <RadioGroup
          value={burnText ? 'burn' : 'no_burn'}
          onValueChange={(v) => setBurnText(v === 'burn')}
          className="grid grid-cols-1 md:grid-cols-2 gap-3"
        >
          <Label
            htmlFor="burn-yes"
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              burnText && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <RadioGroupItem value="burn" id="burn-yes" />
            <div>
              <div className="font-semibold text-sm">焼き込む</div>
              <div className="text-xs text-muted-foreground">完成形のバナー画像</div>
            </div>
          </Label>
          <Label
            htmlFor="burn-no"
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              !burnText && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <RadioGroupItem value="no_burn" id="burn-no" />
            <div>
              <div className="font-semibold text-sm">テキストなし背景のみ</div>
              <div className="text-xs text-muted-foreground">後から手動で文字入れ</div>
            </div>
          </Label>
        </RadioGroup>
      </div>

      {/* 出力形式 */}
      <div className="space-y-3">
        <Label>出力形式</Label>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              outputPng && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <Checkbox checked={outputPng} onCheckedChange={(c) => setOutputPng(!!c)} />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <FileImage className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">PNG</span>
              </div>
              <div className="text-xs text-muted-foreground">完成バナー</div>
            </div>
          </label>
          <label
            className={cn(
              'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
              outputPsd && 'border-secondary ring-2 ring-secondary/30'
            )}
          >
            <Checkbox checked={outputPsd} onCheckedChange={(c) => setOutputPsd(!!c)} />
            <div className="flex-1">
              <div className="flex items-center gap-1.5">
                <Layers3 className="h-4 w-4 text-secondary" />
                <span className="font-semibold text-sm">PSD</span>
              </div>
              <div className="text-xs text-muted-foreground">レイヤー分離・デザイナー渡し用</div>
            </div>
          </label>
        </div>
      </div>

      {/* 実行ボタン */}
      <Button
        onClick={onGenerate}
        disabled={!canGenerate || isRunning}
        className="w-full h-12"
        size="lg"
        variant="brand"
      >
        {isRunning ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 生成中...
          </>
        ) : (
          <>
            <ImageIcon className="h-4 w-4 mr-2" /> バナー画像を生成 ({totalCount}枚)
          </>
        )}
      </Button>

      {/* 構成案ピッカーモーダル */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>過去の構成案から読み込み</DialogTitle>
            <DialogDescription>
              この案件で過去に生成された構成案からメイン/サブコピーを取り込みます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {pickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : pastJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みの構成案がありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {pastJobs.map((j) => {
                  const inputAxis = (j.input_data as any)?.appeal_axis as string | undefined;
                  const inputCopy = (j.input_data as any)?.copy_text as string | undefined;
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickComposition(j.scenes)}
                      disabled={j.scenes.length === 0}
                      className={cn(
                        'w-full text-left rounded-lg border bg-card p-3 transition-all',
                        j.scenes.length > 0
                          ? 'hover:border-secondary hover:shadow-sm cursor-pointer'
                          : 'opacity-50 cursor-not-allowed'
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{created}</span>
                        <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                          {j.scenes.length}シーン
                        </span>
                      </div>
                      {inputAxis && (
                        <div className="text-sm font-medium truncate">訴求軸: {inputAxis}</div>
                      )}
                      {inputCopy && (
                        <div className="text-xs text-muted-foreground truncate">
                          コピー: {inputCopy}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannerImageSettings;
