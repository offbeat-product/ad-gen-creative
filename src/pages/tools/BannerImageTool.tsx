import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  RefreshCw,
  ListChecks,
  Camera,
  Layers,
  Sparkles,
  X,
  Plus,
  Pencil,
  FileImage,
  Layers3,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSpotWizard } from '@/hooks/useSpotWizard';
import { useProjectContext } from '@/hooks/useProjectContext';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import SpotStepClient from '@/components/spot/SpotStepClient';
import SpotStepProduct from '@/components/spot/SpotStepProduct';
import SpotStepProject from '@/components/spot/SpotStepProject';
import SpotStepDataCollection from '@/components/spot/SpotStepDataCollection';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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

const STEPS = [
  { label: 'クライアント' },
  { label: '商材' },
  { label: '案件' },
  { label: 'データ収集' },
  { label: 'バナー設定' },
];

const STYLE_OPTIONS = [
  { value: 'photographic', label: '実写', icon: Camera, description: '写真のような表現' },
  { value: 'illustration', label: 'イラスト', icon: Sparkles, description: '手描き調・アート系' },
  { value: 'motion_graphics', label: 'モーショングラフィックス', icon: Layers, description: 'フラットデザイン' },
] as const;

interface BannerSize {
  width: number;
  height: number;
  label: string;
  description?: string;
}

const PRESET_SIZES: BannerSize[] = [
  { width: 1080, height: 1080, label: '1080×1080', description: 'Instagram/FB Feed' },
  { width: 1200, height: 628, label: '1200×628', description: 'Twitter/FB Feed' },
  { width: 1080, height: 1920, label: '1080×1920', description: 'Stories/Reels/TikTok' },
  { width: 1200, height: 1200, label: '1200×1200', description: 'LinkedIn' },
  { width: 728, height: 90, label: '728×90', description: 'Leaderboard' },
  { width: 300, height: 250, label: '300×250', description: 'MPU' },
  { width: 336, height: 280, label: '336×280', description: 'Large Rectangle' },
];

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-banner-image';

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface BannerAsset {
  id: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    width?: number;
    height?: number;
    size_label?: string;
    variation_index?: number;
    png_url?: string;
    psd_url?: string;
  } | null;
}

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

const sizeKey = (s: BannerSize) => `${s.width}x${s.height}`;

const BannerImageTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [mainCopy, setMainCopy] = useState('');
  const [subCopy, setSubCopy] = useState('');
  const [ctaText, setCtaText] = useState('');
  const [appealPoint, setAppealPoint] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [creativeStyle, setCreativeStyle] = useState<string>('photographic');

  const [selectedSizes, setSelectedSizes] = useState<BannerSize[]>([
    PRESET_SIZES[0],
    PRESET_SIZES[1],
  ]);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');

  const [variationsPerSize, setVariationsPerSize] = useState<number>(3);
  const [burnText, setBurnText] = useState<boolean>(true);
  const [outputPng, setOutputPng] = useState<boolean>(true);
  const [outputPsd, setOutputPsd] = useState<boolean>(true);

  // 構成案ピッカー
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pastJobs, setPastJobs] = useState<Array<CompositionJobRow & { scenes: CompositionScene[] }>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // 画像拡大
  const [zoomedAsset, setZoomedAsset] = useState<BannerAsset | null>(null);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<BannerAsset[]>([]);

  const canProceed = (): boolean => {
    switch (currentStep) {
      case 0:
        return state.clientId !== null;
      case 1:
        return state.productId !== null;
      case 2:
        return state.projectId !== null;
      case 3:
        return true;
      case 4:
        return mainCopy.trim().length > 0 && selectedSizes.length > 0;
      default:
        return false;
    }
  };

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  }, []);

  const goToStep = useCallback(
    (step: number) => {
      if (step > currentStep) return;
      setDirection(step > currentStep ? 1 : -1);
      setCurrentStep(step);
    },
    [currentStep]
  );

  const bannerRules =
    context?.rules.filter((r) =>
      ['banner_draft', 'banner_design'].includes(r.process_type)
    ) ?? [];

  const isSizeSelected = (s: BannerSize) =>
    selectedSizes.some((x) => x.width === s.width && x.height === s.height);

  const toggleSize = (s: BannerSize) => {
    setSelectedSizes((prev) => {
      const exists = prev.some((x) => x.width === s.width && x.height === s.height);
      if (exists) return prev.filter((x) => !(x.width === s.width && x.height === s.height));
      return [...prev, s];
    });
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
    setSelectedSizes((prev) => [...prev, newSize]);
    setCustomWidth('');
    setCustomHeight('');
  };

  const removeSize = (s: BannerSize) => {
    setSelectedSizes((prev) =>
      prev.filter((x) => !(x.width === s.width && x.height === s.height))
    );
  };

  // 過去の構成案ジョブを取得
  const loadPastCompositions = async () => {
    if (!state.projectId) return;
    setPickerLoading(true);
    try {
      const { data: jobs, error: jobsErr } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, input_data')
        .eq('project_id', state.projectId)
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

  const handleGenerate = async () => {
    if (!state.projectId || !user || !mainCopy.trim() || selectedSizes.length === 0) return;

    const insertPayload = {
      project_id: state.projectId,
      tool_type: 'banner_image',
      input_data: {
        main_copy: mainCopy,
        sub_copy: subCopy,
        cta_text: ctaText,
        appeal_point: appealPoint,
        target_audience: targetAudience,
        creative_style: creativeStyle,
        sizes: selectedSizes,
        variations_per_size: variationsPerSize,
        burn_text: burnText,
        output_png: outputPng,
        output_psd: outputPsd,
      },
      status: 'pending',
      created_by: user.id,
    } as any;

    const { data: newJob, error: jobError } = await supabase
      .from('gen_spot_jobs')
      .insert(insertPayload)
      .select()
      .single();

    if (jobError || !newJob) {
      toast.error(`生成開始に失敗: ${jobError?.message ?? 'unknown'}`);
      return;
    }

    setJobId(newJob.id);
    setJob(newJob as SpotJob);
    setAssets([]);

    fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        spot_job_id: newJob.id,
        project_id: state.projectId,
        main_copy: mainCopy,
        sub_copy: subCopy,
        cta_text: ctaText,
        appeal_point: appealPoint,
        target_audience: targetAudience,
        creative_style: creativeStyle,
        sizes: selectedSizes,
        variations_per_size: variationsPerSize,
        burn_text: burnText,
        output_png: outputPng,
        output_psd: outputPsd,
        copyright_text: context?.project.copyright_text ?? null,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
        rules: bannerRules.map((r) => ({
          id: r.id,
          description: r.description,
          severity: r.severity,
          process_type: r.process_type,
        })),
        correction_patterns: context?.corrections ?? [],

        // 🆕 Ad Brain Context(階層統合: クライアント/商材/案件)
        ad_brain_rules: (context?.rules ?? []).map((r) => ({
          id: r.id,
          title: r.title,
          description: r.description,
          category: r.category,
          severity: r.severity,
          process_type: r.process_type,
        })),
        ad_brain_materials: (context?.materials ?? [])
          .filter((m) => m.content_text && m.content_text.length > 0)
          .map((m) => ({
            id: m.id,
            title: m.title,
            material_type: m.material_type,
            scope_type: m.scope_type,
            content_text: m.content_text,
          })),
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success(`${totalCount}枚のバナー生成を開始しました`);
  };

  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .eq('asset_type', 'banner')
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as BannerAsset[]);
    };

    refetch();

    const channel = supabase
      .channel(`spot-job-${jobId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'gen_spot_jobs', filter: `id=eq.${jobId}` },
        refetch
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'gen_spot_assets', filter: `job_id=eq.${jobId}` },
        refetch
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [jobId]);

  const isRunning = job?.status === 'pending' || job?.status === 'running';

  // サイズごとにグループ化
  const assetsBySize = assets.reduce<Record<string, BannerAsset[]>>((acc, a) => {
    const w = a.metadata?.width;
    const h = a.metadata?.height;
    const key = w && h ? `${w}x${h}` : a.metadata?.size_label ?? 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(a);
    return acc;
  }, {});

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">🖼️ バナー画像生成</h1>
        <p className="text-sm text-muted-foreground">
          複数サイズ × 複数バリエーションのバナー画像を一括生成します
        </p>
      </div>

      {/* ステップインジケータ */}
      <div className="hidden md:flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={i} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => goToStep(i)}
                disabled={i > currentStep}
                className={cn(
                  'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-200',
                  i < currentStep && 'bg-secondary text-secondary-foreground cursor-pointer hover:opacity-80',
                  i === currentStep && 'bg-secondary text-secondary-foreground ring-4 ring-secondary-wash scale-110',
                  i > currentStep && 'bg-muted text-muted-foreground cursor-not-allowed'
                )}
              >
                {i < currentStep ? <Check className="h-4 w-4" /> : i + 1}
              </button>
              <span
                className={cn(
                  'text-xs whitespace-nowrap',
                  i === currentStep ? 'text-foreground font-medium' : 'text-muted-foreground'
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className={cn(
                  'flex-1 h-px mx-2 -mt-6',
                  i < currentStep ? 'bg-secondary' : 'bg-border'
                )}
              />
            )}
          </div>
        ))}
      </div>

      <div className="md:hidden flex items-center justify-between p-3 bg-muted rounded-lg">
        <span className="text-xs text-muted-foreground">
          ステップ {currentStep + 1}/{STEPS.length}
        </span>
        <span className="text-sm font-medium">{STEPS[currentStep].label}</span>
      </div>

      {/* ステップコンテンツ */}
      <AnimatePresence mode="wait" custom={direction}>
        <motion.div
          key={currentStep}
          custom={direction}
          initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
          transition={{ duration: 0.2 }}
        >
          {currentStep === 0 && <SpotStepClient state={state} updateState={updateState} />}
          {currentStep === 1 && (
            <SpotStepProduct state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 2 && (
            <SpotStepProject state={state} updateState={updateState} goToStep={goToStep} />
          )}
          {currentStep === 3 && <SpotStepDataCollection state={state} onComplete={goNext} />}
          {currentStep === 4 && (
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
                  {/* 追加済みカスタム一覧 */}
                  {selectedSizes.filter(
                    (s) => !PRESET_SIZES.some((p) => p.width === s.width && p.height === s.height)
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedSizes
                        .filter((s) => !PRESET_SIZES.some((p) => p.width === s.width && p.height === s.height))
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

                {/* 選択中サマリー */}
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
                onClick={handleGenerate}
                disabled={!canProceed() || isRunning || (!outputPng && !outputPsd)}
                className="w-full h-12"
                size="lg"
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

              {/* 生成結果 */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-sm">生成結果</h3>
                      {assets.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          合計 {assets.length} 枚生成完了
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {assets.length > 0 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => toast.info('一括ダウンロードは準備中です')}
                        >
                          <Download className="h-3.5 w-3.5 mr-1.5" />
                          全PNG一括DL
                        </Button>
                      )}
                      <span className="text-xs">
                        {job.status === 'pending' && (
                          <span className="text-muted-foreground">待機中...</span>
                        )}
                        {job.status === 'running' && <span className="text-warning">処理中...</span>}
                        {job.status === 'completed' && (
                          <span className="flex items-center gap-1 text-success">
                            <CheckCircle2 className="h-3 w-3" /> 完了
                          </span>
                        )}
                        {job.status === 'failed' && (
                          <span className="flex items-center gap-1 text-destructive">
                            <AlertCircle className="h-3 w-3" /> 失敗
                          </span>
                        )}
                      </span>
                    </div>
                  </div>

                  {isRunning && <Progress value={job.status === 'running' ? 60 : 20} />}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {/* サイズ別グループ表示 */}
                  {Object.keys(assetsBySize).length > 0 && (
                    <div className="space-y-6">
                      {Object.entries(assetsBySize).map(([sizeKey, sizeAssets]) => {
                        const first = sizeAssets[0];
                        const w = first.metadata?.width;
                        const h = first.metadata?.height;
                        const label = first.metadata?.size_label ?? `${w}×${h}`;
                        return (
                          <div key={sizeKey} className="space-y-3">
                            <div className="flex items-center gap-2 pb-1 border-b">
                              <span className="text-sm font-bold tabular-nums">{label}</span>
                              <span className="text-xs text-muted-foreground">
                                ({sizeAssets.length}枚)
                              </span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                              {sizeAssets.map((asset, idx) => {
                                const meta = asset.metadata ?? {};
                                const pngUrl = meta.png_url ?? asset.file_url;
                                const psdUrl = meta.psd_url;
                                return (
                                  <div
                                    key={asset.id}
                                    className="rounded-lg border bg-background overflow-hidden flex flex-col"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => setZoomedAsset(asset)}
                                      className="block w-full bg-muted relative group"
                                      style={{
                                        aspectRatio: w && h ? `${w} / ${h}` : '1 / 1',
                                      }}
                                    >
                                      <img
                                        src={pngUrl}
                                        alt={`バナー${idx + 1}`}
                                        className="w-full h-full object-contain transition-transform group-hover:scale-[1.02]"
                                        loading="lazy"
                                      />
                                      <div className="absolute top-1 left-1 bg-foreground/70 text-background text-[10px] px-1.5 py-0.5 rounded">
                                        バリ{idx + 1}
                                      </div>
                                    </button>
                                    <div className="p-2 flex items-center gap-1 border-t">
                                      <a
                                        href={pngUrl}
                                        download={asset.file_name ?? `banner-${label}-${idx + 1}.png`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                                      >
                                        <Download className="h-3 w-3 mr-0.5" /> PNG
                                      </a>
                                      {psdUrl ? (
                                        <a
                                          href={psdUrl}
                                          download={`banner-${label}-${idx + 1}.psd`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-background hover:bg-accent transition-colors"
                                        >
                                          <Download className="h-3 w-3 mr-0.5" /> PSD
                                        </a>
                                      ) : (
                                        <button
                                          disabled
                                          className="inline-flex items-center justify-center h-7 px-2 text-[11px] flex-1 rounded-md border border-input bg-muted text-muted-foreground cursor-not-allowed"
                                        >
                                          <Download className="h-3 w-3 mr-0.5" /> PSD
                                        </button>
                                      )}
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() =>
                                          console.log('[regenerate] banner asset:', asset.id)
                                        }
                                      >
                                        <RefreshCw className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        className="h-7 w-7 p-0"
                                        onClick={() =>
                                          console.log('[edit] banner asset:', asset.id)
                                        }
                                      >
                                        <Pencil className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* ナビゲーション */}
      {currentStep < 4 && (
        <div className="flex justify-end">
          <Button onClick={goNext} disabled={!canProceed()} size="lg">
            次へ <Check className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

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

      {/* 画像拡大モーダル */}
      <Dialog open={!!zoomedAsset} onOpenChange={(o) => !o && setZoomedAsset(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden">
          <button
            type="button"
            onClick={() => setZoomedAsset(null)}
            className="absolute top-2 right-2 z-10 h-8 w-8 rounded-full bg-foreground/70 text-background flex items-center justify-center hover:bg-foreground/90"
          >
            <X className="h-4 w-4" />
          </button>
          {zoomedAsset && (
            <div className="space-y-0">
              <img
                src={zoomedAsset.metadata?.png_url ?? zoomedAsset.file_url}
                alt="バナー拡大"
                className="w-full max-h-[75vh] object-contain bg-muted"
              />
              <div className="p-4 space-y-1.5 text-sm border-t">
                <div className="font-semibold">
                  {zoomedAsset.metadata?.size_label ??
                    `${zoomedAsset.metadata?.width}×${zoomedAsset.metadata?.height}`}
                </div>
                {zoomedAsset.metadata?.variation_index != null && (
                  <div className="text-xs text-muted-foreground">
                    バリエーション {zoomedAsset.metadata.variation_index + 1}
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BannerImageTool;
