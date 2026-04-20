import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Check,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  ListChecks,
  X,
  Plus,
  Upload,
  Video as VideoIcon,
  Maximize2,
  Square,
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
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
  { label: 'リサイズ設定' },
];

interface VideoFormat {
  width: number;
  height: number;
  label: string;
  description?: string;
}

const PRESET_FORMATS: VideoFormat[] = [
  { width: 1080, height: 1920, label: '9:16', description: '1080×1920 / TikTok・Reels・Stories' },
  { width: 1920, height: 1080, label: '16:9', description: '1920×1080 / YouTube' },
  { width: 1080, height: 1080, label: '1:1', description: '1080×1080 / Instagram Feed' },
  { width: 1080, height: 1350, label: '4:5', description: '1080×1350 / Instagram縦Feed' },
  { width: 1080, height: 1440, label: '3:4', description: '1080×1440' },
];

const N8N_WEBHOOK_URL = 'https://offbeat-inc.app.n8n.cloud/webhook/adgen-spot-video-resize';

const MAX_UPLOAD_MB = 500;

interface SpotJob {
  id: string;
  status: string | null;
  error_message: string | null;
}

interface ResizedAsset {
  id: string;
  asset_type: string;
  file_url: string;
  file_name: string | null;
  sort_order: number | null;
  metadata: {
    width?: number;
    height?: number;
    label?: string;
    aspect?: string;
  } | null;
}

interface CarouselJobRow {
  id: string;
  created_at: string | null;
  output_file_url: string | null;
  input_data: Record<string, unknown> | null;
}

const formatKey = (f: VideoFormat) => `${f.width}x${f.height}`;

const VideoResizeTool = () => {
  const { user } = useAuth();
  const { state, updateState } = useSpotWizard();
  const { context } = useProjectContext(state.projectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState(1);

  // Step 5 入力
  const [sourceVideoUrl, setSourceVideoUrl] = useState<string>('');
  const [sourceVideoName, setSourceVideoName] = useState<string>('');
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFormats, setSelectedFormats] = useState<VideoFormat[]>([
    PRESET_FORMATS[0],
    PRESET_FORMATS[1],
    PRESET_FORMATS[2],
  ]);
  const [customWidth, setCustomWidth] = useState<string>('');
  const [customHeight, setCustomHeight] = useState<string>('');

  const [resizeMode, setResizeMode] = useState<'fill' | 'fit'>('fill');
  const [bgColor, setBgColor] = useState<string>('#000000');

  // 元動画ピッカー
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pastJobs, setPastJobs] = useState<CarouselJobRow[]>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // 実行・進捗
  const [jobId, setJobId] = useState<string | null>(null);
  const [job, setJob] = useState<SpotJob | null>(null);
  const [assets, setAssets] = useState<ResizedAsset[]>([]);

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
        return sourceVideoUrl.trim().length > 0 && selectedFormats.length > 0;
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

  const isFormatSelected = (f: VideoFormat) =>
    selectedFormats.some((x) => x.width === f.width && x.height === f.height);

  const toggleFormat = (f: VideoFormat) => {
    setSelectedFormats((prev) => {
      const exists = prev.some((x) => x.width === f.width && x.height === f.height);
      if (exists) return prev.filter((x) => !(x.width === f.width && x.height === f.height));
      return [...prev, f];
    });
  };

  const addCustomFormat = () => {
    const w = parseInt(customWidth, 10);
    const h = parseInt(customHeight, 10);
    if (!w || !h || w < 100 || h < 100 || w > 4096 || h > 4096) {
      toast.error('幅と高さは100〜4096pxの範囲で入力してください');
      return;
    }
    const newFormat: VideoFormat = { width: w, height: h, label: `${w}×${h}` };
    if (isFormatSelected(newFormat)) {
      toast.error('同じサイズが既に選択されています');
      return;
    }
    setSelectedFormats((prev) => [...prev, newFormat]);
    setCustomWidth('');
    setCustomHeight('');
  };

  const removeFormat = (f: VideoFormat) => {
    setSelectedFormats((prev) =>
      prev.filter((x) => !(x.width === f.width && x.height === f.height))
    );
  };

  // 過去のカルーセル動画ジョブを取得
  const loadPastCarouselVideos = async () => {
    if (!state.projectId) return;
    setPickerLoading(true);
    try {
      const { data: jobs, error } = await supabase
        .from('gen_spot_jobs')
        .select('id, created_at, output_file_url, input_data')
        .eq('project_id', state.projectId)
        .eq('tool_type', 'carousel_video')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) {
        toast.error('過去の動画の取得に失敗しました');
        return;
      }

      // output_file_url が無いものは gen_spot_assets から拾う
      const jobsList = (jobs ?? []) as CarouselJobRow[];
      const missingIds = jobsList.filter((j) => !j.output_file_url).map((j) => j.id);
      if (missingIds.length > 0) {
        const { data: assetRows } = await supabase
          .from('gen_spot_assets')
          .select('job_id, file_url')
          .in('job_id', missingIds)
          .eq('asset_type', 'carousel_video');
        const urlByJob = new Map<string, string>();
        (assetRows ?? []).forEach((r: any) => {
          if (r.file_url && !urlByJob.has(r.job_id)) urlByJob.set(r.job_id, r.file_url);
        });
        jobsList.forEach((j) => {
          if (!j.output_file_url && urlByJob.has(j.id)) {
            j.output_file_url = urlByJob.get(j.id)!;
          }
        });
      }

      setPastJobs(jobsList.filter((j) => !!j.output_file_url));
    } finally {
      setPickerLoading(false);
    }
  };

  const handlePickCarouselVideo = (j: CarouselJobRow) => {
    if (!j.output_file_url) return;
    setSourceVideoUrl(j.output_file_url);
    const created = j.created_at
      ? new Date(j.created_at).toLocaleDateString('ja-JP')
      : '';
    setSourceVideoName(`カルーセル動画 (${created})`);
    setPickerOpen(false);
    toast.success('動画を読み込みました');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error(`ファイルサイズが${MAX_UPLOAD_MB}MBを超えています`);
      return;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext || !['mp4', 'mov', 'm4v'].includes(ext)) {
      toast.error('mp4 または mov 形式の動画をアップロードしてください');
      return;
    }
    if (!user) {
      toast.error('ログインが必要です');
      return;
    }

    setUploadingVideo(true);
    try {
      const path = `video-resize/${user.id}/source_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('videos')
        .upload(path, file, { upsert: true, contentType: file.type });

      if (upErr) {
        toast.error(`アップロード失敗: ${upErr.message}`);
        return;
      }
      const { data } = supabase.storage.from('videos').getPublicUrl(path);
      setSourceVideoUrl(data.publicUrl);
      setSourceVideoName(file.name);
      toast.success('動画をアップロードしました');
    } finally {
      setUploadingVideo(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearSourceVideo = () => {
    setSourceVideoUrl('');
    setSourceVideoName('');
  };

  const handleGenerate = async () => {
    if (!state.projectId || !user || !sourceVideoUrl || selectedFormats.length === 0) return;

    const insertPayload = {
      project_id: state.projectId,
      tool_type: 'video_resize',
      input_data: {
        source_video_url: sourceVideoUrl,
        source_video_name: sourceVideoName,
        target_formats: selectedFormats,
        resize_mode: resizeMode,
        bg_color: bgColor,
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
        source_video_url: sourceVideoUrl,
        target_formats: selectedFormats,
        resize_mode: resizeMode,
        bg_color: bgColor,
        client_name: context?.project.product.client.name ?? null,
        product_name: context?.project.product.name ?? null,
        project_name: context?.project.name ?? null,
      }),
    }).catch((e) => console.error('n8n webhook error:', e));

    toast.success(`${selectedFormats.length}サイズのリサイズを開始しました`);
  };

  // Realtime 購読
  useEffect(() => {
    if (!jobId) return;

    const refetch = async () => {
      const [jobRes, assetsRes] = await Promise.all([
        supabase.from('gen_spot_jobs').select('*').eq('id', jobId).single(),
        supabase
          .from('gen_spot_assets')
          .select('*')
          .eq('job_id', jobId)
          .in('asset_type', ['resized_video', 'resized_video_pending'])
          .order('sort_order'),
      ]);
      if (jobRes.data) setJob(jobRes.data as SpotJob);
      if (assetsRes.data) setAssets(assetsRes.data as unknown as ResizedAsset[]);
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

  // 完了アセット (resized_video) と pending を分離
  const completedAssets = assets.filter((a) => a.asset_type === 'resized_video');
  const pendingAssets = assets.filter((a) => a.asset_type === 'resized_video_pending');

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      {/* ヘッダー */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold font-display">📐 動画リサイズ</h1>
        <p className="text-sm text-muted-foreground">
          1つの元動画から、SNS別の複数アスペクト比へ一括リサイズします
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
              <h2 className="text-xl font-bold font-display tracking-tight">動画リサイズを設定</h2>

              {/* 元動画 */}
              <div className="space-y-3">
                <Label>元動画</Label>
                {!sourceVideoUrl ? (
                  <div className="rounded-xl border-2 border-dashed bg-card p-6 space-y-3">
                    <div className="flex flex-col items-center gap-3 text-center">
                      <VideoIcon className="h-8 w-8 text-muted-foreground" />
                      <div className="space-y-1">
                        <div className="text-sm font-medium">リサイズ元の動画を選択</div>
                        <div className="text-xs text-muted-foreground">
                          mp4/mov、最大 {MAX_UPLOAD_MB}MB
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center justify-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setPickerOpen(true);
                            loadPastCarouselVideos();
                          }}
                        >
                          <ListChecks className="h-3.5 w-3.5 mr-1.5" />
                          カルーセル動画から読み込み
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                          disabled={uploadingVideo}
                        >
                          {uploadingVideo ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                              アップロード中
                            </>
                          ) : (
                            <>
                              <Upload className="h-3.5 w-3.5 mr-1.5" />
                              動画をアップロード
                            </>
                          )}
                        </Button>
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept="video/mp4,video/quicktime,.mp4,.mov,.m4v"
                          className="hidden"
                          onChange={handleFileUpload}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border bg-card p-3 space-y-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-medium truncate">
                          {sourceVideoName || '元動画'}
                        </div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {sourceVideoUrl}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={clearSourceVideo}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <video
                      src={sourceVideoUrl}
                      controls
                      className="w-full max-h-[280px] rounded bg-muted"
                    />
                  </div>
                )}
              </div>

              {/* 出力フォーマット */}
              <div className="space-y-3">
                <Label>出力フォーマット (複数選択可)</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {PRESET_FORMATS.map((f) => {
                    const checked = isFormatSelected(f);
                    return (
                      <label
                        key={formatKey(f)}
                        className={cn(
                          'flex items-start gap-2.5 rounded-lg border bg-card p-3 cursor-pointer transition-all hover:border-secondary/50',
                          checked && 'border-secondary ring-2 ring-secondary/30 bg-secondary-wash/30'
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleFormat(f)}
                          className="mt-0.5"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-semibold tabular-nums">{f.label}</div>
                          {f.description && (
                            <div className="text-[11px] text-muted-foreground">{f.description}</div>
                          )}
                        </div>
                      </label>
                    );
                  })}
                </div>

                {/* カスタム追加 */}
                <div className="rounded-lg border bg-card p-3 space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground">
                    カスタムサイズを追加
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
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
                      onClick={addCustomFormat}
                      disabled={!customWidth || !customHeight}
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      追加
                    </Button>
                  </div>
                  {selectedFormats.filter(
                    (f) => !PRESET_FORMATS.some((p) => p.width === f.width && p.height === f.height)
                  ).length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {selectedFormats
                        .filter(
                          (f) => !PRESET_FORMATS.some((p) => p.width === f.width && p.height === f.height)
                        )
                        .map((f) => (
                          <span
                            key={formatKey(f)}
                            className="inline-flex items-center gap-1 text-xs bg-secondary-wash text-secondary px-2 py-0.5 rounded-full"
                          >
                            {f.label}
                            <button
                              type="button"
                              onClick={() => removeFormat(f)}
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
                  {selectedFormats.length > 0 ? (
                    <>
                      <span className="text-foreground font-medium">
                        {selectedFormats.map((f) => f.label).join(', ')}
                      </span>{' '}
                      (合計{selectedFormats.length}サイズ)
                    </>
                  ) : (
                    <span className="text-destructive">サイズを1つ以上選択してください</span>
                  )}
                </div>
              </div>

              {/* リサイズ方式 */}
              <div className="space-y-3">
                <Label>リサイズ方式</Label>
                <RadioGroup
                  value={resizeMode}
                  onValueChange={(v) => setResizeMode(v as 'fill' | 'fit')}
                  className="grid grid-cols-1 md:grid-cols-2 gap-3"
                >
                  <Label
                    htmlFor="mode-fill"
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                      resizeMode === 'fill' && 'border-secondary ring-2 ring-secondary/30'
                    )}
                  >
                    <RadioGroupItem value="fill" id="mode-fill" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Maximize2 className="h-4 w-4 text-secondary" />
                        <span className="font-semibold text-sm">中央トリミング (fill)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        画面全面・被写体が中央に配置されている動画向け
                      </div>
                    </div>
                  </Label>
                  <Label
                    htmlFor="mode-fit"
                    className={cn(
                      'flex items-start gap-2.5 rounded-xl border bg-card p-4 cursor-pointer transition-all hover:border-secondary/50',
                      resizeMode === 'fit' && 'border-secondary ring-2 ring-secondary/30'
                    )}
                  >
                    <RadioGroupItem value="fit" id="mode-fit" />
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5">
                        <Square className="h-4 w-4 text-secondary" />
                        <span className="font-semibold text-sm">レターボックス (fit)</span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        余白で埋めて全体が見えるように配置
                      </div>
                    </div>
                  </Label>
                </RadioGroup>

                {resizeMode === 'fit' && (
                  <div className="rounded-lg border bg-card p-3 flex items-center gap-3">
                    <Label htmlFor="bg-color" className="text-sm">
                      余白の色
                    </Label>
                    <Input
                      id="bg-color"
                      type="color"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-16 h-9 p-1 cursor-pointer"
                    />
                    <Input
                      type="text"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                      className="w-28 font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              {/* 実行ボタン */}
              <Button
                onClick={handleGenerate}
                disabled={!canProceed() || isRunning}
                className="w-full h-12"
                size="lg"
              >
                {isRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> リサイズ中...
                  </>
                ) : (
                  <>
                    <VideoIcon className="h-4 w-4 mr-2" /> 動画をリサイズ ({selectedFormats.length}
                    サイズ)
                  </>
                )}
              </Button>

              {/* 生成結果 */}
              {jobId && job && (
                <div className="rounded-xl border bg-card p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <h3 className="font-semibold text-sm">リサイズ結果</h3>
                      {completedAssets.length > 0 && (
                        <div className="text-xs text-muted-foreground">
                          {completedAssets.length} / {selectedFormats.length} サイズ完了
                        </div>
                      )}
                    </div>
                    <span className="text-xs">
                      {job.status === 'pending' && (
                        <span className="text-muted-foreground">待機中...</span>
                      )}
                      {job.status === 'running' && (
                        <span className="text-warning">処理中... (各サイズ1〜3分)</span>
                      )}
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

                  {isRunning && (
                    <div className="space-y-2">
                      <Progress
                        value={
                          selectedFormats.length > 0
                            ? Math.round(
                                (completedAssets.length / selectedFormats.length) * 100
                              )
                            : job.status === 'running'
                            ? 30
                            : 10
                        }
                      />
                      <div className="text-[11px] text-muted-foreground">
                        全体で2〜5分ほどかかります
                      </div>
                    </div>
                  )}

                  {job.status === 'failed' && job.error_message && (
                    <div className="text-xs text-destructive bg-destructive/10 p-3 rounded">
                      {job.error_message}
                    </div>
                  )}

                  {/* 完了アセット */}
                  {completedAssets.length > 0 && (
                    <div className="space-y-6">
                      {completedAssets.map((asset) => {
                        const meta = asset.metadata ?? {};
                        const w = meta.width;
                        const h = meta.height;
                        const label =
                          meta.label ?? meta.aspect ?? (w && h ? `${w}×${h}` : '不明');
                        const sizeText = w && h ? `${w}×${h}` : '';
                        return (
                          <div key={asset.id} className="space-y-2">
                            <div className="flex items-center gap-2 pb-1 border-b">
                              <span className="text-sm font-bold">{label}</span>
                              {sizeText && (
                                <span className="text-xs text-muted-foreground tabular-nums">
                                  {sizeText}
                                </span>
                              )}
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-3 items-start">
                              <video
                                src={asset.file_url}
                                controls
                                className="w-full rounded-lg bg-muted"
                                style={{
                                  aspectRatio: w && h ? `${w} / ${h}` : '16 / 9',
                                  maxHeight: '420px',
                                }}
                              />
                              <div className="space-y-2">
                                <a
                                  href={asset.file_url}
                                  download={asset.file_name ?? `resized-${label}.mp4`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center justify-center h-9 px-3 text-sm rounded-md border border-input bg-background hover:bg-accent transition-colors"
                                >
                                  <Download className="h-3.5 w-3.5 mr-1.5" /> 動画をダウンロード
                                </a>
                                <div className="text-[11px] text-muted-foreground break-all">
                                  {asset.file_url}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* 生成中のフォーマット */}
                  {pendingAssets.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">
                        生成中のフォーマット
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {pendingAssets.map((a) => (
                          <div
                            key={a.id}
                            className="rounded-md border bg-muted/30 p-3 flex items-center gap-2"
                          >
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs">
                              {a.metadata?.label ?? `${a.metadata?.width}×${a.metadata?.height}`}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 何も無い時の placeholder */}
                  {completedAssets.length === 0 &&
                    pendingAssets.length === 0 &&
                    isRunning && (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {selectedFormats.map((f) => (
                          <div
                            key={formatKey(f)}
                            className="rounded-md border bg-muted/30 p-3 flex items-center gap-2"
                          >
                            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                            <span className="text-xs">{f.label}</span>
                          </div>
                        ))}
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

      {/* カルーセル動画ピッカー */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>カルーセル動画から読み込み</DialogTitle>
            <DialogDescription>
              この案件で過去に生成されたカルーセル動画をリサイズ元として読み込みます
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] -mx-6 px-6">
            {pickerLoading ? (
              <div className="py-12 flex items-center justify-center text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 読み込み中...
              </div>
            ) : pastJobs.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground">
                完了済みのカルーセル動画がありません
              </div>
            ) : (
              <div className="space-y-2 py-2">
                {pastJobs.map((j) => {
                  const created = j.created_at
                    ? new Date(j.created_at).toLocaleString('ja-JP', {
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '';
                  const aspect = (j.input_data as any)?.aspect_ratio as string | undefined;
                  return (
                    <button
                      key={j.id}
                      type="button"
                      onClick={() => handlePickCarouselVideo(j)}
                      className="w-full text-left rounded-lg border bg-card p-3 hover:border-secondary hover:shadow-sm transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-muted-foreground">{created}</span>
                        {aspect && (
                          <span className="text-[10px] bg-secondary-wash text-secondary px-1.5 py-0.5 rounded">
                            {aspect}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {j.output_file_url}
                      </div>
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

export default VideoResizeTool;
